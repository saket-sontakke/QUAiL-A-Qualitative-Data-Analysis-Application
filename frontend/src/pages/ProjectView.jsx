import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTrashAlt, FaHighlighter, FaCaretDown, FaCaretRight, FaPlus, FaEdit, FaEraser, FaSearch, FaTimes, FaChevronUp, FaChevronDown, FaStickyNote} from 'react-icons/fa';
import { FaAnglesLeft, FaAnglesRight } from "react-icons/fa6";
import { MdCode, MdCodeOff } from "react-icons/md";
import { CgImport, CgExport } from "react-icons/cg";
import Navbar from './Navbar.jsx';
import ConfirmationModal from './ConfirmationModal.jsx';
import DefineCodeModal from './DefineCodeModal.jsx';
import AssignCodeModal from './AssignCodeModal.jsx';
import MemoModal from './MemoModal.jsx'; 

const ProjectView = () => {
  const { id: projectId } = useParams();
  const [projectName, setProjectName] = useState('');
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [selectedContent, setSelectedContent] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [codedSegments, setCodedSegments] = useState([]);
  const [inlineHighlights, setInlineHighlights] = useState([]);
  const [codeDefinitions, setCodeDefinitions] = useState([]);
  const leftPanelRef = useRef(null); // for scrolling left panel
  // NEW STATE: For memos
  const [memos, setMemos] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [selectedHighlightColor, setSelectedHighlightColor] = useState('#00FF00');
  const [showHighlightColorDropdown, setShowHighlightColorDropdown] = useState(false);

  // NEW STATE: For Code Coloring Toggle
  const [showCodeColors, setShowCodeColors] = useState(true); // Default to MdCode (colored)
  const [showCodeDropdown, setShowCodeDropdown] = useState(false); // For the new MdCode dropdown

  const highlightColors = [
    { name: 'Yellow', value: '#FFFF00', cssClass: 'bg-yellow-300' },
    { name: 'Green', value: '#00FF00', cssClass: 'bg-green-300' },
    { name: 'Blue', value: '#ADD8E6', cssClass: 'bg-blue-300' },
    { name: 'Pink', value: '#FFC0CB', cssClass: 'bg-pink-300' },
  ];

  const [selectedCodeColor, setSelectedCodeColor] = useState('#FFA500');

  const [showDefineCodeModal, setShowDefineCodeModal] = useState(false);
  const [codeDefinitionToEdit, setCodeDefinitionToEdit] = useState(null);

  const [showAssignCodeModal, setShowAssignCodeModal] = useState(false);
  const [currentSelectionInfo, setCurrentSelectionInfo] = useState({
    text: '',
    startIndex: -1,
    endIndex: -1,
  });

  // NEW STATE: For Memo Modal
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [memoToEdit, setMemoToEdit] = useState(null);
  const [currentMemoSelectionInfo, setCurrentMemoSelectionInfo] = useState({
    text: '',
    startIndex: -1,
    endIndex: -1,
  });


  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState({
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const viewerRef = useRef(null);
  const [activeTool, setActiveTool] = useState(null);

  const [expandedCodes, setExpandedCodes] = useState({});
  // NEW STATE: For expanded memos (similar to codes)
  const [expandedMemos, setExpandedMemos] = useState({});

  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [showImportedFiles, setShowImportedFiles] = useState(true);
  const [showCodeDefinitions, setShowCodeDefinitions] = useState(true);
  const [showCodedSegments, setShowCodedSegments] = useState(true);
  // NEW STATE: To show/hide memos in the left panel
  const [showMemosPanel, setShowMemosPanel] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  // NEW: State for search query in VIEWER and its corresponding ref
  const [viewerSearchQuery, setViewerSearchQuery] = useState('');
  const viewerSearchInputRef = useRef(null);
  const [viewerSearchMatches, setViewerSearchMatches] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

  // NEW STATE: To track the currently active (highlighted) coded segment
  const [activeCodedSegmentId, setActiveCodedSegmentId] = useState(null);
  // NEW STATE: To track the currently active (highlighted) memo
  const [activeMemoId, setActiveMemoId] = useState(null);


  // NEW STATE: To explicitly trigger scrolling to a segment or memo
  const [annotationToScrollToId, setAnnotationToScrollToId] = useState(null);


  const toggleCodeGroup = (codeName) => {
    setExpandedCodes(prev => ({
      ...prev,
      [codeName]: !prev[codeName]
    }));
  };

  // NEW: Toggle memo group
  const toggleMemoGroup = (memoId) => {
    setExpandedMemos(prev => ({
      ...prev,
      [memoId]: !prev[memoId]
    }));
  };

  const setDefineModalBackendErrorRef = useRef(null);

  const handleDefineModalErrorSetter = useCallback((setter) => {
    setDefineModalBackendErrorRef.current = setter;
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const toolbarElement = document.getElementById('viewer-toolbar');
      const viewerElement = viewerRef.current;
      const clickedInsideDefineCodeModal = event.target.closest('.define-code-modal-content');
      const clickedInsideAssignCodeModal = event.target.closest('.assign-code-modal-content');
      const clickedInsideConfirmModal = event.target.closest('.confirmation-modal-content');
      const clickedInsideHighlightDropdown = event.target.closest('.color-dropdown-menu');
      // NEW: For Code dropdown
      const clickedInsideCodeDropdown = event.target.closest('.code-dropdown-menu');
      // NEW: For Memo Modal
      const clickedInsideMemoModal = event.target.closest('.memo-modal-content');


      const clickedOutsideToolbar = toolbarElement && !toolbarElement.contains(event.target);
      const clickedOutsideViewer = viewerElement && !viewerElement.contains(event.target);

      if (clickedOutsideToolbar && !clickedInsideDefineCodeModal && !clickedInsideAssignCodeModal && !clickedInsideConfirmModal && !clickedInsideHighlightDropdown && !clickedInsideCodeDropdown && !clickedInsideMemoModal) {
        setShowHighlightColorDropdown(false);
        setShowCodeDropdown(false); // NEW: Hide code dropdown
      }

      if (clickedOutsideToolbar && clickedOutsideViewer && !clickedInsideDefineCodeModal && !clickedInsideAssignCodeModal && !clickedInsideConfirmModal && !clickedInsideMemoModal) {
          setActiveTool(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
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

  const fetchProject = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:5000/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProject(res.data);
      setProjectName(res.data.name);
      setCodeDefinitions(res.data.codeDefinitions || []);
      // NEW: Load memos at project level
      setMemos(res.data.memos || []);


      const currentSelectedFile = res.data.importedFiles.find(f => f._id === selectedFileId);

      if (currentSelectedFile) {
        handleSelectFile(currentSelectedFile, res.data.codedSegments, res.data.inlineHighlights, res.data.memos);
      } else if (res.data.importedFiles.length > 0) {
        handleSelectFile(res.data.importedFiles[0], res.data.codedSegments, res.data.inlineHighlights, res.data.memos);
      } else {
        setSelectedContent('');
        setSelectedFileName('');
        setSelectedFileId(null);
        setCodedSegments([]);
        setInlineHighlights([]);
        setMemos([]); // NEW: Clear memos if no file selected
      }

    }
    catch (err) {
      setError(err.response?.data?.error || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedFileId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  useEffect(() => {
    if (project && selectedFileId) {
      const segmentsForCurrentFile = project.codedSegments.filter(
        segment => segment.fileId === selectedFileId
      );
      segmentsForCurrentFile.sort((a, b) => a.startIndex - b.startIndex);
      setCodedSegments(segmentsForCurrentFile);

      const highlightsForCurrentFile = project.inlineHighlights.filter(
        highlight => highlight.fileId === selectedFileId
      );
      highlightsForCurrentFile.sort((a, b) => a.startIndex - b.startIndex);
      setInlineHighlights(highlightsForCurrentFile);

      // NEW: Filter memos for the current file
      const memosForCurrentFile = project.memos.filter(
        memo => memo.fileId === selectedFileId
      );
      memosForCurrentFile.sort((a, b) => a.startIndex - b.startIndex);
      setMemos(memosForCurrentFile);

    } else {
      setCodedSegments([]);
      setInlineHighlights([]);
      setMemos([]); // NEW: Clear memos if no file selected
    }
  }, [project, selectedFileId]);

  // NEW: Effect to scroll to a specific segment or memo when annotationToScrollToId changes
  useEffect(() => {
    if (annotationToScrollToId && viewerRef.current) {
      // Prioritize coded segments, then memos
      let element = viewerRef.current.querySelector(`[data-code-segment-id="${annotationToScrollToId}"]`);
      if (!element) {
        element = viewerRef.current.querySelector(`[data-memo-id="${annotationToScrollToId}"]`);
      }

      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
        setAnnotationToScrollToId(null);
      }
    }
  }, [annotationToScrollToId, viewerRef]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`http://localhost:5000/api/projects/import/${projectId}`, formData, {
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

  const handleSelectFile = useCallback((file, allCodedSegments = project?.codedSegments, allInlineHighlights = project?.inlineHighlights, allMemos = project?.memos) => {
    setSelectedContent(file.content);
    setSelectedFileName(file.name);
    setSelectedFileId(file._id);

    const filteredCodes = allCodedSegments?.filter(seg => seg.fileId === file._id) || [];
    filteredCodes.sort((a, b) => a.startIndex - b.startIndex);
    setCodedSegments(filteredCodes);

    const filteredHighlights = allInlineHighlights?.filter(hl => hl.fileId === file._id) || [];
    filteredHighlights.sort((a, b) => a.startIndex - b.startIndex);
    setInlineHighlights(filteredHighlights);

    // NEW: Filter memos for the selected file
    const filteredMemos = allMemos?.filter(memo => memo.fileId === file._id) || [];
    filteredMemos.sort((a, b) => a.startIndex - b.startIndex);
    setMemos(filteredMemos);


    setViewerSearchQuery('');
    setViewerSearchMatches([]);
    setCurrentMatchIndex(-1);
    setActiveCodedSegmentId(null);
    setActiveMemoId(null); // NEW: Reset active memo when changing file


  }, [project]);

  const renderContentWithHighlights = useCallback(() => {
    if (!selectedContent) return 'Select a document to view its contents.';

    let allAnnotations = [
      ...(codedSegments.map(seg => ({ ...seg, type: 'code' }))),
      ...(inlineHighlights.map(hl => ({ ...hl, type: 'highlight' }))),
      ...(memos.map(memo => ({ ...memo, type: 'memo' }))) // NEW: Add memos to annotations
    ];

    allAnnotations.sort((a, b) => a.startIndex - b.startIndex || a.endIndex - b.endIndex);

    let result = [];
    let lastIndex = 0;

    const viewerText = selectedContent;

    let currentSearchMatches = [];
    if (viewerSearchQuery) {
        const searchRegex = new RegExp(viewerSearchQuery, 'gi');
        let match;
        while ((match = searchRegex.exec(viewerText)) !== null) {
            currentSearchMatches.push({
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                type: 'search',
                text: match[0]
            });
        }
    }

    if (JSON.stringify(currentSearchMatches) !== JSON.stringify(viewerSearchMatches)) {
      setViewerSearchMatches(currentSearchMatches);
      if (currentSearchMatches.length > 0) {
          setCurrentMatchIndex(0);
      } else {
          setCurrentMatchIndex(-1);
      }
    }


    let allRenderableItems = [
        ...allAnnotations,
        ...currentSearchMatches
    ];

    allRenderableItems.sort((a, b) => a.startIndex - b.startIndex || a.endIndex - b.endIndex);

    allRenderableItems.forEach((annotation, index) => {
      if (annotation.startIndex > lastIndex) {
        result.push(<React.Fragment key={`plain-${lastIndex}-${annotation.startIndex}`}>{viewerText.substring(lastIndex, annotation.startIndex)}</React.Fragment>);
      }

      const effectiveStartIndex = Math.max(lastIndex, annotation.startIndex);
      const effectiveEndIndex = Math.min(annotation.endIndex, viewerText.length);

      if (effectiveStartIndex < effectiveEndIndex) {
        const segmentContent = viewerText.substring(effectiveStartIndex, effectiveEndIndex);
        let backgroundColor = '';
        let titleText = '';
        let className = "relative group cursor-help rounded px-0.5";
        let superscript = null; // Generalizing for code and memo

        if (annotation.type === 'code') {
          const codeDef = annotation.codeDefinition;
          titleText = `Code: ${codeDef?.name || 'Unknown'}\nDesc: ${codeDef?.description || 'No description'}\nType: Coded Segment`;
          className += " border-b-2 border-dotted border-gray-600 dark:border-gray-300";

          const isSegmentActive = activeCodedSegmentId === annotation._id;
          if (showCodeColors) {
              backgroundColor = isSegmentActive ? '' : (codeDef?.color || '#cccccc') + '66';
          } else {
              backgroundColor = isSegmentActive ? (codeDef?.color || '#cccccc') + '66' : '';
          }


          superscript = (
            <sup
              className="ml-0.5 mr-0.5 px-1 py-0.5 rounded-full text-xs cursor-pointer select-none font-bold"
              style={{ backgroundColor: codeDef?.color || '#cccccc', color: '#FFF' }}
              onClick={(e) => {
                e.stopPropagation();
                setActiveCodedSegmentId(prevId => prevId === annotation._id ? null : annotation._id);
              }}
              title={`Click to toggle display for code: ${codeDef?.name || 'Unknown'}`}
            >
                
            </sup>
          );
        } else if (annotation.type === 'highlight') {
          backgroundColor = annotation.color + '33';
          titleText = 'Type: Inline Highlight';
        } else if (annotation.type === 'memo') { // NEW: Handle memo annotation type
            titleText = `Memo: ${annotation.title || 'No Title'}\nContent: ${annotation.content || 'No content'}`;
            // Memos do not highlight the text, so no backgroundColor here
            const isMemoActive = activeMemoId === annotation._id;

        superscript = (
          <sup
            className="ml-0.1 mr-0.1 cursor-pointer select-none align-super"
            onClick={(e) => {
              e.stopPropagation();
              setActiveMemoId(prevId => prevId === annotation._id ? null : annotation._id);
              setMemoToEdit(annotation);
              setShowMemoModal(true);
            }}
            title={`Click to view/edit memo: ${annotation.title || 'No Title'}`}
          >
            <FaStickyNote className="inline-block" style={{ fontSize: '0.9rem', color: '#FFE135' }} />
          </sup>
        );
            // If the memo is active, add a temporary background
            backgroundColor = '';

        } else if (annotation.type === 'search') {
          if (currentMatchIndex !== -1 && viewerSearchMatches[currentMatchIndex] &&
              annotation.startIndex === viewerSearchMatches[currentMatchIndex].startIndex &&
              annotation.endIndex === viewerSearchMatches[currentMatchIndex].endIndex) {
              backgroundColor = '#FF5733';
              className += " viewer-search-highlight-active";
          } else {
              backgroundColor = '#FFFF00';
              className += " viewer-search-highlight";
          }
          titleText = 'Search Match';
      }

        result.push(
          <span
            key={annotation._id || `${annotation.startIndex}-${annotation.endIndex}-${annotation.type}-${index}`}
            style={{ backgroundColor: backgroundColor }}
            className={className}
            title={titleText}
            data-start-index={annotation.startIndex}
            data-end-index={annotation.endIndex}
            data-annotation-type={annotation.type}
            {...(annotation.type === 'code' && { 'data-code-segment-id': annotation._id })}
            {...(annotation.type === 'memo' && { 'data-memo-id': annotation._id })} // NEW: Add data-memo-id
          >
            {superscript} {/* Render general superscript */}
            {segmentContent}
          </span>
        );
      }
      lastIndex = Math.max(lastIndex, annotation.endIndex);
    });

    if (lastIndex < viewerText.length) {
      result.push(<React.Fragment key={`plain-end-${lastIndex}`}>{viewerText.substring(lastIndex)}</React.Fragment>);
    }

    return result;
  }, [selectedContent, codedSegments, inlineHighlights, memos, viewerSearchQuery, viewerSearchMatches, currentMatchIndex, activeCodedSegmentId, activeMemoId, showCodeColors]); // NEW: Add memos and activeMemoId to dependency array

  useEffect(() => {
    if (viewerSearchMatches.length > 0 && currentMatchIndex !== -1 && viewerRef.current) {
        const activeHighlightElement = viewerRef.current.querySelector('.viewer-search-highlight-active');

        if (activeHighlightElement) {
            activeHighlightElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }
  }, [currentMatchIndex, viewerSearchMatches, viewerRef]);

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
  };

  const handleClearViewerSearch = () => {
    setViewerSearchQuery('');
    setViewerSearchMatches([]);
    setCurrentMatchIndex(-1);
    viewerSearchInputRef.current?.focus();
  };

  const getSelectionInfo = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !selectedFileName) return null;

    const range = selection.getRangeAt(0);
    if (!viewerRef.current || !viewerRef.current.contains(selection.anchorNode)) return null;

    const fullText = selectedContent;

    const selectedText = selection.toString();
    if (!selectedText.trim()) return null;

    // This is a simple indexOf, which might not be accurate for complex DOM structures.
    // For production, consider using a more robust solution that accounts for DOM nodes.
    const startIndex = fullText.indexOf(selectedText);
    const endIndex = startIndex + selectedText.length;

    if (startIndex === -1) return null;

    return { text: selectedText, startIndex, endIndex };
  };


  const handleCodeSelectionAction = () => {
    const selectionInfo = getSelectionInfo();
    if (!selectionInfo) {
        return;
    }
    setCurrentSelectionInfo(selectionInfo);
    setShowAssignCodeModal(true);
  };

  const handleHighlightSelectionAction = async () => {
    const selectionInfo = getSelectionInfo();
    if (!selectionInfo) {
        return;
    }
    if (!selectedFileId) {
        setError("Please select a document to highlight.");
        setShowConfirmModal(true);
        setConfirmModalData({
            title: 'Highlight Error',
            message: 'Please select a document to apply highlight.',
            onConfirm: () => setShowConfirmModal(false),
        });
        return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:5000/api/projects/${projectId}/highlight`,
        {
          fileName: selectedFileName,
          fileId: selectedFileId,
          text: selectionInfo.text,
          color: selectedHighlightColor,
          startIndex: selectionInfo.startIndex,
          endIndex: selectionInfo.endIndex,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      fetchProject();
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
  };

  // NEW: Handle Memo Selection Action
  const handleMemoSelectionAction = () => {
    const selectionInfo = getSelectionInfo();
    if (!selectionInfo) {
      // If no text is selected, allow creating a document-level memo
      if (selectedFileId) {
        setCurrentMemoSelectionInfo({ text: '', startIndex: -1, endIndex: -1 });
        setMemoToEdit(null); // Ensure no previous memo is being edited
        setShowMemoModal(true);
      } else {
        setError("Please select a document to create a memo.");
        setShowConfirmModal(true);
        setConfirmModalData({
          title: 'Memo Error',
          message: 'Please select a document to create a memo.',
          onConfirm: () => setShowConfirmModal(false),
        });
      }
      return;
    }

    if (!selectedFileId) {
      setError("Please select a document to create a memo.");
      setShowConfirmModal(true);
      setConfirmModalData({
        title: 'Memo Error',
        message: 'Please select a document to create a memo.',
        onConfirm: () => setShowConfirmModal(false),
      });
      return;
    }
    setCurrentMemoSelectionInfo(selectionInfo);
    setMemoToEdit(null); // Clear any pre-filled memo data
    setShowMemoModal(true);
  };


  const handleEraseSelectionAction = async () => {
    const selectionInfo = getSelectionInfo();
    if (!selectionInfo || !selectedFileId) {
      return;
    }

    const { startIndex, endIndex } = selectionInfo;
    const highlightsToDelete = [];

    inlineHighlights.forEach(highlight => {
      if (Math.max(startIndex, highlight.startIndex) < Math.min(endIndex, highlight.endIndex)) {
        highlightsToDelete.push(highlight._id);
      }
    });

    if (highlightsToDelete.length === 0) {
      window.getSelection().removeAllRanges();
      return;
    }

    try {
      const token = localStorage.getItem('token');
      for (const highlightId of highlightsToDelete) {
        await axios.delete(`http://localhost:5000/api/projects/${projectId}/highlight/${highlightId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      fetchProject();
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
  };


  const handleViewerMouseUp = () => {
    const selection = window.getSelection();
    if (!selectedFileId || !selection || selection.toString().length === 0 || !viewerRef.current || !viewerRef.current.contains(selection.anchorNode)) {
        return;
    }

    if (activeTool === 'code') {
        handleCodeSelectionAction();
    } else if (activeTool === 'highlight') {
        handleHighlightSelectionAction();
    } else if (activeTool === 'erase') {
        handleEraseSelectionAction();
    } else if (activeTool === 'memo') { // NEW: Trigger memo action on mouse up if memo tool is active
        handleMemoSelectionAction();
    }
  };


  const handleAssignCode = async (codeDefinitionId) => {
    const { text, startIndex, endIndex } = currentSelectionInfo;

    if (!selectedFileId) {
        setError("Please select a document to code.");
        setShowConfirmModal(true);
        setConfirmModalData({
            title: 'Coding Error',
            message: 'Please select a document to apply code.',
            onConfirm: () => setShowConfirmModal(false),
        });
        return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `http://localhost:5000/api/projects/${projectId}/code`,
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
      setShowAssignCodeModal(false);
      window.getSelection().removeAllRanges();
    }
  };

  const handleSaveCodeDefinition = async ({ name, description, color, _id }) => {
    if (setDefineModalBackendErrorRef.current) {
        setDefineModalBackendErrorRef.current('');
    }

    try {
      const token = localStorage.getItem('token');
      if (_id) {
        await axios.put(`http://localhost:5000/api/projects/${projectId}/code-definitions/${_id}`,
          { name, description, color },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(`http://localhost:5000/api/projects/${projectId}/code-definitions`,
          { name, description, color },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      fetchProject();
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

  const handleDefineCodeModalClose = () => {
    setShowDefineCodeModal(false);
    setCodeDefinitionToEdit(null);
    if (setDefineModalBackendErrorRef.current) {
        setDefineModalBackendErrorRef.current('');
    }
  };

  // NEW: handleSaveMemo function
  const handleSaveMemo = async ({ title, content, _id }) => {
    if (!selectedFileId) {
      setError("Please select a document to save a memo.");
      setShowConfirmModal(true);
      setConfirmModalData({
        title: 'Memo Error',
        message: 'Please select a document to save a memo.',
        onConfirm: () => setShowConfirmModal(false),
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');

      const memoData = {
        title,
        content,
        fileId: selectedFileId,
        fileName: selectedFileName,
        text: memoToEdit?.text ?? currentMemoSelectionInfo.text ?? '',
        startIndex: memoToEdit?.startIndex ?? currentMemoSelectionInfo.startIndex ?? -1,
        endIndex: memoToEdit?.endIndex ?? currentMemoSelectionInfo.endIndex ?? -1,
        author: localStorage.getItem('username'),
        authorId: localStorage.getItem('userId'),
      };

      if (_id) {
        await axios.put(
          `http://localhost:5000/api/projects/${projectId}/memos/${_id}`,
          memoData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          `http://localhost:5000/api/projects/${projectId}/memos`,
          memoData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      fetchProject();
      setShowMemoModal(false);
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


  // NEW: handleDeleteMemo function
  const handleDeleteMemo = (memoId, memoTitle) => {
    setConfirmModalData({
      title: 'Confirm Memo Deletion',
      message: `Are you sure you want to delete the memo "${memoTitle}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
          await axios.delete(`http://localhost:5000/api/projects/${projectId}/memos/${memoId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          fetchProject();
          setShowConfirmModal(false);
          setActiveMemoId(null); // Clear active memo if deleted
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
          await axios.delete(`http://localhost:5000/api/projects/${projectId}/files/${fileId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          fetchProject();
          setShowConfirmModal(false);
          if (selectedFileId === fileId) {
            setSelectedContent('');
            setSelectedFileName('');
            setSelectedFileId(null);
            setCodedSegments([]);
            setInlineHighlights([]);
            setMemos([]); // NEW: Clear memos on file delete
          }
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
          await axios.delete(`http://localhost:5000/api/projects/${projectId}/code-definitions/${codeDefId}`, {
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
          await axios.delete(`http://localhost:5000/api/projects/${projectId}/code/${segmentId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          fetchProject();
          setShowConfirmModal(false);
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to delete coded segment');
          setShowConfirmModal(false);
        }
      },
    });
    setShowConfirmModal(true);
  };

  const handleExportToExcel = async () => {
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
        `http://localhost:5000/api/projects/${projectId}/export-coded-segments`,
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
      message: 'Please select a file to export its memos.',
      onConfirm: () => setShowConfirmModal(false),
      showCancelButton: false,
    });
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(
      `http://localhost:5000/api/projects/${projectId}/export-memos`,
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
      title: 'Export Failed',
      message: err.response?.data?.error || 'Failed to export memos.',
      onConfirm: () => setShowConfirmModal(false),
    });
  }
};

  const groupedCodedSegments = useMemo(() => {
    const groups = {};
    codedSegments.forEach(segment => {
      const codeName = segment.codeDefinition?.name || 'Uncategorized';
      const codeColor = segment.codeDefinition?.color || '#cccccc';
      if (!groups[codeName]) {
        groups[codeName] = {
          color: codeColor,
          segments: []
        };
      }
      groups[codeName].segments.push(segment);
    });
    return Object.keys(groups).sort().map(codeName => ({
      name: codeName,
      color: groups[codeName].color,
      segments: groups[codeName].segments
    }));
  }, [codedSegments]);

  // NEW: Grouped memos for display in the sidebar
  const groupedMemos = useMemo(() => {
    // Memos don't have code definitions, so we'll group them by file or just list them.
    // For simplicity, let's just list them and indicate if they are document-level or segment-level.
    // If you want to group them by title or a custom category, you'd adjust this.
    return memos.map(memo => ({
      ...memo,
      displayTitle: memo.title || (memo.text ? `Memo on "${memo.text.substring(0, 30)}..."` : 'Document Memo'),
      isSegmentMemo: memo.startIndex !== -1 && memo.endIndex !== -1,
    })).sort((a,b) => a.startIndex - b.startIndex);
  }, [memos]);


  const renderViewerToolbar = () => (
    <div id="viewer-toolbar" className="flex justify-between items-center bg-white dark:bg-gray-800 p-2 rounded-t-lg border-b border-gray-200 dark:border-gray-700">
      <h3 className="text-md font-semibold text-[#1D3C87] dark:text-[#F05623] ml-4">Document Viewer</h3>
      <div className="flex gap-2 items-center">

        {/* Search Bar for Viewer */}
        <div className="relative flex items-center">
            <input
                type="text"
                ref={viewerSearchInputRef}
                placeholder="Search..."
                value={viewerSearchQuery}
                onChange={handleViewerSearchChange}
                className="w-64 pl-8 pr-28 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1D3C87] dark:focus:ring-[#F05623] text-sm"
            />
            <FaSearch className="absolute left-2 text-gray-400 dark:text-gray-500" />
            {viewerSearchQuery && (
                <div className="absolute right-0 flex items-center h-full pr-4 gap-1">
                    <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {viewerSearchMatches.length > 0 ?
                         `${currentMatchIndex + 1}/${viewerSearchMatches.length}` :
                         '0/0'
                        }
                    </span>
                    <div className="flex">
                        <button
                            onClick={goToPrevMatch}
                            disabled={viewerSearchMatches.length === 0}
                            className={`p-1 rounded-sm text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 ${viewerSearchMatches.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title="Previous match"
                        >
                            <FaChevronUp size={12} />
                        </button>
                        <button
                            onClick={goToNextMatch}
                            disabled={viewerSearchMatches.length === 0}
                            className={`p-1 rounded-sm text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 ${viewerSearchMatches.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title="Next match"
                        >
                            <FaChevronDown size={12} />
                        </button>
                    </div>
                    <button
                        onClick={handleClearViewerSearch}
                        className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                        title="Clear search"
                    >
                        <FaTimes />
                    </button>
                </div>
            )}
        </div>

        {/* Code Button with Dropdown */}
        <div className="relative flex rounded-md shadow-sm">
          <button
            onClick={() => {
              const nextActiveTool = activeTool === 'code' ? null : 'code';
              setActiveTool(nextActiveTool);
              setShowHighlightColorDropdown(false);
              setShowCodeDropdown(false);
              // Ensure memo modal is closed when switching to code tool
              setShowMemoModal(false);

              if (nextActiveTool === 'code' && getSelectionInfo()) {
                handleCodeSelectionAction();
              }
            }}
            className={`px-3 py-2 rounded-l-md flex items-center transition-all duration-200 ${
              activeTool === 'code' ? 'bg-gray-300 dark:bg-gray-700' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title="Code Text"
          >
            {showCodeColors ? (
              <MdCode className="text-lg" style={{ color: '#FFFFFF' }} />
            ) : (
              <MdCodeOff className="text-lg" style={{ color: '#FFFFFF' }} />
            )}
          </button>
          <button
            onClick={() => {
              setShowCodeDropdown(!showCodeDropdown);
              if (!showCodeDropdown) {
                setShowHighlightColorDropdown(false);
                setShowAssignCodeModal(false);
              }
            }}
            className="p-2 pl-1 rounded-r-md border-l border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Code Display Options"
          >
            <FaCaretDown className="text-gray-600 dark:text-gray-300" />
          </button>
          <AnimatePresence>
            {showCodeDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 mt-12 w-32 bg-white dark:bg-gray-700 rounded-lg shadow-lg p-2 z-50 code-dropdown-menu"
              >
                <button
                  onClick={() => {
                    setShowCodeColors(true);
                    setShowCodeDropdown(false);
                    setActiveCodedSegmentId(null);
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-xs ${showCodeColors ? 'bg-gray-200 dark:bg-gray-600' : 'hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                  title="Enable Colored Codes"
                >
                  <MdCode size={18} />
                  <span className="truncate">Show Codes</span>
                </button>
                <button
                  onClick={() => {
                    setShowCodeColors(false);
                    setShowCodeDropdown(false);
                    setActiveCodedSegmentId(null);
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-xs ${!showCodeColors ? 'bg-gray-200 dark:bg-gray-600' : 'hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                  title="Disable Colored Codes"
                >
                  <MdCodeOff size={18} />
                  <span className="truncate">Hide Codes</span>
                </button>

              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* NEW: Memo Tool Button */}
        <div className="relative flex rounded-md shadow-sm">
          <button
            onClick={() => {
              const nextActiveTool = activeTool === 'memo' ? null : 'memo';
              setActiveTool(nextActiveTool);
              setShowHighlightColorDropdown(false);
              setShowAssignCodeModal(false);
              setShowCodeDropdown(false);
              setShowMemoModal(false); // Close modal if tool is toggled off

              // Only open modal if text is selected
              if (nextActiveTool === 'memo') {
                const selection = getSelectionInfo();
                if (selection) {
                  handleMemoSelectionAction();
                }
              }
            }}

            className={`px-3 py-2 rounded-md flex items-center transition-all duration-200 ${
              activeTool === 'memo' ? 'bg-gray-300 dark:bg-gray-700' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title="Create/View Memos"
          >
            <FaStickyNote className="text-lg" style={{ color: '#FFE135' }} /> {/* Example color */}
          </button>
        </div>


        {/* Highlight Button with Dropdown */}
        <div className="relative flex rounded-md shadow-sm">
          <button
            onClick={() => {
              const nextActiveTool = activeTool === 'highlight' ? null : 'highlight';
              setActiveTool(nextActiveTool);
              setShowAssignCodeModal(false);
              setShowCodeDropdown(false);
              setShowMemoModal(false); // Close memo modal

              if (nextActiveTool === 'highlight' && getSelectionInfo()) {
                handleHighlightSelectionAction();
              }
            }}
            className={`p-2 pr-1 rounded-l-md flex items-center transition-all duration-200 ${
              activeTool === 'highlight' ? 'bg-gray-300 dark:bg-gray-700' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title="Highlight Text"
          >
            <FaHighlighter className="text-lg mr-1" style={{ color: selectedHighlightColor }} />
          </button>
          <button
            onClick={() => {
              setShowHighlightColorDropdown(!showHighlightColorDropdown);
              if (!showHighlightColorDropdown) {
                setShowAssignCodeModal(false);
                setShowCodeDropdown(false);
                setShowMemoModal(false); // Close memo modal
              }
            }}
            className="p-2 pl-1 rounded-r-md border-l border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Select Highlight Color"
          >
            <FaCaretDown className="text-gray-600 dark:text-gray-300" />
          </button>
          <AnimatePresence>
            {showHighlightColorDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 mt-12 w-32 bg-white dark:bg-gray-700 rounded-lg shadow-lg p-2 z-50 color-dropdown-menu"
              >
                <div className="grid grid-cols-4 gap-2">
                  {highlightColors.map((colorOption) => (
                    <button
                      key={colorOption.name}
                      onClick={() => {
                        setSelectedHighlightColor(colorOption.value);
                        setShowHighlightColorDropdown(false);
                        setActiveTool('highlight');
                      }}
                      className={`w-6 h-6 rounded-full border-2 transition-all duration-200 ease-in-out ${colorOption.cssClass} ${
                        selectedHighlightColor === colorOption.value ? 'border-gray-800 dark:border-white' : 'border-transparent'
                      }`}
                      title={colorOption.name}
                    ></button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Erase Tool Button */}
        <div className="relative flex rounded-md shadow-sm">
          <button
              onClick={() => {
                setActiveTool(activeTool === 'erase' ? null : 'erase');
                setShowHighlightColorDropdown(false);
                setShowAssignCodeModal(false);
                setShowCodeDropdown(false);
                setShowMemoModal(false); // Close memo modal
              }}
              className={`px-3 py-2 rounded-md flex items-center transition-all duration-200 ${
                activeTool === 'erase' ? 'bg-gray-300 dark:bg-gray-700' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              title="Erase Highlights"
            >
              <FaEraser className="text-lg" style={{ color: '#FFFFFF' }} />
            </button>
          </div>
      </div>
    </div>
  );

  if (loading) return <div className="text-center mt-10 text-gray-500">Loading...</div>;
  if (error) return <div className="text-center mt-10 text-red-600">{error}</div>;

return (
  <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-white">
    <Navbar
      projectName={project?.name}
      projectID={projectId}
    />
    {/* Main content area, ensure it takes full height minus navbar */}
    <div className="px-3 pt-20 h-[calc(100vh-theme(space.5))]"> {/* Added height for main content area */}
      <div className="flex gap-3 h-full"> {/* Ensures this flex container takes full height */}
        <motion.div
          initial={{ width: '250px' }}
          animate={{ width: isLeftPanelCollapsed ? '48px' : '250px' }}
          transition={{ duration: 0.3 }}
          className="relative bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden flex flex-col h-full" // Added flex flex-col and h-full
          style={{ minWidth: isLeftPanelCollapsed ? '48px' : '250px' }}
        >
          {/* Fixed Header Section for Left Panel */}
          <div className="flex-shrink-0 px-4 py-8 relative bg-white dark:bg-gray-800 z-20"> {/* Fixed header for search bar and button */}
            <button
              onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
              className={`absolute top-1/2 -translate-y-1/2 p-2 rounded-full shadow-lg z-10
                          text-gray-600 dark:text-gray-300
                          hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200
                          ${isLeftPanelCollapsed ? 'right-2' : 'right-4'}`}
              title={isLeftPanelCollapsed ? "Expand Panel" : "Collapse Panel"}
            >
              {isLeftPanelCollapsed ? <FaAnglesRight /> : <FaAnglesLeft />}
            </button>

            {!isLeftPanelCollapsed && (
              <div className="relative flex items-center pr-10"> {/* pr-10 for button space */}
                <input
                  type="text"
                  ref={searchInputRef}
                  placeholder="Search Files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-8 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1D3C87] dark:focus:ring-[#F05623] text-sm"
                />
                <FaSearch className="absolute left-2 text-gray-400 dark:text-gray-500" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                    title="Clear search"
                  >
                    <FaTimes />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Scrollable Content Area for Left Panel */}
          <motion.div
            ref={leftPanelRef}
            initial={{ opacity: 1 }}
            animate={{ opacity: isLeftPanelCollapsed ? 0 : 1 }}
            transition={{ duration: 0.2 }}
            className="flex-1 pb-4 px-4 overflow-y-auto"
          >
            {!isLeftPanelCollapsed && (
              <>
                <div className="mb-6">
                  <div
                    className="flex justify-between items-center mb-3 cursor-pointer"
                    onClick={() => setShowImportedFiles(!showImportedFiles)}
                  >
                    <h3 className="text-lg font-semibold text-[#1D3C87] dark:text-[#F05623] flex items-center gap-3">
                      Imported Files
                      <label
                        htmlFor="importFileSidebar"
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer text-base"
                        title="Import File"
                      >
                        <CgImport className="text-xl" />
                        <input
                          id="importFileSidebar"
                          type="file"
                          accept=".txt,.docx"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </h3>
                    {showImportedFiles ? <FaCaretDown /> : <FaCaretRight />}
                  </div>
                  <AnimatePresence>
                    {showImportedFiles && (
                      <motion.ul
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-2 overflow-hidden"
                      >
                        {project?.importedFiles && project.importedFiles.length > 0 ? (
                          project.importedFiles
                            .filter(file => file.name.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map((file) => (
                              <li
                                key={file._id}
                                onClick={() => handleSelectFile(file)}
                                className={`cursor-pointer flex justify-between items-center py-1 px-2 rounded-md transition duration-200 ease-in-out
                                  ${file._id === selectedFileId
                                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold border border-gray-300 dark:border-gray-600'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                  }`}
                                title={file.name}
                              >
                                <span className="whitespace-nowrap overflow-hidden text-ellipsis mr-2">{file.name}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteFile(file._id, file.name);
                                  }}
                                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-600 p-1 rounded-full"
                                  title="Delete File"
                                >
                                  <FaTrashAlt size={12} />
                                </button>
                              </li>
                            ))
                        ) : (
                          <li className="text-sm text-gray-500">No files imported yet</li>
                        )}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>

                <div className="mb-6">
                  <div
                    className="flex justify-between items-center mb-2 cursor-pointer"
                    onClick={() => setShowCodeDefinitions(!showCodeDefinitions)}
                  >
                    <h4 className="text-lg font-semibold text-[#1D3C87] dark:text-[#F05623] flex items-center gap-3">
                      Code Definitions
                      <FaPlus
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!selectedFileId) {
                            setError("Please select a document before defining codes.");
                            setShowConfirmModal(true);
                            setConfirmModalData({
                                title: 'Define Code Error',
                                message: 'Please select a document to define a code.',
                                onConfirm: () => setShowConfirmModal(false),
                            });
                            return;
                          }
                          setCodeDefinitionToEdit(null);
                          setShowDefineCodeModal(true);
                        }}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer text-base"
                        title="Define New Code"
                      />
                      </h4>
                    {showCodeDefinitions ? <FaCaretDown /> : <FaCaretRight />}
                  </div>
                  <AnimatePresence>
                    {showCodeDefinitions && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <ul className="text-xs space-y-1 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 p-2 rounded mb-2">
                          {codeDefinitions.length > 0 ? (
                            codeDefinitions.map((codeDef) => (
                              <li
                                key={codeDef._id}
                                className="p-1 rounded text-gray-800 dark:text-white flex justify-between items-center group"
                                style={{ backgroundColor: codeDef.color + '33' }}
                              >
                                <span className="font-medium truncate">{codeDef.name}</span>
                                <div className="flex gap-1 items-center">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCodeDefinitionToEdit(codeDef);
                                      setShowDefineCodeModal(true);
                                    }}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-full opacity-50 group-hover:opacity-100 transition-opacity"
                                    title="Edit Code Definition"
                                  >
                                    <FaEdit size={12}/>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteCodeDefinition(codeDef._id, codeDef.name);
                                    }}
                                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-600 p-1 rounded-full opacity-50 group-hover:opacity-100 transition-opacity"
                                    title="Delete Code Definition"
                                  >
                                    <FaTrashAlt size={12} />
                                  </button>
                                </div>
                              </li>
                            ))
                          ) : (
                            <li className="text-xs text-gray-500">No codes defined yet for this project.</li>
                          )}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="mb-6">
                  <div
                className="flex justify-between items-center mb-2 cursor-pointer"
                onClick={() => setShowCodedSegments(!showCodedSegments)}
              >
                <h4 className="text-lg font-semibold text-[#1D3C87] dark:text-[#F05623] flex items-center gap-3">
                  Coded Segments
                  <CgExport
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExportToExcel();
                    }}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer text-base"
                    title="Export Coded Segments"
                  />
                </h4>
                {showCodedSegments ? <FaCaretDown /> : <FaCaretRight />}
              </div>
                  <AnimatePresence>
                    {showCodedSegments && (
                      <motion.ul
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-xs space-y-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 p-2 rounded"
                      >
                        {groupedCodedSegments.length > 0 ? (
                          groupedCodedSegments.map((group) => (
                            <li key={group.name} className="p-1 rounded mb-1">
                              <div
                                className="font-semibold px-2 py-1 rounded flex justify-between items-center cursor-pointer"
                                style={{ backgroundColor: group.color + '66' }}
                                onClick={() => toggleCodeGroup(group.name)}
                              >
                                <span className="text-gray-800 dark:text-white">{group.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-2 py-0.5 rounded-full text-xs">
                                    {group.segments.length}
                                  </span>
                                  {expandedCodes[group.name] ? (
                                    <FaCaretDown className="text-gray-600 dark:text-gray-300" />
                                  ) : (
                                    <FaCaretRight className="text-gray-600 dark:text-gray-300" />
                                  )}
                                </div>
                              </div>
                              <AnimatePresence>
                                {expandedCodes[group.name] && (
                                  <motion.ul
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="pl-4 mt-1 space-y-1 overflow-hidden"
                                  >
                                    {group.segments.map((seg) => (
                                      <li
                                        key={seg._id}
                                        className="p-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white flex justify-between items-center group cursor-pointer"
                                        onClick={() => {
                                          setActiveCodedSegmentId(seg._id);
                                          setAnnotationToScrollToId(seg._id);
                                        }}
                                      >
                                        <span className="truncate">{`"${seg.text.substring(0, Math.min(seg.text.length, 40))}..."`}</span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteCodedSegment(seg._id, seg.codeDefinition?.name || 'this segment');
                                          }}
                                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-600 p-1 rounded-full opacity-50 group-hover:opacity-100 transition-opacity"
                                          title="Delete Coded Segment"
                                        >
                                          <FaTrashAlt size={10} />
                                        </button>
                                      </li>
                                    ))}
                                  </motion.ul>
                                )}
                              </AnimatePresence>
                            </li>
                          ))
                        ) : (
                          <li className="text-xs text-gray-500">No codes yet for this file.</li>
                        )}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>

                {/* NEW: Memos Section */}
                <div className="mb-6">
                    <div
                    className="flex justify-between items-center mb-2 cursor-pointer"
                    onClick={() => setShowMemosPanel(!showMemosPanel)}
                  >
                    <h4 className="text-lg font-semibold text-[#1D3C87] dark:text-[#F05623] flex items-center gap-3">
                      Memos
                      <CgExport
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent dropdown toggle
                          if (!selectedFileId) {
                            setError("Please select a document to export its memos.");
                            setShowConfirmModal(true);
                            setConfirmModalData({
                              title: 'Export Error',
                              message: 'Please select a document to export its memos.',
                              onConfirm: () => setShowConfirmModal(false),
                              showCancelButton: false,
                            });
                            return;
                          }
                          handleExportMemos(); // Export function
                        }}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer text-base"
                        title="Export Memos"
                      />
                    </h4>
                    {showMemosPanel ? <FaCaretDown /> : <FaCaretRight />}
                  </div>
                  <AnimatePresence>
                    {showMemosPanel && (
                      <motion.ul
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-xs space-y-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 p-2 rounded"
                      >
                        {groupedMemos.length > 0 ? (
                          groupedMemos.map((memo) => (
                            <li
                              key={memo._id}
                              className="p-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white flex justify-between items-center group cursor-pointer"
                              onClick={() => {
                                setActiveMemoId(memo._id);
                                setAnnotationToScrollToId(memo._id);
                                setMemoToEdit(memo); // Set memo to edit when clicked
                                setShowMemoModal(true); // Open memo modal
                              }}
                            >
                              <span className="truncate font-medium">
                                {memo.displayTitle}
                                {memo.isSegmentMemo && <span className="ml-1 text-gray-500"></span>}
                              </span>
                              <div className="flex gap-1 items-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMemoToEdit(memo);
                                    setShowMemoModal(true);
                                  }}
                                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-full opacity-50 group-hover:opacity-100 transition-opacity"
                                  title="Edit Memo"
                                >
                                  <FaEdit size={12}/>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteMemo(memo._id, memo.title || 'this memo');
                                  }}
                                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-600 p-1 rounded-full opacity-50 group-hover:opacity-100 transition-opacity"
                                  title="Delete Memo"
                                >
                                  <FaTrashAlt size={10} />
                                </button>
                              </div>
                            </li>
                          ))
                        ) : (
                          <li className="text-xs text-gray-500">No memos yet for this file.</li>
                        )}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>

              </>
            )}
          </motion.div>
        </motion.div>

        {/* Right Panel (Document Viewer) */}
        <div className={`flex flex-col rounded-xl shadow-md overflow-hidden ${isLeftPanelCollapsed ? 'flex-1' : 'flex-1'}`}>
          {renderViewerToolbar()}
          <div
            ref={viewerRef}
            className="bg-white dark:bg-gray-800 p-6 overflow-y-auto flex-1"
            onMouseUp={handleViewerMouseUp}
          >
            <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-200 select-text">
              {renderContentWithHighlights()}
            </pre>
          </div>
        </div>
      </div>
    </div>

    <DefineCodeModal
      show={showDefineCodeModal}
      onClose={handleDefineCodeModalClose}
      onSave={handleSaveCodeDefinition}
      initialCode={codeDefinitionToEdit}
      onBackendError={handleDefineModalErrorSetter}
    />
    <AssignCodeModal
      show={showAssignCodeModal}
      onClose={() => setShowAssignCodeModal(false)}
      onAssignCode={handleAssignCode}
      codeDefinitions={codeDefinitions}
      onDefineNewCode={() => {
        if (!selectedFileId) {
          setError("Please select a document before defining codes.");
          setShowConfirmModal(true);
          setConfirmModalData({
              title: 'Define Code Error',
              message: 'Please select a document to define a code.',
              onConfirm: () => setShowConfirmModal(false),
          });
          return;
        }
        setShowDefineCodeModal(true);
        setCodeDefinitionToEdit(null);
        setShowAssignCodeModal(false);
      }}
    />
    {/* NEW: MemoModal */}
    <MemoModal
      show={showMemoModal}
      onClose={() => {
        setShowMemoModal(false);
        setMemoToEdit(null); // Clear memo being edited on close
        window.getSelection().removeAllRanges(); // Clear selection when modal closes
      }}
      onSave={handleSaveMemo}
      initialMemo={memoToEdit}
      selectionInfo={currentMemoSelectionInfo}
      onDelete={handleDeleteMemo}
    />
    <ConfirmationModal
      show={showConfirmModal}
      onClose={() => setShowConfirmModal(false)}
      onConfirm={confirmModalData.onConfirm}
      title={confirmModalData.title}
      message={confirmModalData.message}
    />
  </div>
);
};

export default ProjectView;
