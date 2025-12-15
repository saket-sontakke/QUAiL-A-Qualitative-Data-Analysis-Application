import { useState, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';

/**
 * Annotation management hook.
 * Refactored for Optimistic UI and Atomic Updates.
 * FIXED: Immediate Global Sync for Optimistic UI protection.
 */
export const useAnnotationManager = ({
  projectId,
  user,
  selectedFileId,
  selectedFileName,
  project,
  setProject,
  setError,
  setConfirmModalData,
  setShowConfirmModal,
  memos,
  setMemos,
  inlineHighlights,
  setInlineHighlights,
  selectedHighlightColor,
  setShowMemoModal,
  setShowFloatingMemoInput,
  setActiveMemoId,
  executeAction,
  syncGlobalProjectState,
}) => {
  const cancelledOps = useRef(new Set());
  const [currentMemoSelectionInfo, setCurrentMemoSelectionInfo] = useState(null);
  const [memoToEdit, setMemoToEdit] = useState(null);

  const groupedMemos = useMemo(() => {
    return memos.map(memo => ({
      ...memo,
      displayTitle: memo.title || (memo.text ? `Memo on "${memo.text.substring(0, 30)}..."` : 'Document Memo'),
      isSegmentMemo: memo.startIndex !== -1 && memo.endIndex !== -1,
    })).sort((a, b) => a.startIndex - b.startIndex);
  }, [memos]);

  const handleCreateMemoForSegment = useCallback((segment) => {
    if (!segment || !selectedFileId) return;
    setCurrentMemoSelectionInfo({
      text: segment.text,
      startIndex: segment.startIndex,
      endIndex: segment.endIndex,
    });
    setMemoToEdit(null);
    setShowMemoModal(true);
  }, [selectedFileId, setShowMemoModal]);

  const handleSaveMemo = async ({ title, content, _id }) => {
    const token = user?.token;
    if (!token) return;
    const isEditing = !!_id;
    
    const originalMemo = isEditing ? memos.find(m => m._id === _id) : null;
    const tempId = isEditing ? _id : `temp-${Date.now()}`;
    
    const memoData = {
      title,
      content,
      fileId: selectedFileId,
      fileName: selectedFileName,
      text: isEditing ? originalMemo.text : (currentMemoSelectionInfo ? currentMemoSelectionInfo.text : ''),
      startIndex: isEditing ? originalMemo.startIndex : (currentMemoSelectionInfo ? currentMemoSelectionInfo.startIndex : -1),
      endIndex: isEditing ? originalMemo.endIndex : (currentMemoSelectionInfo ? currentMemoSelectionInfo.endIndex : -1),
    };

    const optimisticMemo = {
        ...memoData,
        _id: tempId,
        author: user?.name || 'You',
        authorId: user?._id,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    setShowMemoModal(false);
    setShowFloatingMemoInput(false);
    setMemoToEdit(null);
    window.getSelection().removeAllRanges();

    const saveAction = {
      execute: async () => {
        // 1. Optimistic Local
        if (isEditing) {
            setMemos(prev => prev.map(m => m._id === _id ? { ...m, ...memoData, updatedAt: new Date() } : m));
            // Sync Update Immediately
            syncGlobalProjectState('memos', 'update', { ...originalMemo, ...memoData, updatedAt: new Date() });
        } else {
            setMemos(prev => [...prev, optimisticMemo]);
            // Sync Add Immediately
            syncGlobalProjectState('memos', 'add', optimisticMemo);
        }

        try {
          const method = isEditing ? 'put' : 'post';
          const url = isEditing ?
            `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/memos/${_id}` :
            `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/memos`;
            
          const res = await axios[method](url, memoData, { headers: { Authorization: `Bearer ${token}` } });
          
          if (!isEditing) {
              const realMemo = res.data.newMemo;

              if (cancelledOps.current.has(tempId)) {
                  // Cleanup: Delete the REAL ID from the server
                  await axios.delete(
                    `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/memos/${realMemo._id}`, 
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
                  // Clear ref
                  cancelledOps.current.delete(tempId);
                  // Abort
                  return { success: true, aborted: true };
              }

              // Swap Local
              setMemos(prev => prev.map(m => m._id === tempId ? realMemo : m));
              // Swap Global
              syncGlobalProjectState('memos', 'delete', tempId);
              syncGlobalProjectState('memos', 'add', realMemo);

              return { success: true, newMemo: realMemo, wasEditing: false, tempId };
          } else {
              const updatedMemo = res.data.updatedMemo;
              // Update Local
              setMemos(prev => prev.map(m => m._id === _id ? updatedMemo : m));
              // Update Global
              syncGlobalProjectState('memos', 'update', updatedMemo);

              return { success: true, newMemo: updatedMemo, wasEditing: true };
          }
        } catch (error) {
          if (isEditing) {
              setMemos(prev => prev.map(m => m._id === _id ? originalMemo : m));
              syncGlobalProjectState('memos', 'update', originalMemo);
          } else {
              setMemos(prev => prev.filter(m => m._id !== tempId));
              syncGlobalProjectState('memos', 'delete', tempId);
          }
          return { success: false, error };
        }
      },
      undo: {
        execute: async (context) => {
          if (context.wasEditing) {
            setMemos(prev => prev.map(m => m._id === _id ? originalMemo : m));
            syncGlobalProjectState('memos', 'update', originalMemo);

            try {
              await axios.put(
                `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/memos/${_id}`, 
                originalMemo, 
                { headers: { Authorization: `Bearer ${token}` } }
              );
              return { success: true };
            } catch (error) { return { success: false, error }; }
          } else {
            const memoIdToDelete = context.newMemo._id;
            setMemos(prev => prev.filter(m => m._id !== memoIdToDelete));
            syncGlobalProjectState('memos', 'delete', memoIdToDelete);

            try {
              await axios.delete(
                `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/memos/${memoIdToDelete}`, 
                { headers: { Authorization: `Bearer ${token}` } }
              );
              return { success: true };
            } catch (error) { return { success: false, error }; }
          }
        }
      }
    };
    
    const result = await executeAction(saveAction);
    if (!result.success) setError(result.error?.response?.data?.error || 'Failed to save memo.');
  };

  const handleDeleteMemo = (memoId) => {
    const performDelete = async () => {

      if (memoId.startsWith('temp-')) {
          cancelledOps.current.add(memoId);
          setMemos(prev => prev.filter(m => m._id !== memoId));
          syncGlobalProjectState('memos', 'delete', memoId);
          setShowConfirmModal(false);
          return;
      }

      const token = user?.token;
      if (!token) return;
      const memoToDelete = memos.find(m => m._id === memoId);
      if (!memoToDelete) return;

      setActiveMemoId(null);
      setShowConfirmModal(false);

      const deleteAction = {
        execute: async (context) => {
          const idToDelete = context?.newId || memoId;

          // 1. Optimistic Local
          setMemos(prev => prev.filter(m => m._id !== idToDelete));
          // 2. Optimistic Global (Immediate)
          syncGlobalProjectState('memos', 'delete', idToDelete);
          
          try {
            await axios.delete(
              `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/memos/${idToDelete}`, 
              { headers: { Authorization: `Bearer ${token}` } }
            );
            return { success: true, memo: memoToDelete };
          } catch (error) {
            setMemos(prev => [...prev, memoToDelete]);
            syncGlobalProjectState('memos', 'add', memoToDelete);
            return { success: false, error };
          }
        },
        undo: {
          execute: async (context) => {
            const restoredMemo = context.memo;
            setMemos(prev => [...prev, restoredMemo]);
            syncGlobalProjectState('memos', 'add', restoredMemo);

            try {
              const res = await axios.post(
                `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/memos`, 
                restoredMemo, 
                { headers: { Authorization: `Bearer ${token}` } }
              );
              const newId = res.data.newMemo._id;
              
              setMemos(prev => prev.map(m => m._id === restoredMemo._id ? { ...m, _id: newId } : m));
              
              syncGlobalProjectState('memos', 'delete', restoredMemo._id);
              syncGlobalProjectState('memos', 'add', res.data.newMemo);
              
              return { success: true, newId: newId };
            } catch (error) {
              setMemos(prev => prev.filter(m => m._id !== restoredMemo._id));
              syncGlobalProjectState('memos', 'delete', restoredMemo._id);
              return { success: false, error };
            }
          }
        }
      };
      await executeAction(deleteAction);
    };

    setConfirmModalData({
      title: 'Confirm Memo Deletion',
      shortMessage: `Are you sure you want to delete this memo?`,
      onConfirm: performDelete,
    });
    setShowConfirmModal(true);
  };

  const createHighlight = async (info) => {
    const token = user?.token;
    if (!token) return { success: false };

    const tempId = `temp-hl-${Date.now()}`;
    const optimisticHighlight = {
        _id: tempId,
        fileName: selectedFileName,
        fileId: selectedFileId,
        text: info.text,
        color: selectedHighlightColor,
        startIndex: info.startIndex,
        endIndex: info.endIndex
    };

    const createHighlightAction = {
      execute: async () => {
        // 1. Optimistic Local
        setInlineHighlights(prev => [...prev, optimisticHighlight]);
        // 2. Optimistic Global (Immediate)
        syncGlobalProjectState('inlineHighlights', 'add', optimisticHighlight);
        
        try {
          const data = { 
            fileName: selectedFileName, 
            fileId: selectedFileId, 
            text: info.text, 
            color: selectedHighlightColor, 
            startIndex: info.startIndex, 
            endIndex: info.endIndex 
          };
          
          const res = await axios.post(
            `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/highlight`, 
            data, 
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          const realHighlight = res.data.newHighlight;

          if (cancelledOps.current.has(tempId)) {
             await axios.delete(
                `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/highlight/${realHighlight._id}`, 
                { headers: { Authorization: `Bearer ${token}` } }
             );
             cancelledOps.current.delete(tempId);
             return { success: true, aborted: true };
          }
          
          // Swap Local
          setInlineHighlights(prev => prev.map(h => h._id === tempId ? realHighlight : h));
          // Swap Global
          syncGlobalProjectState('inlineHighlights', 'delete', tempId);
          syncGlobalProjectState('inlineHighlights', 'add', realHighlight);
          
          return { success: true, newHighlight: realHighlight };
        } catch (error) { 
          setInlineHighlights(prev => prev.filter(h => h._id !== tempId));
          syncGlobalProjectState('inlineHighlights', 'delete', tempId);
          return { success: false, error }; 
        }
      },
      undo: {
        execute: async (context) => {
          const idToDelete = context.newHighlight._id;
          setInlineHighlights(prev => prev.filter(h => h._id !== idToDelete));
          syncGlobalProjectState('inlineHighlights', 'delete', idToDelete);
          
          try {
            await axios.delete(
              `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/highlight/${idToDelete}`, 
              { headers: { Authorization: `Bearer ${token}` } }
            );
            return { success: true };
          } catch (error) { return { success: false, error }; }
        }
      }
    };
    return await executeAction(createHighlightAction);
  };

  const eraseHighlights = async (selectionInfo) => {
    if (!selectionInfo || !selectedFileId) return { success: false };
    const { startIndex, endIndex } = selectionInfo;
    
    const highlightsToDelete = inlineHighlights
      .filter(highlight => Math.max(startIndex, highlight.startIndex) < Math.min(endIndex, highlight.endIndex));
    
    if (highlightsToDelete.length === 0) return { success: true };

    const token = user?.token;
    if (!token) return { success: false };

    const eraseAction = {
      execute: async () => {
        const idsToDelete = highlightsToDelete.map(h => h._id);
        
        // 1. Separate Temp IDs from Real IDs
        const tempIds = idsToDelete.filter(id => id.startsWith('temp-'));
        const realIds = idsToDelete.filter(id => !id.startsWith('temp-'));

        // 2. Register Temp IDs as cancelled
        tempIds.forEach(id => cancelledOps.current.add(id));

        // 3. Optimistic Update (Remove ALL from UI)
        setInlineHighlights(prev => prev.filter(h => !idsToDelete.includes(h._id)));
        syncGlobalProjectState('inlineHighlights', 'delete-bulk', idsToDelete);
        
        // 4. Only call server if there are REAL IDs to delete
        try {
          await axios.post(
            `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/highlight/delete-bulk`, 
            { ids: realIds }, 
            { headers: { Authorization: `Bearer ${token}` } }
          );
          return { success: true, deletedHighlights: highlightsToDelete };
        } catch (error) { 
          setInlineHighlights(prev => [...prev, ...highlightsToDelete]);
          // Revert Global: force loop add
          highlightsToDelete.forEach(h => syncGlobalProjectState('inlineHighlights', 'add', h));
          return { success: false, error }; 
        }
      },
      undo: {
        execute: async (context) => {
            const restoredHighlights = context.deletedHighlights;
            const token = user?.token;

            setInlineHighlights(prev => [...prev, ...restoredHighlights]);
            // Optimistic Global Re-add
            restoredHighlights.forEach(h => syncGlobalProjectState('inlineHighlights', 'add', h));

            try {
                const restoreResponses = await Promise.all(restoredHighlights.map(h => 
                    axios.post(
                        `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/highlight`, 
                        { ...h }, 
                        { headers: { Authorization: `Bearer ${token}` } }
                    )
                ));

                const newHighlightsFromServer = restoreResponses.map(r => r.data.newHighlight);
                const oldIds = restoredHighlights.map(h => h._id);

                setInlineHighlights(prev => {
                    const filtered = prev.filter(h => !oldIds.includes(h._id));
                    return [...filtered, ...newHighlightsFromServer];
                });

                // Swap Global
                syncGlobalProjectState('inlineHighlights', 'delete-bulk', oldIds);
                newHighlightsFromServer.forEach(h => {
                    syncGlobalProjectState('inlineHighlights', 'add', h);
                });

                return { success: true };
            } catch (error) { 
                const idsToRemove = restoredHighlights.map(h => h._id);
                setInlineHighlights(prev => prev.filter(h => !idsToRemove.includes(h._id)));
                syncGlobalProjectState('inlineHighlights', 'delete-bulk', idsToRemove);
                return { success: false, error }; 
            }
        }
      }
    };
    return await executeAction(eraseAction);
  };

  // --- RESTORED FROM OLD CODE ---
  const handleExportMemos = async () => {
    if (!selectedFileId) return;
    try {
      const token = user?.token;
      if (!token) return;
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/files/${selectedFileId}/export-memos`, 
        { 
          headers: { Authorization: `Bearer ${token}` }, 
          responseType: 'blob' 
        }
      );
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const contentDisposition = response.headers['content-disposition'];
      let filename = 'memos.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch && filenameMatch.length > 1) {
          filename = filenameMatch[1];
        }
      } else {
        const selectedFile = project?.importedFiles.find(f => f._id === selectedFileId);
        filename = `${selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, "") : "Memos"}_memos.xlsx`;
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) { 
      console.error('Export memos failed:', err); 
      setConfirmModalData({
          title: 'Export Failed',
          shortMessage: err.response?.data?.error || 'Could not export memos for this file.',
          onConfirm: () => setShowConfirmModal(false),
      });
      setShowConfirmModal(true);
    }
  };

  return {
    currentMemoSelectionInfo,
    setCurrentMemoSelectionInfo,
    memoToEdit,
    setMemoToEdit,
    groupedMemos,
    handleCreateMemoForSegment,
    handleSaveMemo,
    handleDeleteMemo,
    handleExportMemos,
    createHighlight,
    eraseHighlights,
  };
};