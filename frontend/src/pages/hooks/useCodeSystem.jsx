import { useState, useMemo, useRef } from 'react';
import axios from 'axios';

/**
 * Code system management hook.
 * Refactored for Optimistic UI and Atomic Updates.
 * FIXED: Immediate Global Sync for Optimistic UI protection.
 */
export const useCodeSystem = ({
  projectId,
  user,
  selectedFileId,
  selectedFileName,
  project,
  setProject,
  setError,
  setConfirmModalData,
  setShowConfirmModal,
  codedSegments,
  setCodedSegments,
  setDefineModalBackendErrorRef,
  setShowDefineCodeModal,
  setCodeDefinitionToEdit,
  codeDefinitions = [],
  setCodeDefinitions,
  viewerRef,
  executeAction,
  syncGlobalProjectState,
}) => {
  const [segmentToReassign, setSegmentToReassign] = useState(null);
  const cancelledSegIds = useRef(new Set());

  const groupedCodedSegments = useMemo(() => {
    const groups = {};
    codedSegments.forEach(segment => {
      const codeName = segment.codeDefinition?.name || 'Uncategorized';
      const codeColor = segment.codeDefinition?.color || '#cccccc';
      if (!groups[codeName]) {
        groups[codeName] = { color: codeColor, segments: [] };
      }
      groups[codeName].segments.push(segment);
    });
    return Object.keys(groups).sort().map(codeName => ({
      name: codeName,
      color: groups[codeName].color,
      segments: groups[codeName].segments
    }));
  }, [codedSegments]);

  const getCodeDefById = (id) => (codeDefinitions || []).find(d => d._id === id);

  const handleAssignCode = async (newCodeId, currentSelectionInfo) => {
    const token = user?.token;
    if (!token) return;

    // 1. REASSIGN EXISTING SEGMENT
    if (segmentToReassign) {
      const segmentId = segmentToReassign._id;
      const originalCodeDef = segmentToReassign.codeDefinition;
      const newCodeDef = getCodeDefById(newCodeId);
      
      const optimisticUpdate = { ...segmentToReassign, codeDefinition: newCodeDef };

      const reassignAction = {
        execute: async () => {
          // 1. Optimistic Local
          setCodedSegments(prev => prev.map(seg => 
            seg._id === segmentId ? optimisticUpdate : seg
          ));
          
          // 2. Optimistic Global (Immediate)
          syncGlobalProjectState('codedSegments', 'update', optimisticUpdate);
          
          try {
            const res = await axios.put(
              `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/code/${segmentId}`, 
              { codeId: newCodeId }, 
              { headers: { Authorization: `Bearer ${token}` } }
            );
            
            // 3. Server Sync (If server returns changes)
            if (res.data.updatedSegment) {
                syncGlobalProjectState('codedSegments', 'update', res.data.updatedSegment);
            }

            return { success: true, segmentId, originalCodeDef, newCodeId };
          } catch (error) {
            // Revert Local
            setCodedSegments(prev => prev.map(seg => 
              seg._id === segmentId ? { ...seg, codeDefinition: originalCodeDef } : seg
            ));
            // Revert Global
            syncGlobalProjectState('codedSegments', 'update', { ...segmentToReassign, codeDefinition: originalCodeDef });
            
            return { success: false, error };
          }
        },
        undo: {
          execute: async (context) => {
            const revertedSegment = { ...segmentToReassign, codeDefinition: context.originalCodeDef };
            
            setCodedSegments(prev => prev.map(seg => 
              seg._id === context.segmentId ? revertedSegment : seg
            ));

            syncGlobalProjectState('codedSegments', 'update', revertedSegment);

            try {
              await axios.put(
                `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/code/${context.segmentId}`, 
                { codeId: context.originalCodeDef._id }, 
                { headers: { Authorization: `Bearer ${token}` } }
              );
              return { success: true };
            } catch (error) {
              return { success: false, error };
            }
          },
        },
      };

      await executeAction(reassignAction);
      setSegmentToReassign(null);

    } 
    // 2. CREATE NEW SEGMENT
    else {
      const codeDef = getCodeDefById(newCodeId);
      const tempId = `temp-${Date.now()}`;
      
      const optimisticSegment = {
        _id: tempId,
        text: currentSelectionInfo.text,
        startIndex: currentSelectionInfo.startIndex,
        endIndex: currentSelectionInfo.endIndex,
        fileId: selectedFileId,
        fileName: selectedFileName,
        codeDefinition: codeDef,
        isOptimistic: true
      };

      const createSegmentAction = {
        execute: async () => {
          // 1. Optimistic Local
          setCodedSegments(prev => {
            if (prev.find(s => s._id === tempId)) return prev;
            return [...prev, optimisticSegment];
          });

          // 2. Optimistic Global (Immediate)
          syncGlobalProjectState('codedSegments', 'add', optimisticSegment);

          const data = { 
            text: currentSelectionInfo.text,
            startIndex: currentSelectionInfo.startIndex,
            endIndex: currentSelectionInfo.endIndex,
            codeDefinitionId: newCodeId, 
            fileId: selectedFileId, 
            fileName: selectedFileName 
          };

          try {
            const res = await axios.post(
              `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/code`, 
              data, 
              { headers: { Authorization: `Bearer ${token}` } }
            );

            const realSegment = res.data.newSegment;

            if (cancelledSegIds.current.has(tempId)) {
               // The user deleted this while it was loading!
               
               // 1. Cleanup: Delete the REAL ID from the server
               await axios.delete(
                  `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/code/${realSegment._id}`, 
                  { headers: { Authorization: `Bearer ${token}` } }
               );

               // 2. Clear the ref
               cancelledSegIds.current.delete(tempId);

               // 3. ABORT. Do not update state.
               return { success: true, aborted: true }; 
            }
            
            // 3. Swap Temp ID for Real ID (Local)
            setCodedSegments(prev => prev.map(seg => 
              seg._id === tempId ? realSegment : seg
            ));

            // 4. Swap Temp ID for Real ID (Global)
            syncGlobalProjectState('codedSegments', 'delete', tempId);
            syncGlobalProjectState('codedSegments', 'add', realSegment);

            return { success: true, newSegmentId: realSegment._id, segmentData: data };
          } catch (error) {
            // Revert Local
            setCodedSegments(prev => prev.filter(seg => seg._id !== tempId));
            // Revert Global
            syncGlobalProjectState('codedSegments', 'delete', tempId);
            return { success: false, error };
          }
        },
        undo: {
          execute: async (context) => {
            setCodedSegments(prev => prev.filter(seg => seg._id !== context.newSegmentId));
            syncGlobalProjectState('codedSegments', 'delete', context.newSegmentId);

            try {
              await axios.delete(
                `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/code/${context.newSegmentId}`, 
                { headers: { Authorization: `Bearer ${token}` } }
              );
              return { success: true };
            } catch (error) {
              return { success: false, error };
            }
          },
        },
      };

      await executeAction(createSegmentAction);
    }
    
    window.getSelection().removeAllRanges();
  };

  const handleReassignCodeClick = (codedSegment, setFloatingAssignCodePosition, setShowFloatingAssignCode) => {
    const segmentElement = viewerRef.current.querySelector(`[data-code-segment-id="${codedSegment._id}"]`);
    if (segmentElement) {
      const rect = segmentElement.getBoundingClientRect();
      setFloatingAssignCodePosition({
        top: rect.bottom + window.scrollY + 5,
        left: rect.left + window.scrollX
      });
    }
    setSegmentToReassign(codedSegment);
    setShowFloatingAssignCode(true);
  };

  const handleSaveCodeDefinition = async ({ name, description, color, _id }) => {
    if (setDefineModalBackendErrorRef.current) setDefineModalBackendErrorRef.current('');
    const token = user?.token;
    if (!token) return;

    try {
      const method = _id ? 'put' : 'post';
      const url = _id ?
        `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/code-definitions/${_id}` :
        `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/code-definitions`;
      
      const res = await axios[method](
        url, 
        { name, description, color }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (_id) {
        const updatedDef = res.data.updatedCodeDefinition;
        setCodeDefinitions(prev => prev.map(def => def._id === _id ? updatedDef : def));
        
        // Update local segments
        setCodedSegments(prev => prev.map(seg => {
            if (seg.codeDefinition?._id === _id) return { ...seg, codeDefinition: updatedDef };
            return seg;
        }));
      } else {
        const newDef = res.data.newCodeDefinition;
        setCodeDefinitions(prev => [...prev, newDef]);
      }

      setShowDefineCodeModal(false);
      setCodeDefinitionToEdit(null);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to save code definition.';
      if (setDefineModalBackendErrorRef.current) {
        setDefineModalBackendErrorRef.current(errorMessage);
      } else {
        setError(errorMessage);
      }
    }
  };

  const handleMergeCodes = async ({ sourceCodeIds, newCodeName, newCodeColor }) => {
    const token = user?.token;
    if (!token) return { success: false, error: 'Authentication error.' };
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/codes/merge`, 
        { sourceCodeIds, newCodeName, newCodeColor }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProject(res.data.project);
      setCodeDefinitions(res.data.project.codeDefinitions || []);
      if (selectedFileId) {
        const updatedSegmentsForFile = res.data.project.codedSegments.filter(s => s.fileId === selectedFileId);
        setCodedSegments(updatedSegmentsForFile);
      }
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to merge codes.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const handleSplitCodes = async ({ sourceCodeId, newCodeDefinitions, assignments }) => {
    const token = user?.token;
    if (!token) return { success: false, error: 'Authentication error.' };
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/codes/split`, 
        { sourceCodeId, newCodeDefinitions, assignments }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProject(res.data.project);
      setCodeDefinitions(res.data.project.codeDefinitions || []);
      if (selectedFileId) {
        const updatedSegmentsForFile = res.data.project.codedSegments.filter(s => s.fileId === selectedFileId);
        setCodedSegments(updatedSegmentsForFile);
      }
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to finalize code split.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const handleDeleteCodeDefinition = (codeDefId) => {
    // Find all affected segment IDs globally (from the project object) to sync deletion
    const allSegmentsToDelete = (project?.codedSegments || []).filter(
      (seg) => seg.codeDefinition?._id === codeDefId
    );
    const allSegmentIds = allSegmentsToDelete.map(s => s._id);

    const performDelete = async () => {
        const token = user?.token;
        if (!token) return;

        setShowConfirmModal(false);

        // 1. Optimistic Update (Local View)
        const previousDefinitions = [...codeDefinitions];
        const previousSegments = [...codedSegments];
        
        setCodeDefinitions(prev => prev.filter(d => d._id !== codeDefId));
        setCodedSegments(prev => prev.filter(s => s.codeDefinition?._id !== codeDefId));

        // 2. Optimistic Update (Global)
        if (allSegmentIds.length > 0) {
            syncGlobalProjectState('codedSegments', 'delete-bulk', allSegmentIds);
        }

        try {
            await axios.delete(
                `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/code-definitions/${codeDefId}`, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            // setShowConfirmModal(false);
        } catch (err) {
            // Revert
            setCodeDefinitions(previousDefinitions);
            setCodedSegments(previousSegments);
            setError(err.response?.data?.error || 'Failed to delete code definition');
        }
    };

    setConfirmModalData({
      title: 'Confirm Code Deletion',
      shortMessage: (
        <p>
          This will permanently remove the code and all{' '}
          <strong className="font-black text-red-500">{allSegmentIds.length}</strong>
          {' '}of its associated coded segment{allSegmentIds.length !== 1 ? 's' : ''} across all documents.
          <br /><br />
          <span className="font-bold text-red-500">THIS ACTION CANNOT BE UNDONE.</span>
        </p>
      ),
      showInput: true,
      promptText: "I confirm",
      confirmText: "Delete",
      onConfirm: performDelete,
    });
    setShowConfirmModal(true);
  };

  const handleDeleteCodedSegment = (segmentId, codeNameForConfirm) => {
    const performDelete = async () => {

      if (segmentId.startsWith('temp-')) {
        // Register this ID as cancelled so the Create function knows to stop
        cancelledSegIds.current.add(segmentId);

        // Remove from Local UI
        setCodedSegments(prev => prev.filter(s => s._id !== segmentId));
        
        // Remove from Global State
        syncGlobalProjectState('codedSegments', 'delete', segmentId);

        // Close Modal and Exit. Do NOT call server with axios.delete
        setShowConfirmModal(false);
        return;
      }

      const token = user?.token;
      if (!token) return;
      
      const segmentToDelete = codedSegments.find(s => s._id === segmentId);
      if (!segmentToDelete) return;

      setShowConfirmModal(false);

      const deleteAction = {
        execute: async (context) => {
          const idToDelete = context?.newId || segmentId;

          // 1. Optimistic Local
          setCodedSegments(prev => prev.filter(s => s._id !== idToDelete));
          
          // 2. Optimistic Global (Immediate)
          syncGlobalProjectState('codedSegments', 'delete', idToDelete);

          try {
            await axios.delete(
              `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/code/${idToDelete}`, 
              { headers: { Authorization: `Bearer ${token}` } }
            );
            return { success: true, segment: segmentToDelete };
          } catch (error) {
            // Revert
            setCodedSegments(prev => [...prev, segmentToDelete]);
            syncGlobalProjectState('codedSegments', 'add', segmentToDelete);
            return { success: false, error };
          }
        },
        undo: {
          execute: async (context) => {
            const restoredSegment = context.segment;
            
            setCodedSegments(prev => [...prev, restoredSegment]);
            syncGlobalProjectState('codedSegments', 'add', restoredSegment);

            try {
              const data = {
                text: restoredSegment.text,
                startIndex: restoredSegment.startIndex,
                endIndex: restoredSegment.endIndex,
                codeDefinitionId: restoredSegment.codeDefinition._id,
                fileId: restoredSegment.fileId,
                fileName: restoredSegment.fileName,
              };
              
              const res = await axios.post(
                `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/code`, 
                data, 
                { headers: { Authorization: `Bearer ${token}` } }
              );

              const newId = res.data.newSegment._id;
              
              // Swap Local
              setCodedSegments(prev => prev.map(seg => 
                seg._id === restoredSegment._id ? { ...seg, _id: newId } : seg
              ));

              // Swap Global
              syncGlobalProjectState('codedSegments', 'delete', restoredSegment._id);
              syncGlobalProjectState('codedSegments', 'add', res.data.newSegment);

              return { success: true, newId: newId }; 
            } catch (error) {
               setCodedSegments(prev => prev.filter(s => s._id !== restoredSegment._id));
               syncGlobalProjectState('codedSegments', 'delete', restoredSegment._id);
              return { success: false, error };
            }
          }
        }
      };
      
      await executeAction(deleteAction);
      // setShowConfirmModal(false);
    };

    setConfirmModalData({
      title: 'Confirm Coded Segment Deletion',
      shortMessage: `Are you sure you want to delete this coded segment ("${codeNameForConfirm}"...)?`,
      onConfirm: performDelete,
    });
    setShowConfirmModal(true);
  };

  // --- RESTORED EXPORT FUNCTIONS (Missing in the "New Code" snippet) ---

  const handleExportFileCodedSegments = async () => {
    if (!selectedFileId) return;
    try {
      const token = user?.token;
      if (!token) return;
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/export-coded-segments-file/${selectedFileId}`, 
        { method: 'GET', headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error((await response.json()).error || 'Export failed');
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'coded_segments.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) filename = filenameMatch[1];
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) { 
      console.error('Export error:', error); 
    }
  };

  const handleExportToExcel = async (format, projectName) => {
    if (!projectId) return;
    try {
      const token = user?.token;
      if (!token) return;
      let url;
      let defaultFilename;
      if (format === 'overlaps') {
        url = `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/export-overlaps`;
        defaultFilename = `${projectName}_overlaps.xlsx`;
      } else {
        url = `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/export-coded-segments?format=${format}`;
        defaultFilename = `${projectName}_coded_segments_${format}.xlsx`;
      }
      const response = await axios.get(url, { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' });
      const contentDisposition = response.headers['content-disposition'];
      let filename = defaultFilename;
      if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch && filenameMatch[1]) filename = filenameMatch[1];
      }
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error(`Error exporting ${format} data:`, err);
      setConfirmModalData({
        title: 'Export Failed',
        shortMessage: 'Failed to export data.',
        onConfirm: () => setShowConfirmModal(false),
      });
      setShowConfirmModal(true);
    }
  };

  const handleExportOverlaps = async (projectName) => {
    return handleExportToExcel('overlaps', projectName);
  };

  return {
    segmentToReassign,
    setSegmentToReassign,
    groupedCodedSegments,
    handleAssignCode,
    handleReassignCodeClick,
    handleSaveCodeDefinition,
    handleMergeCodes,
    handleSplitCodes,
    handleDeleteCodeDefinition,
    handleDeleteCodedSegment,
    handleExportFileCodedSegments,
    handleExportToExcel,
    handleExportOverlaps,
  };
};