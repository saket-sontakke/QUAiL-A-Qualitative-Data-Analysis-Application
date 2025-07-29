import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function useProjectViewHooks() {
  // ==================== ROUTER HOOKS ====================
  const { id: projectId } = useParams();
  const navigate = useNavigate();

  // ==================== BASIC STATE ====================
  const [project, setProject] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ==================== FILE SELECTION STATE ====================
  const [selectedContent, setSelectedContent] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedFileId, setSelectedFileId] = useState(null);

  // ==================== ANNOTATIONS STATE ====================
  const [codedSegments, setCodedSegments] = useState([]);
  const [inlineHighlights, setInlineHighlights] = useState([]);
  const [codeDefinitions, setCodeDefinitions] = useState([]);
  const [memos, setMemos] = useState([]);

  // ==================== UI PANEL STATE ====================
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [showImportedFiles, setShowImportedFiles] = useState(true);
  const [showCodeDefinitions, setShowCodeDefinitions] = useState(true);
  const [showCodedSegments, setShowCodedSegments] = useState(true);
  const [showMemosPanel, setShowMemosPanel] = useState(true);

  // ==================== HIGHLIGHT TOOL STATE ====================
  const [selectedHighlightColor, setSelectedHighlightColor] = useState('#00FF00');
  const [showHighlightColorDropdown, setShowHighlightColorDropdown] = useState(false);

  // ==================== CODE TOOL STATE ====================
  const [showCodeColors, setShowCodeColors] = useState(true);
  const [showCodeDropdown, setShowCodeDropdown] = useState(false);
  const [selectedCodeColor, setSelectedCodeColor] = useState('#FFA500');
  const [showDefineCodeModal, setShowDefineCodeModal] = useState(false);
  const [codeDefinitionToEdit, setCodeDefinitionToEdit] = useState(null);

  // ==================== SELECTION STATE ====================
  const [currentSelectionInfo, setCurrentSelectionInfo] = useState({
    text: '',
    startIndex: -1,
    endIndex: -1,
  });
  const [currentSelectionRange, setCurrentSelectionRange] = useState(null);
  const [activeTool, setActiveTool] = useState(null);

  // ==================== MEMO STATE ====================
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [memoToEdit, setMemoToEdit] = useState(null);
  const [currentMemoSelectionInfo, setCurrentMemoSelectionInfo] = useState(null);

  // ==================== FLOATING UI STATE ====================
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false);
  const [floatingToolbarPosition, setFloatingToolbarPosition] = useState({ top: 0, left: 0 });
  
  const [showFloatingAssignCode, setShowFloatingAssignCode] = useState(false);
  const [floatingAssignCodePosition, setFloatingAssignCodePosition] = useState({ top: 0, left: 0 });
  
  const [showFloatingMemoInput, setShowFloatingMemoInput] = useState(false);
  const [floatingMemoInputPosition, setFloatingMemoInputPosition] = useState({ top: 0, left: 0 });

  // ==================== MODAL STATE ====================
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState({
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [showCodedSegmentsTableModal, setShowCodedSegmentsTableModal] = useState(false);

  // ==================== SEARCH STATE ====================
  const [searchQuery, setSearchQuery] = useState('');
  const [viewerSearchQuery, setViewerSearchQuery] = useState('');
  const [viewerSearchMatches, setViewerSearchMatches] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

  // ==================== ACTIVE ITEMS STATE ====================
  const [activeCodedSegmentId, setActiveCodedSegmentId] = useState(null);
  const [activeMemoId, setActiveMemoId] = useState(null);
  const [annotationToScrollToId, setAnnotationToScrollToId] = useState(null);

  // ==================== EXPANDABLE GROUPS STATE ====================
  const [expandedCodes, setExpandedCodes] = useState({});
  const [expandedMemos, setExpandedMemos] = useState({});

  // ==================== REFS ====================
  const leftPanelRef = useRef(null);
  const viewerRef = useRef(null);
  const searchInputRef = useRef(null);
  const viewerSearchInputRef = useRef(null);
  const setDefineModalBackendErrorRef = useRef(null);

  // ==================== CONSTANTS ====================
  const highlightColors = [
    { name: 'Yellow', value: '#FFFF00', cssClass: 'bg-yellow-300' },
    { name: 'Green', value: '#00FF00', cssClass: 'bg-green-300' },
    { name: 'Blue', value: '#ADD8E6', cssClass: 'bg-blue-300' },
    { name: 'Pink', value: '#FFC0CB', cssClass: 'bg-pink-300' },
  ];

  // ==================== UTILITY FUNCTIONS ====================
  const toggleCodeGroup = (codeName) => {
    setExpandedCodes(prev => ({
      ...prev,
      [codeName]: !prev[codeName]
    }));
  };

  const toggleMemoGroup = (memoId) => {
    setExpandedMemos(prev => ({
      ...prev,
      [memoId]: !prev[memoId]
    }));
  };

  const handleDefineModalErrorSetter = useCallback((setter) => {
    setDefineModalBackendErrorRef.current = setter;
  }, []);

  const getCharOffset = useCallback((container, node, offset) => {
    let charCount = 0;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
    let currentNode;

    while ((currentNode = walker.nextNode())) {
      if (currentNode === node) {
        return charCount + offset;
      }
      charCount += currentNode.length;
    }
    return -1; 
  }, []);

  const createRangeFromOffsets = useCallback((containerElement, startIndex, endIndex) => {
    const range = document.createRange();
    let currentNode = containerElement;
    let currentOffset = 0;

    const findNodeAndOffset = (targetIndex) => {
      const treeWalker = document.createTreeWalker(
        containerElement,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      let node;
      let charCount = 0;
      while ((node = treeWalker.nextNode())) {
        const nodeLength = node.nodeValue.length;
        if (charCount + nodeLength >= targetIndex) {
          return { node, offset: targetIndex - charCount };
        }
        charCount += nodeLength;
      }
      return { node: null, offset: -1 };
    };

    const startInfo = findNodeAndOffset(startIndex);
    const endInfo = findNodeAndOffset(endIndex);

    if (startInfo.node && endInfo.node) {
      range.setStart(startInfo.node, startInfo.offset);
      range.setEnd(endInfo.node, endInfo.offset);
      return range;
    }
    return null;
  }, []);

  const getSelectionInfo = useCallback(() => {
    const selection = window.getSelection();
    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    if (!selection || !range || !selectedFileName || !viewerRef.current || !viewerRef.current.contains(range.commonAncestorContainer)) {
      return null;
    }

    const selectedText = selection.toString();
    if (!selectedText.trim()) {
      return null;
    }

    const startIndex = getCharOffset(viewerRef.current, range.startContainer, range.startOffset);
    const endIndex = getCharOffset(viewerRef.current, range.endContainer, range.endOffset);

    if (startIndex === -1 || endIndex === -1) {
      console.error("Failed to calculate accurate character offsets for selection.");
      return null;
    }

    return { text: selectedText, startIndex, endIndex };
  }, [selectedFileName, viewerRef, getCharOffset]);

  // ==================== API FUNCTIONS ====================
  const fetchProject = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const fetchedProject = res.data;

      setProject(fetchedProject);
      setProjectName(fetchedProject.name);
      setCodeDefinitions(fetchedProject.codeDefinitions || []);

      if (fetchedProject.importedFiles?.length > 0) {
        handleSelectFile(
          fetchedProject.importedFiles[0],
          fetchedProject.codedSegments,
          fetchedProject.inlineHighlights,
          fetchedProject.memos
        );
      } else {
        handleSelectFile(null);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/projects/import/${projectId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });
      setProject(res.data.project);
      const newlyImportedFile = res.data.project.importedFiles.at(-1);
      if (newlyImportedFile) {
        handleSelectFile(newlyImportedFile, res.data.project.codedSegments, res.data.project.inlineHighlights, res.data.project.memos);
      }
    } catch (err) {
      setShowConfirmModal(true);
      setConfirmModalData({
        title: 'Import Failed',
        message: err.response?.data?.error || 'Failed to import file.',
        onConfirm: () => setShowConfirmModal(false),
      });
    }
  };

  const handleAssignCode = async (codeDefinitionId) => {
    const { text, startIndex, endIndex } = currentSelectionInfo;

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/code`,
        {
          fileName: selectedFileName,
          fileId: selectedFileId,
          text,
          codeDefinitionId,
          startIndex,
          endIndex,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setProject(res.data.project);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save coded segment');
      setShowConfirmModal(true);
      setConfirmModalData({
        title: 'Coding Failed',
        message: err.response?.data?.error || 'Failed to apply code.',
        onConfirm: () => setShowConfirmModal(false),
      });
    } finally {
      setShowFloatingAssignCode(false);
      window.getSelection().removeAllRanges();
    }
  };

  const handleSaveCodeDefinition = async ({ name, description, color, _id }) => {
    if (setDefineModalBackendErrorRef.current) {
      setDefineModalBackendErrorRef.current('');
    }

    try {
      const token = localStorage.getItem('token');
      const method = _id ? 'put' : 'post';
      const url = _id
        ? `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/code-definitions/${_id}`
        : `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/code-definitions`;
      
      const res = await axios[method](url, { name, description, color }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setProject(res.data.project);
      setShowDefineCodeModal(false);
      setCodeDefinitionToEdit(null);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to save code definition.';
      if (setDefineModalBackendErrorRef.current) {
        setDefineModalBackendErrorRef.current(errorMessage);
      } else {
        setError(errorMessage);
        setShowConfirmModal(true);
        setConfirmModalData({
          title: 'Save Code Definition Failed',
          message: errorMessage,
          onConfirm: () => setShowConfirmModal(false),
        });
      }
    }
  };

  const handleSaveMemo = async ({ title, content, _id }) => {
    try {
      const token = localStorage.getItem('token');
      const memoData = {
        title,
        content,
        fileId: selectedFileId,
        fileName: selectedFileName,
        text: memoToEdit?.text ?? (currentMemoSelectionInfo ? currentMemoSelectionInfo.text : ''),
        startIndex: memoToEdit?.startIndex ?? (currentMemoSelectionInfo ? currentMemoSelectionInfo.startIndex : -1),
        endIndex: memoToEdit?.endIndex ?? (currentMemoSelectionInfo ? currentMemoSelectionInfo.endIndex : -1),
        author: localStorage.getItem('username') || 'Anonymous',
        authorId: localStorage.getItem('userId'),
      };

      const method = _id ? 'put' : 'post';
      const url = _id
        ? `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/memos/${_id}`
        : `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/memos`;
      
      const res = await axios[method](url, memoData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setProject(res.data.project);

      setShowMemoModal(false);
      setShowFloatingMemoInput(false);
      setMemoToEdit(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save memo.');
      setShowConfirmModal(true);
      setConfirmModalData({
        title: 'Save Memo Failed',
        message: err.response?.data?.error || 'Failed to save memo.',
        onConfirm: () => setShowConfirmModal(false),
      });
    } finally {
      window.getSelection().removeAllRanges();
    }
  };

  // ==================== DELETE FUNCTIONS ====================
  const handleDeleteMemo = (memoId, memoTitle) => {
    setConfirmModalData({
      title: 'Confirm Memo Deletion',
      message: `Are you sure you want to delete the memo "${memoTitle}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/memos/${memoId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          setProject(res.data.project);
          setShowConfirmModal(false);
          setActiveMemoId(null);
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to delete memo');
          setShowConfirmModal(false);
        }
      },
    });
    setShowConfirmModal(true);
  };

  const handleDeleteFile = (fileId, fileName) => {
    setConfirmModalData({
      title: 'Confirm File Deletion',
      message: `Are you sure you want to delete "${fileName}"? This action cannot be undone. All associated codes, highlights, and memos will also be deleted.`,
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
          await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/files/${fileId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          setShowConfirmModal(false);

          if (selectedFileId === fileId) {
            setSelectedFileId(null);
            setSelectedFileName('');
            setSelectedContent('');
          }
          
          fetchProject();

        } catch (err) {
          setError(err.response?.data?.error || 'Failed to delete file');
          setShowConfirmModal(false);
        }
      },
    });
    setShowConfirmModal(true);
  };

  const handleDeleteCodeDefinition = (codeDefId, codeDefName) => {
    setConfirmModalData({
      title: 'Confirm Code Deletion',
      message: `Are you sure you want to delete the code definition "${codeDefName}"? This will also remove all segments coded with it across all documents. This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
          await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/code-definitions/${codeDefId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          fetchProject();
          setShowConfirmModal(false);
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to delete code definition');
          setShowConfirmModal(false);
        }
      },
    });
    setShowConfirmModal(true);
  };

  const handleDeleteCodedSegment = (segmentId, codeNameForConfirm) => {
    setConfirmModalData({
      title: 'Confirm Coded Segment Deletion',
      message: `Are you sure you want to delete this coded segment ("${codeNameForConfirm}"...)? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/code/${segmentId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setProject(res.data.project);
          setShowConfirmModal(false);
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to delete coded segment');
          setShowConfirmModal(false);
        }
      },
    });
    setShowConfirmModal(true);
  };

  // ==================== EXPORT FUNCTIONS ====================
  const handleExportToExcel = async () => {
    if (!projectId) {
      setError('Please load a project before exporting.');
      setShowConfirmModal(true);
      setConfirmModalData({
        title: 'Export Error',
        message: 'Please load a project before exporting.',
        onConfirm: () => setShowConfirmModal(false),
        showCancelButton: false,
      });
      return;
    }

    if (!selectedFileId) {
      setError('Please select a file to export its coded segments.');
      setShowConfirmModal(true);
      setConfirmModalData({
        title: 'Export Error',
        message: 'Please select a file to export its coded segments.',
        onConfirm: () => setShowConfirmModal(false),
        showCancelButton: false
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/export-coded-segments`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob',
        }
      );

      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${projectName}_coded_segments.xlsx`);
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      link.remove();
      setError('');
    } catch (err) {
      console.error('Error exporting coded segments:', err);
      setError(err.response?.data?.error || 'Failed to export coded segments to Excel. Please try again.');
      setShowConfirmModal(true);
      setConfirmModalData({
        title: 'Export Failed',
        message: err.response?.data?.error || 'Failed to export coded segments to Excel. Please try again.',
        onConfirm: () => setShowConfirmModal(false),
        showCancelButton: false
      });
    }
  };

  const handleExportMemos = async () => {
    if (!selectedFileId) {
      setError('Please select a file to export its memos.');
      setShowConfirmModal(true);
      setConfirmModalData({
        title: 'Export Error',
        message: 'Please select a document to export its memos.',
        onConfirm: () => setShowConfirmModal(false),
        showCancelButton: false,
      });
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/export-memos`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob',
        }
      );
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${projectName}_memos.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setError('');
    } catch (err) {
      console.error('Export memos failed:', err);
      setError(err.response?.data?.error || 'Failed to export memos.');
      setShowConfirmModal(true);
      setConfirmModalData({
        title: 'Export Error',
        message: err.response?.data?.error || 'Failed to export memos.',
        onConfirm: () => setShowConfirmModal(false),
      });
    }
  };

  // ==================== FILE SELECTION HANDLERS ====================
  const handleSelectFile = useCallback((file, allCodedSegments = project?.codedSegments, allInlineHighlights = project?.inlineHighlights, allMemos = project?.memos) => {
    if (!file) {
        setSelectedContent('');
        setSelectedFileName('');
        setSelectedFileId(null);
        setCodedSegments([]);
        setInlineHighlights([]);
        setMemos([]);
        return;
    }
    setSelectedContent(file.content);
    setSelectedFileName(file.name);
    setSelectedFileId(file._id);

    const filteredCodes = allCodedSegments?.filter(seg => seg.fileId === file._id) || [];
    filteredCodes.sort((a, b) => a.startIndex - b.startIndex);
    setCodedSegments(filteredCodes);

    const filteredHighlights = allInlineHighlights?.filter(hl => hl.fileId === file._id) || [];
    filteredHighlights.sort((a, b) => a.startIndex - b.startIndex);
    setInlineHighlights(filteredHighlights);

    const filteredMemos = allMemos?.filter(memo => memo.fileId === file._id) || [];
    filteredMemos.sort((a, b) => a.startIndex - b.startIndex);
    setMemos(filteredMemos);

    setViewerSearchQuery('');
    setViewerSearchMatches([]);
    setCurrentMatchIndex(-1);
    setActiveCodedSegmentId(null);
    setActiveMemoId(null);
  }, [project]);

  // ==================== SEARCH HANDLERS ====================
  const goToNextMatch = () => {
    if (viewerSearchMatches.length > 0) {
      setCurrentMatchIndex(prevIndex => (prevIndex + 1) % viewerSearchMatches.length);
    }
  };

  const goToPrevMatch = () => {
    if (viewerSearchMatches.length > 0) {
      setCurrentMatchIndex(prevIndex => (prevIndex - 1 + viewerSearchMatches.length) % viewerSearchMatches.length);
    }
  };

  const handleViewerSearchChange = (e) => {
    const query = e.target.value;
    setViewerSearchQuery(query);
    if (query) {
      setActiveCodedSegmentId(null);
      if (showCodeColors) {
        setShowCodeColors(false);
      }
    }
  };

  const handleClearViewerSearch = () => {
    setViewerSearchQuery('');
    setViewerSearchMatches([]);
    setCurrentMatchIndex(-1);
    viewerSearchInputRef.current?.focus();
  };

  // ==================== SELECTION ACTION HANDLERS ====================
  const handleCodeSelectionAction = useCallback(async (selectionInfoOverride = null) => {
    const info = selectionInfoOverride || getSelectionInfo();
    if (!info || !selectedFileId) {
        setShowConfirmModal(true);
        setConfirmModalData({ title: 'Code Error', message: 'Please select text in a document to apply a code.', onConfirm: () => setShowConfirmModal(false) });
        return;
    }
    setCurrentSelectionInfo(info);
    setShowFloatingAssignCode(true);

    if (currentSelectionRange) {
      const rects = currentSelectionRange.getClientRects();
      const lastRect = rects[rects.length - 1];
      const popupHeight = 200, popupWidth = 300, offset = 12;
      let top = (window.innerHeight - lastRect.bottom < popupHeight + offset && lastRect.top > popupHeight + offset)
          ? lastRect.top + window.scrollY - popupHeight - offset
          : lastRect.bottom + window.scrollY + offset;
      let left = Math.max(8, Math.min(lastRect.right + window.scrollX - popupWidth / 2, window.innerWidth - popupWidth - 8));
      setFloatingAssignCodePosition({ top, left });
    }
    window.getSelection().removeAllRanges();
  }, [selectedFileId, currentSelectionRange, getSelectionInfo]);

  const handleHighlightSelectionAction = useCallback(async (selectionInfoOverride = null) => {
    const info = selectionInfoOverride || getSelectionInfo();
    if (!info || !selectedFileId) {
      setShowConfirmModal(true);
      setConfirmModalData({ title: 'Highlight Error', message: 'Please select text in a document to apply a highlight.', onConfirm: () => setShowConfirmModal(false) });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/highlight`,
        {
          fileName: selectedFileName,
          fileId: selectedFileId,
          text: info.text,
          color: selectedHighlightColor,
          startIndex: info.startIndex,
          endIndex: info.endIndex,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setProject(res.data.project);

    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save highlight');
      setShowConfirmModal(true);
      setConfirmModalData({
        title: 'Highlight Failed',
        message: err.response?.data?.error || 'Failed to apply highlight.',
        onConfirm: () => setShowConfirmModal(false),
      });
    } finally {
      window.getSelection().removeAllRanges();
    }
  }, [selectedFileId, selectedHighlightColor, projectId, selectedFileName, getSelectionInfo]);

  const handleMemoSelectionAction = useCallback(async (selectionInfoOverride = null) => {
    const info = selectionInfoOverride || getSelectionInfo();
    if (!selectedFileId) {
        setShowConfirmModal(true);
        setConfirmModalData({ title: 'Memo Error', message: 'Please select a document to create a memo.', onConfirm: () => setShowConfirmModal(false) });
        return;
    }

    setCurrentMemoSelectionInfo(info || { text: '', startIndex: -1, endIndex: -1 });
    setMemoToEdit(null);
    setShowFloatingMemoInput(true);

    if (currentSelectionRange) {
        const rects = currentSelectionRange.getClientRects();
        const lastRect = rects[rects.length - 1];
        const estimatedMemoHeight = 320, popupWidth = 300, offset = 12;
        let top = (window.innerHeight - lastRect.bottom < estimatedMemoHeight + offset && lastRect.top > estimatedMemoHeight + offset)
            ? lastRect.top + window.scrollY - estimatedMemoHeight - offset
            : lastRect.bottom + window.scrollY + offset;
        let left = Math.max(8, Math.min(lastRect.right + window.scrollX - popupWidth / 2, window.innerWidth - popupWidth - 8));
        setFloatingMemoInputPosition({ top, left });
    }
    window.getSelection().removeAllRanges();
  }, [selectedFileId, currentSelectionRange, getSelectionInfo]);

  const handleEraseSelectionAction = useCallback(async () => {
    const selectionInfo = getSelectionInfo();
    if (!selectionInfo || !selectedFileId) {
      setShowConfirmModal(true);
      setConfirmModalData({ title: 'Erase Error', message: 'Please select text to erase highlights from.', onConfirm: () => setShowConfirmModal(false) });
      return;
    }

    const { startIndex, endIndex } = selectionInfo;
    const highlightsToDelete = inlineHighlights
      .filter(highlight => Math.max(startIndex, highlight.startIndex) < Math.min(endIndex, highlight.endIndex))
      .map(h => h._id);

    if (highlightsToDelete.length === 0) {
      window.getSelection().removeAllRanges();
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/highlight/delete-bulk`, 
        { ids: highlightsToDelete },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setProject(res.data.project);
      setError('');

    } catch (err) {
      setError(err.response?.data?.error || 'Failed to erase selected highlights.');
      setShowConfirmModal(true);
      setConfirmModalData({
        title: 'Erase Failed',
        message: err.response?.data?.error || 'Failed to erase selected highlights.',
        onConfirm: () => setShowConfirmModal(false),
      });
    } finally {
      window.getSelection().removeAllRanges();
    }
  }, [selectedFileId, inlineHighlights, projectId, getSelectionInfo]);

  // ==================== MOUSE EVENT HANDLERS ====================
  const handleViewerMouseUp = useCallback(() => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    setShowFloatingAssignCode(false);
    setShowFloatingMemoInput(false);
    setShowFloatingToolbar(false);

    if (!selectedText || !selectedFileId || !viewerRef.current || !viewerRef.current.contains(selection.anchorNode)) {
      return;
    }

    const selectionInfo = getSelectionInfo();
    if (!selectionInfo) return;

    setCurrentSelectionRange(range);

    if (activeTool === 'code') {
      handleCodeSelectionAction(selectionInfo);
    } else if (activeTool === 'memo') {
      handleMemoSelectionAction(selectionInfo);
    } else if (activeTool === 'highlight') {
      handleHighlightSelectionAction(selectionInfo);
    } else if (activeTool === 'erase') {
      handleEraseSelectionAction();
    } else {
      const rects = range.getClientRects();
      const lastRect = rects[rects.length - 1];
      const toolbarX = lastRect.right + window.scrollX - 150;
      const toolbarY = lastRect.bottom + window.scrollY + 8;
      setFloatingToolbarPosition({ top: toolbarY, left: toolbarX });
      setShowFloatingToolbar(true);
    }
  }, [activeTool, selectedFileId, handleCodeSelectionAction, handleMemoSelectionAction, handleHighlightSelectionAction, handleEraseSelectionAction, getSelectionInfo]);

  // ==================== MODAL CLOSE HANDLERS ====================
  const handleDefineCodeModalClose = () => {
    setShowDefineCodeModal(false);
    setCodeDefinitionToEdit(null);
    if (setDefineModalBackendErrorRef.current) {
      setDefineModalBackendErrorRef.current('');
    }
  };

  // ==================== COMPUTED VALUES ====================
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

  const groupedMemos = useMemo(() => {
    return memos.map(memo => ({
      ...memo,
      displayTitle: memo.title || (memo.text ? `Memo on "${memo.text.substring(0, 30)}..."` : 'Document Memo'),
      isSegmentMemo: memo.startIndex !== -1 && memo.endIndex !== -1,
    })).sort((a, b) => a.startIndex - b.startIndex);
  }, [memos]);

  // ==================== EFFECTS ====================
  useEffect(() => {
    const handleClickOutside = (event) => {
        const isModalClick = event.target.closest('.define-code-modal-content, .confirmation-modal-content, .memo-modal-content');
        const isFloatingUiClick = event.target.closest('.floating-toolbar, .floating-assign-code, .floating-memo-input, .color-dropdown-menu, .code-dropdown-menu');
        
        if (!isModalClick && !isFloatingUiClick) {
            setShowFloatingToolbar(false);
            setShowFloatingAssignCode(false);
            setShowFloatingMemoInput(false);
            setShowHighlightColorDropdown(false);
            setShowCodeDropdown(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isLeftPanelCollapsed && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isLeftPanelCollapsed]);

  useEffect(() => {
    if (leftPanelRef.current) {
      leftPanelRef.current.scrollTop = 0;
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  useEffect(() => {
    if (project && selectedFileId) {
      const currentFile = project.importedFiles.find(f => f._id === selectedFileId);
      if (currentFile) {
        handleSelectFile(
            currentFile,
            project.codedSegments,
            project.inlineHighlights,
            project.memos
        );
      }
    } else if (project && project.importedFiles?.length > 0 && !selectedFileId) {
        handleSelectFile(
            project.importedFiles[0],
            project.codedSegments,
            project.inlineHighlights,
            project.memos
        );
    }
  }, [project, selectedFileId, handleSelectFile]);

  useEffect(() => {
    if (annotationToScrollToId && viewerRef.current) {
      let element = viewerRef.current.querySelector(`[data-code-segment-id="${annotationToScrollToId}"], [data-memo-id="${annotationToScrollToId}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setAnnotationToScrollToId(null);
      }
    }
  }, [annotationToScrollToId]);

  useEffect(() => {
    if (!viewerSearchQuery || !selectedContent) {
      setViewerSearchMatches([]);
      setCurrentMatchIndex(-1);
      return;
    }
    const searchRegex = new RegExp(viewerSearchQuery, 'gi');
    const matches = Array.from(selectedContent.matchAll(searchRegex)).map(match => ({
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        text: match[0],
    }));
    setViewerSearchMatches(matches);
    setCurrentMatchIndex(matches.length > 0 ? 0 : -1);
  }, [viewerSearchQuery, selectedContent]);

  useEffect(() => {
    if (viewerSearchMatches.length > 0 && currentMatchIndex !== -1 && viewerRef.current) {
      const activeHighlightElement = viewerRef.current.querySelector('.viewer-search-highlight-active');
      if (activeHighlightElement) {
        activeHighlightElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentMatchIndex, viewerSearchMatches]);

  // ==================== RETURN OBJECT ====================
  return {
    // Router
    projectName, navigate,
    // Basic state
    project, loading, error, setError,
    // File selection
    selectedContent, setSelectedContent, selectedFileName, setSelectedFileName, selectedFileId, setSelectedFileId,
    // Annotations
    codedSegments, setCodedSegments, inlineHighlights, setInlineHighlights, codeDefinitions, setCodeDefinitions, memos, setMemos,
    // UI panels
    leftPanelRef, isLeftPanelCollapsed, setIsLeftPanelCollapsed, showImportedFiles, setShowImportedFiles, showCodeDefinitions, setShowCodeDefinitions, showCodedSegments, setShowCodedSegments, showMemosPanel, setShowMemosPanel,
    // Highlight tool
    selectedHighlightColor, setSelectedHighlightColor, showHighlightColorDropdown, setShowHighlightColorDropdown, highlightColors,
    // Code tool
    showCodeColors, setShowCodeColors, showCodeDropdown, setShowCodeDropdown, selectedCodeColor, setSelectedCodeColor, showDefineCodeModal, setShowDefineCodeModal, codeDefinitionToEdit, setCodeDefinitionToEdit,
    // Selection
    currentSelectionInfo, setCurrentSelectionInfo, currentSelectionRange, setCurrentSelectionRange, activeTool, setActiveTool,
    // Memo
    showMemoModal, setShowMemoModal, memoToEdit, setMemoToEdit, currentMemoSelectionInfo, setCurrentMemoSelectionInfo,
    // Floating UI
    showFloatingToolbar, setShowFloatingToolbar, floatingToolbarPosition, setFloatingToolbarPosition, showFloatingAssignCode, setShowFloatingAssignCode, floatingAssignCodePosition, setFloatingAssignCodePosition, showFloatingMemoInput, setShowFloatingMemoInput, floatingMemoInputPosition, setFloatingMemoInputPosition,
    // Modals
    showConfirmModal, setShowConfirmModal, confirmModalData, setConfirmModalData, showCodedSegmentsTableModal, setShowCodedSegmentsTableModal,
    // Search
    searchQuery, setSearchQuery, searchInputRef, viewerSearchQuery, setViewerSearchQuery, viewerSearchInputRef, viewerSearchMatches, setViewerSearchMatches, currentMatchIndex, setCurrentMatchIndex,
    // Active items
    activeCodedSegmentId, setActiveCodedSegmentId, activeMemoId, setActiveMemoId, annotationToScrollToId, setAnnotationToScrollToId,
    // Expandable groups
    expandedCodes, setExpandedCodes, expandedMemos, setExpandedMemos,
    // Refs
    viewerRef, setDefineModalBackendErrorRef,
    // Functions
    toggleCodeGroup, toggleMemoGroup, handleDefineModalErrorSetter, fetchProject, createRangeFromOffsets, handleFileChange, handleSelectFile, goToNextMatch, goToPrevMatch, handleViewerSearchChange, handleClearViewerSearch, getSelectionInfo, handleCodeSelectionAction, handleHighlightSelectionAction, handleMemoSelectionAction, handleEraseSelectionAction, handleViewerMouseUp, handleAssignCode, handleSaveCodeDefinition, handleDefineCodeModalClose, handleSaveMemo, handleDeleteMemo, handleDeleteFile, handleDeleteCodeDefinition, handleDeleteCodedSegment, handleExportToExcel, handleExportMemos,
    // Computed values
    groupedCodedSegments, groupedMemos,
  };
}
