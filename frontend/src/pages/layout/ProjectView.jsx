import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Navbar from '../layout/Navbar.jsx';
import ConfirmationModal from '../components/ConfirmationModal.jsx';
import DefineCodeModal from '../code/DefineCodeModal.jsx';
import FloatingToolbar from '../layout/FloatingToolbar.jsx';
import FloatingAssignCode from '../code/FloatingAssignCode.jsx';
import FloatingMemoInput from '../memo/FloatingMemoInput.jsx';
import CodedSegmentsTableModal from '../table/CodedSegmentsTableModal.jsx';
import LeftPanel from '../layout/LeftPanel.jsx';
import DocumentViewer from '../layout/DocumentViewer.jsx';
import ImportOptionsModal from './ImportOptionsModal.jsx';
import useProjectViewHooks from '../hooks/useProjectViewHooks.js';
import AudioPlayer from '../layout/AudioPlayer.jsx';
import EditToolbar from '../layout/edit-mode/EditToolbar.jsx';
import CodeDetailsModal from '../code/CodeDetailsModal.jsx';
import PreferencesModal from './PreferencesModal.jsx';
import SplitMergeCodesModal from '../code/SplitMergeCodesModal.jsx';
import SplitReviewModal from '../code/SplitReviewModal.jsx';
import axios from 'axios';
import FileSaver from 'file-saver';
import { useAuth } from '../auth/AuthContext.jsx';
import ApiKeyModal from '../components/ApiKeyModal.jsx';
import tabManager from './edit-mode/EditModeTabManager.js';
import { FaLock, FaPen, FaExclamationTriangle } from 'react-icons/fa';
import TextEditor from './edit-mode/TextEditor.jsx';

/** @constant {number} MIN_WIDTH - The minimum width for the resizable left panel. */
const MIN_WIDTH = 200;
/** @constant {number} MAX_WIDTH - The maximum width for the resizable left panel. */
const MAX_WIDTH = 500;
/** @constant {number} DEFAULT_WIDTH - The default width for the left panel. */
const DEFAULT_WIDTH = 250;
/** @constant {number} COLLAPSED_WIDTH - The width of the left panel when it is collapsed. */
const COLLAPSED_WIDTH = 40;
/** @constant {number} COLLAPSE_THRESHOLD - The width threshold below which the panel automatically collapses. */
const COLLAPSE_THRESHOLD = 120;

const ProjectView = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [fileInEditMode, setFileInEditMode] = useState(null);
  const [editedContent, setEditedContent] = useState('');
  const [committedFileId, setCommittedFileId] = useState(null);

  const isEditing = !!fileInEditMode;
  const [showFormattingTip, setShowFormattingTip] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  const [showFind, setShowFind] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [findMatches, setFindMatches] = useState([]);
  const [currentFindIndex, setCurrentFindIndex] = useState(-1);

  const [history, setHistory] = useState({
    undoStack: [],
    redoStack: [],
  });

  const [showCodeTooltip, setShowCodeTooltip] = useState(() => {
    const savedPreference = localStorage.getItem('showCodeTooltip');
    return savedPreference !== 'false';
  });

  const {
    projectName, project, fetchProject, projectId, error, loading, transcriptionStatus,
    handleAudioImport, handleTextImport, handleCommitNewFile, handleUpdateFileContent, selectedContent,
    selectedFileId, selectedFileAudioUrl, showImportedFiles, setShowImportedFiles,
    handleFileChange, handleSelectFile, handleSelectFileCore, handleDeleteFile, handleRenameFile, handlePinFile,
    pinnedFiles, handleExportFile, codeDefinitions, showCodeDefinitions, setShowCodeDefinitions,
    showDefineCodeModal, setShowDefineCodeModal, codeDefinitionToEdit, setCodeDefinitionToEdit,
    handleSaveCodeDefinition, handleDefineCodeModalClose, handleDeleteCodeDefinition,
    handleDefineModalErrorSetter, codedSegments, inlineHighlights, groupedCodedSegments, expandedCodes,
    toggleCodeGroup, showCodedSegments, setShowCodedSegments, showCodedSegmentsTableModal,
    setShowCodedSegmentsTableModal, activeCodedSegmentId, setActiveCodedSegmentId,
    handleAssignCode, handleReassignCodeClick, setSegmentToReassign, handleDeleteCodedSegment,
    handleExportFileCodedSegments, handleExportOverlaps, memos, groupedMemos, showMemosPanel,
    setShowMemosPanel, memoToEdit, setMemoToEdit,
    currentMemoSelectionInfo, activeMemoId, setActiveMemoId, handleSaveMemo,
    handleDeleteMemo, handleExportMemos, viewerRef, viewerSearchQuery,
    viewerSearchInputRef, viewerSearchMatches, currentMatchIndex, handleViewerSearchChange,
    handleClearViewerSearch, goToNextMatch, goToPrevMatch, annotationToScrollToId,
    setAnnotationToScrollToId, currentSelectionInfo, createRangeFromOffsets,
    getSelectionInfo, handleViewerMouseUp, showFloatingToolbar, setShowFloatingToolbar,
    floatingToolbarPosition, handleCodeSelectionAction, handleHighlightSelectionAction,
    handleMemoSelectionAction, showFloatingAssignCode, setShowFloatingAssignCode,
    floatingAssignCodePosition, setFloatingAssignCodePosition, showFloatingMemoInput,
    setShowFloatingMemoInput, floatingMemoInputPosition, activeTool, setActiveTool,
    highlightColors, selectedHighlightColor, setSelectedHighlightColor, showHighlightColorDropdown,
    setShowHighlightColorDropdown, showCodeColors, setShowCodeColors, showCodeDropdown,
    setShowCodeDropdown, showConfirmModal, setShowConfirmModal, confirmModalData,
    setConfirmModalData, searchQuery, setSearchQuery, searchInputRef, handleMergeCodes,
    handleSplitCodes, undo, redo, canUndo, canRedo, handleCreateMemoForSegment,
    handleLockFile, handleViewerMouseDown, isSelectingRef, smartSelectionEnabled, handleToggleSmartSelection,
    setFloatingMemoInputPosition
  } = useProjectViewHooks({ 
    onImportSuccess: enterEditMode, 
    setFileInEditMode: setFileInEditMode, 
    isInEditMode: isEditing,
    enterEditMode: enterEditMode,
    onRequestApiKey: () => {
        setShowImportOptionsModal(false);
        setShowApiKeyModal(true);
    }});

  const [showSplitMergeModal, setShowSplitMergeModal] = useState(false);
  const [splitReviewData, setSplitReviewData] = useState({
    show: false, sourceCode: null, segmentsToReview: [], newCodes: [],
  });

  const [showImportOptionsModal, setShowImportOptionsModal] = useState(false);
  const [importModalStep, setImportModalStep] = useState('initial');
  const [showProjectOverviewModal, setShowProjectOverviewModal] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [codeDefinitionToView, setCodeDefinitionToView] = useState(null);
  const [showCodeDetailsModal, setShowCodeDetailsModal] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [lineHeight, setLineHeight] = useState(1.5);
  const [showLineHeightDropdown, setShowLineHeightDropdown] = useState(false);
  const audioPlayerRef = useRef(null);
  const textareaRef = useRef(null);

  // Helper to get the actual file object based on the selected ID
  const currentFile = project?.importedFiles?.find(f => f._id === selectedFileId);
  const activeFile = fileInEditMode || currentFile;
  const isCurrentFileLocked = activeFile?.isLocked === true;

  const handleSidebarFileClick = (file) => {
    if (isEditing && editedContent !== fileInEditMode?.content) {
      setConfirmModalData({
        title: 'Discard Changes?',
        shortMessage: 'You are in Edit Mode. Unsaved changes will be lost. Are you sure you want to switch files?',
        confirmText: 'Yes, Switch File',
        showCancelButton: true,
        onConfirm: () => {
          setShowConfirmModal(false);
          switchFileAndReset(file);
        }
      });
      setShowConfirmModal(true);
      return;
    }
    switchFileAndReset(file);
  };

  const switchFileAndReset = (file) => {
    handleSelectFileCore(file); 
    setFileInEditMode(null);    
    setCommittedFileId(null);   
    setHistory({ undoStack: [], redoStack: [] }); 
  };

  useEffect(() => {
    if (project?.importedFiles?.length > 0 && !selectedFileId) {
      const firstLockedFile = project.importedFiles.find(f => f.isLocked);
      if (firstLockedFile) {
        handleSelectFileCore(firstLockedFile);
      }
    }
  }, [project, selectedFileId, handleSelectFileCore]);

  useEffect(() => {
    tabManager.initialize((conflictFileId) => {
      setConfirmModalData({
        title: 'File Already Open',
        shortMessage: 'This file is already open in edit mode in another tab. You cannot edit the same file in multiple tabs simultaneously.',
        confirmText: 'OK',
        showCancelButton: false,
        onConfirm: () => setShowConfirmModal(false),
      });
      setShowConfirmModal(true);

      if (fileInEditMode && fileInEditMode._id === conflictFileId) {
        setFileInEditMode(null);
        setLeftPanelWidth(DEFAULT_WIDTH);
      }
    });

    if (fileInEditMode && fileInEditMode._id && fileInEditMode._id !== 'staged-file') {
      tabManager.claimFile(fileInEditMode._id);
    }

    return () => {
      tabManager.destroy();
    };
  }, [fileInEditMode?._id]);

  const handleContentUpdate = (newContent) => {
    if (newContent === editedContent) return;
    setHistory(prev => ({
      undoStack: [...prev.undoStack, editedContent],
      redoStack: [],
    }));
    setEditedContent(newContent);
  };

  const escapeRegExp = (string) => {
    if (!string) return '';
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  useEffect(() => {
    const currentToolActive = showFind || showFindReplace;
    if (!isEditing || !currentToolActive || !findQuery) {
      setFindMatches([]);
      setCurrentFindIndex(-1);
      return;
    }
    try {
      const escapedQuery = escapeRegExp(findQuery);
      const regex = new RegExp(escapedQuery, 'gi');
      const matches = Array.from(editedContent.matchAll(regex)).map(match => ({
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      }));
      setFindMatches(matches);
      setCurrentFindIndex(matches.length > 0 ? 0 : -1);
    } catch (error) {
      console.error("Error creating RegExp:", error);
      setFindMatches([]);
      setCurrentFindIndex(-1);
    }
  }, [findQuery, editedContent, showFind, showFindReplace, isEditing]);

  useEffect(() => {
    const currentToolActive = showFind || showFindReplace;
    if (!isEditing || !currentToolActive || findMatches.length === 0 || currentFindIndex < 0) return;
    const match = findMatches[currentFindIndex];
    const textarea = textareaRef?.current;
    
    if (textarea) {
        if (document.activeElement.tagName !== 'INPUT') {
            textarea.focus();
        }
        textarea.setSelectionRange(match.startIndex, match.endIndex);
        const textBefore = textarea.value.substring(0, match.startIndex);
        const lines = textBefore.split('\n').length;
        const avgLineHeight = textarea.scrollHeight / textarea.value.split('\n').length;
        const newScrollTop = (lines * avgLineHeight) - (textarea.clientHeight / 2);
        textarea.scrollTop = Math.max(0, newScrollTop);
    }
  }, [currentFindIndex, findMatches, isEditing, showFind, showFindReplace]);

  const handleCloseImportModal = () => {
    setShowImportOptionsModal(false);
    setImportModalStep('initial'); // reset ONLY on close
  };

  const handleToggleFind = () => {
    setShowFind(prev => !prev);
    if (showFindReplace) {
      setShowFindReplace(false);
    }
  };

  const handleToggleFindReplace = () => {
    setShowFindReplace(prev => !prev);
    if (showFind) {
      setShowFind(false);
    }
  };

  const handleFindNext = () => {
    if (findMatches.length > 0) {
      setCurrentFindIndex(prev => (prev + 1) % findMatches.length);
    }
  };

  const handleFindPrev = () => {
    if (findMatches.length > 0) {
      setCurrentFindIndex(prev => (prev - 1 + findMatches.length) % findMatches.length);
    }
  };

  const handleReplaceOne = () => {
    if (findMatches.length === 0 || currentFindIndex < 0) return;
    const match = findMatches[currentFindIndex];
    const newContent =
      editedContent.substring(0, match.startIndex) +
      replaceQuery +
      editedContent.substring(match.endIndex);
    handleContentUpdate(newContent);
  };

  const handleReplaceAll = () => {
    if (!findQuery || findMatches.length === 0) return;
    const escapedQuery = escapeRegExp(findQuery);
    const regex = new RegExp(escapedQuery, 'gi');
    const newContent = editedContent.replace(regex, replaceQuery);
    handleContentUpdate(newContent);
  };

  const handleEditorUndo = useCallback(() => {
    if (history.undoStack.length === 0) return;
    const lastState = history.undoStack[history.undoStack.length - 1];
    setHistory(prev => ({
      undoStack: prev.undoStack.slice(0, -1),
      redoStack: [...prev.redoStack, editedContent],
    }));
    setEditedContent(lastState);
  }, [history.undoStack, editedContent]);

  const handleEditorRedo = useCallback(() => {
    if (history.redoStack.length === 0) return;
    const nextState = history.redoStack[history.redoStack.length - 1];
    setHistory(prev => ({
      undoStack: [...prev.undoStack, editedContent],
      redoStack: prev.redoStack.slice(0, -1),
    }));
    setEditedContent(nextState);
  }, [history.redoStack, editedContent]);

  const executeLogout = () => {
    logout();
    navigate('/');
  };

  const handleNavigationAttempt = (path, options) => {
    const isUnsavedNewFile = fileInEditMode?.isStaged;
    const hasContentChanges = editedContent !== fileInEditMode?.content;

    // Safe to navigate if: Not editing OR (No text changes AND Not a staged file)
    if (!isEditing || (!hasContentChanges && !isUnsavedNewFile)) {
      navigate(path, options);
      return;
    }
    setConfirmModalData({
      title: 'Discard Changes?',
      shortMessage: 'You are in Edit Mode. Unsaved changes will be lost. Are you sure you want to leave this page?',
      confirmText: 'Yes, Leave Page',
      showCancelButton: true,
      onConfirm: () => {
        setShowConfirmModal(false);
        navigate(path, options);
      },
    });
    setShowConfirmModal(true);
  };

  useEffect(() => {
    const handlePopState = (event) => {
      const isUnsavedNewFile = fileInEditMode?.isStaged;
      const hasContentChanges = editedContent !== fileInEditMode?.content;

      // Trigger if editing AND (content changed OR it's a new staged file)
      if (isEditing && (hasContentChanges || isUnsavedNewFile)) {
        window.history.pushState(null, '', window.location.pathname);
        setConfirmModalData({
          title: 'Discard Changes?',
          shortMessage: 'You are in Edit Mode. Unsaved changes will be lost. Are you sure you want to leave?',
          confirmText: 'Leave',
          showCancelButton: true,
          onConfirm: () => {
            setShowConfirmModal(false);
            setFileInEditMode(null); 
            navigate(-1);
          }
        });
        setShowConfirmModal(true);
      }
    };
    if (isEditing) {
      window.history.pushState(null, '', window.location.pathname);
      window.addEventListener('popstate', handlePopState);
    }
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isEditing, editedContent, fileInEditMode]);

  const handleLogoutAttempt = () => {
    const isUnsavedNewFile = fileInEditMode?.isStaged;
    const hasContentChanges = isEditing && (editedContent !== fileInEditMode?.content);
    
    // It has unsaved changes if content changed OR it's a new staged file
    const hasUnsavedChanges = hasContentChanges || isUnsavedNewFile;

    const modalConfig = hasUnsavedChanges
      ? { 
          title: 'Logout with Unsaved Changes?', 
          shortMessage: 'You have a new imported file or unsaved edits. These will be lost. Logout anyway?', 
          confirmText: 'Yes, Logout' 
        }
      : { 
          title: 'Confirm Logout', 
          shortMessage: 'Are you sure you want to log out?', 
          confirmText: 'Logout' 
        };
    setConfirmModalData({
      ...modalConfig,
      showCancelButton: true,
      onConfirm: () => {
        setShowConfirmModal(false);
        executeLogout();
      },
    });
    setShowConfirmModal(true);
  };

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      // Check if it's a new unsaved file OR if content has changed
      const isUnsavedNewFile = fileInEditMode?.isStaged;
      const hasContentChanges = editedContent !== fileInEditMode?.content;

      // IF (not editing) OR (no content changes AND not a new file) -> Safe to close
      if (!isEditing || (!hasContentChanges && !isUnsavedNewFile)) return;

      e.preventDefault();
      e.returnValue = ''; 
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isEditing, editedContent, fileInEditMode]);

  useEffect(() => {
    const preventSwipeNavigation = (e) => {
      if (!isEditing) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && e.deltaX !== 0) {
        e.preventDefault();
      }
    };
    window.addEventListener('wheel', preventSwipeNavigation, { passive: false });
    return () => {
      window.removeEventListener('wheel', preventSwipeNavigation);
    };
  }, [isEditing]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showConfirmModal || showDefineCodeModal || (e.target.tagName === 'INPUT' && isEditing)) {
        return;
      }
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      if (isCtrlOrMeta && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (isEditing) { handleEditorUndo(); } else { undo(); }
      }
      if (isCtrlOrMeta && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        if (isEditing) { handleEditorRedo(); } else { redo(); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditing, undo, redo, handleEditorUndo, handleEditorRedo, showConfirmModal, showDefineCodeModal]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      let newWidth = e.clientX;
      if (newWidth < COLLAPSE_THRESHOLD) {
        setLeftPanelWidth(COLLAPSED_WIDTH);
        return;
      }
      if (newWidth < MIN_WIDTH) newWidth = MIN_WIDTH;
      if (newWidth > MAX_WIDTH) newWidth = MAX_WIDTH;
      setLeftPanelWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleToggleCodeTooltip = () => {
    setShowCodeTooltip(prev => {
      const newValue = !prev;
      localStorage.setItem('showCodeTooltip', newValue);
      return newValue;
    });
  };

  async function enterEditMode(file) {
    const fileForSelection = { ...file, _id: file.isStaged ? 'staged-file' : file._id };
    if (file.isLocked && !file.isStaged) {
      setConfirmModalData({
        title: 'Cannot Edit Locked File',
        shortMessage: 'This file has been locked and is ready for annotation only. Locked files cannot be edited.',
        confirmText: 'OK', showCancelButton: false, onConfirm: () => setShowConfirmModal(false),
      });
      setShowConfirmModal(true);
      return;
    }
    let freshContent = file.content;
    let freshFileObject = file;
    if (!file.isStaged && file._id && file._id !== 'staged-file') {
      try {
        const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/files/${file._id}`, { headers: { Authorization: `Bearer ${user.token}` } });
        if (res.data && res.data.content) {
            freshContent = res.data.content;
            freshFileObject = { ...file, content: freshContent };
        }
      } catch (err) {
        console.warn("Could not fetch fresh file content, falling back to local state.", err);
      }
    }
    if (!file.isStaged && file._id && file._id !== 'staged-file') {
      tabManager.claimFile(file._id).then((success) => {
        if (!success) {
          setConfirmModalData({
            title: 'File Already Open',
            shortMessage: 'This file is already open in edit mode in another tab. Please close the other tab first or switch to it to continue editing.',
            confirmText: 'OK', showCancelButton: false, onConfirm: () => setShowConfirmModal(false),
          });
          setShowConfirmModal(true);
          return;
        }
        proceedWithEditMode(fileForSelection, freshFileObject);
      });
    } else {
      if (file.isStaged) { setCommittedFileId(null); }
      proceedWithEditMode(fileForSelection, freshFileObject);
    }
  }

  function proceedWithEditMode(fileForSelection, file) {
    setFileInEditMode(fileForSelection);
    setEditedContent(file.content);
    handleSelectFileCore(fileForSelection);
    setHistory({ undoStack: [], redoStack: [] });
    setLeftPanelWidth(COLLAPSED_WIDTH);

    if (localStorage.getItem('hideEditModeWarning') === 'true') {
        setShowFormattingTip(true);
        return;
    }

    setConfirmModalData({
      title: 'Edit Your Document',
      shortMessage: (
        <p className="text-base leading-relaxed">
          Your document is now in <strong>edit mode</strong>. This is your opportunity to refine the text before it's finalized.
          <br /><br />
          <span className="block text-center font-black uppercase tracking-wide text-gray-800 dark:text-gray-100">PLEASE MAKE ANY CORRECTIONS OR FORMATTING CHANGES NOW.</span>
          <br />
          You can save your progress multiple times. When you're completely done, click "Lock" to finalize the document.
        </p>
      ),
      confirmText: 'Got It!', 
      showCancelButton: false, 
      showCheckbox: true, 
      checkboxLabel: "Don't show this message again",
      onConfirm: (isChecked) => { 
          if (isChecked) {
              localStorage.setItem('hideEditModeWarning', 'true');
          }
          setShowConfirmModal(false); 
          setShowFormattingTip(true); 
      },
    });
    setShowConfirmModal(true);
  }

  const handleRestoreDefaults = () => {
    setShowPreferencesModal(false);
    setConfirmModalData({
      title: 'Restore Default Settings?',
      shortMessage: "This will reset all application warnings and restore display settings to their original state.",
      confirmText: 'Yes, Restore Defaults',
      showCancelButton: true,
      onConfirm: () => {
        setShowCodeTooltip(true);
        localStorage.setItem('showCodeTooltip', 'true');
        
        // Restore Smart Selection
        handleToggleSmartSelection(true); // You might need to adjust logic to force true
        localStorage.setItem('smartSelectionEnabled', 'true');

        localStorage.removeItem('hideEditModeWarning');
        localStorage.removeItem('hideFormattingTip');
        setShowConfirmModal(false);
        window.location.reload();
      },
    });
    setShowConfirmModal(true);
  };

  const handleSwapIconClick = (event, codeAnnotation) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const panelWidth = 250;
    const panelHeight = 300;
    const margin = 8;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    let top = rect.bottom + window.scrollY;
    let left = rect.left + window.scrollX;
    if (left + panelWidth > viewportWidth - margin) left = viewportWidth - panelWidth - margin;
    if (top + panelHeight > viewportHeight - margin) top = rect.top + window.scrollY - panelHeight - margin + 130;
    if (top < window.scrollY + margin) top = window.scrollY + margin;
    if (left < window.scrollX + margin) left = window.scrollX + margin;
    setSegmentToReassign(codeAnnotation);
    setFloatingAssignCodePosition({ top, left });
    setShowFloatingAssignCode(true);
  };

  const handleSaveOnly = async () => {
    if (!fileInEditMode) return;
    try {
      const isFirstSave = fileInEditMode.isStaged && !committedFileId;
      if (isFirstSave) {
        const fileToCommit = {
          name: fileInEditMode.name,
          content: editedContent,
          sourceType: fileInEditMode.sourceType,
          audioUrl: fileInEditMode.audioUrl || null,
          words: fileInEditMode.words || null,
        };
        const result = await handleCommitNewFile(fileToCommit);
        if (result.success && result.file) {
          const committedFile = result.file; 
          setCommittedFileId(committedFile._id);
          setFileInEditMode({ ...committedFile, isStaged: false });
          await tabManager.claimFile(committedFile._id);
          setEditedContent(committedFile.content);
          setHistory({ undoStack: [], redoStack: [] });
        }
      } else {
        const fileIdToUpdate = committedFileId || fileInEditMode._id;
        const result = await handleUpdateFileContent(fileIdToUpdate, editedContent);
        if (result.success && result.file) {
          setFileInEditMode(result.file);
          setEditedContent(result.file.content); 
          setHistory({ undoStack: [], redoStack: [] });
        }
      }
    } catch (error) {
      console.error('Save failed:', error);
      setConfirmModalData({
        title: 'Save Failed', shortMessage: 'An error occurred while saving. Please try again.', confirmText: 'OK', showCancelButton: false, onConfirm: () => setShowConfirmModal(false),
      });
      setShowConfirmModal(true);
    }
  };

  const handleLockInitiate = () => {
    setConfirmModalData({
      title: 'Confirm Lock & Delete Audio',
      shortMessage: (
        <div className="text-left">
          <p>Proceeding with this action will:</p>
          <ul className="list-disc pl-5 my-3 space-y-1">
            <li>Permanently delete the associated audio recording</li>
            <li>Lock the document from further editing</li>
          </ul>
          <div className="rounded-md bg-red-50 p-3 border border-red-200 dark:bg-red-900/20 dark:border-red-800">
            <p className="flex items-center gap-2 font-bold text-red-600 dark:text-red-400">
              <FaExclamationTriangle /> WARNING: Audio Deletion
            </p>
           <p className="mt-1 text-sm text-red-600 dark:text-red-300 text-justify">
            If this file has an associated audio, it will be <strong>PERMANENTLY DELETED</strong> from the server to ensure privacy and save storage space.
          </p>
          </div>
          <br />
          <p className="font-bold text-center">THIS ACTION CANNOT BE UNDONE.</p>
        </div>
      ),
      onConfirm: handleLockConfirm,
      showCheckbox: true,
      isCheckboxRequired: true,
      checkboxLabel: "I understand that the audio will be deleted and the file locked.",
      confirmText: 'Lock & Delete Audio',
      showCancelButton: true
    });
    setShowConfirmModal(true);
  };

  const handleLockConfirm = async () => {
    if (!fileInEditMode) return;
    try {
      let fileIdToLock = null;

      if (fileInEditMode.isStaged) {
        // CASE 1: File is Staged (New)
        if (committedFileId) {
          // It was staged, but we already saved it once during this session
          if (editedContent !== fileInEditMode.content) {
            await handleUpdateFileContent(committedFileId, editedContent);
          }
          fileIdToLock = committedFileId;
        } else {
          // It is staged and this is the FIRST save/commit
          const fileToCommit = {
            name: fileInEditMode.name,
            content: editedContent,
            sourceType: fileInEditMode.sourceType,
            audioUrl: fileInEditMode.audioUrl || null,
            words: fileInEditMode.words || null,
          };

          // 1. Perform the commit
          const result = await handleCommitNewFile(fileToCommit);
          
          if (!result.success) {
            throw new Error('Failed to commit file before locking');
          }

          // --- FIX STARTS HERE ---
          // 2. DO NOT wait for state. DO NOT use setTimeout.
          // 3. Use the 'file' object returned directly from the API response.
          const committedFile = result.file; 
          
          if (!committedFile || !committedFile._id) {
             throw new Error('Server did not return a valid file ID');
          }

          fileIdToLock = committedFile._id;
          // --- FIX ENDS HERE ---
        }
      } else {
        // CASE 2: File is already existing (not staged)
        if (editedContent !== fileInEditMode.content) {
          await handleUpdateFileContent(fileInEditMode._id, editedContent);
        }
        fileIdToLock = fileInEditMode._id;
      }

      // 4. Perform the lock using the ID we definitely have now
      const lockResult = await handleLockFile(fileIdToLock);
      
      if (lockResult.success) {
        setFileInEditMode(null);
        setCommittedFileId(null);
        setLeftPanelWidth(DEFAULT_WIDTH);
        setShowConfirmModal(false);
        setHistory({ undoStack: [], redoStack: [] });
        setShowFormattingTip(false);
      } else {
        throw new Error(lockResult.error || 'Failed to lock file');
      }
    } catch (error) {
      console.error('Lock failed:', error);
      setConfirmModalData({
        title: 'Lock Failed',
        shortMessage: error.message || 'An error occurred while trying to lock the file.',
        confirmText: 'OK',
        showCancelButton: false,
        onConfirm: () => setShowConfirmModal(false),
      });
      setShowConfirmModal(true);
    }
  };

  const exitEditMode = () => {
    setFileInEditMode(null);
    setCommittedFileId(null);
    setLeftPanelWidth(DEFAULT_WIDTH);
    setHistory({ undoStack: [], redoStack: [] });
    setShowFormattingTip(false);
  };

  const handleCancelEdit = () => {
    const hasContentChanges = editedContent !== fileInEditMode?.content;
    const isUnsavedNewFile = fileInEditMode?.isStaged;
    if (hasContentChanges || isUnsavedNewFile) {
      const title = isUnsavedNewFile ? 'Discard New File?' : 'Discard Changes?';
      const message = isUnsavedNewFile 
        ? 'This file has not been saved yet. Closing edit mode now will permanently lose this file.'
        : 'You have unsaved changes. Are you sure you want to cancel editing? All progress will be lost.';
      const confirmText = isUnsavedNewFile ? 'Yes, Delete File' : 'Yes, Discard';

      setConfirmModalData({
        title: title,
        shortMessage: message,
        confirmText: confirmText,
        showCancelButton: true,
        onConfirm: () => {
          setShowConfirmModal(false);
          exitEditMode();
        }
      });
      setShowConfirmModal(true);
    } else {
      exitEditMode();
    }
  };

  const handleInitiateSplit = (sourceCodeId, newCodes) => {
    setShowSplitMergeModal(false);
    setConfirmModalData({
      title: 'Confirm Code Split',
      shortMessage: (
        <p>This will delete the original code and require you to re-categorize all of its associated segments.<br /><br /><span className="font-bold text-red-500">THIS ACTION CANNOT BE UNDONE.</span><br /><br />Are you sure you want to start the review process?</p>
      ),
      onConfirm: () => {
        setShowConfirmModal(false);
        const sourceCode = codeDefinitions.find(c => c._id === sourceCodeId);
        const segmentsToReview = project.codedSegments.filter(s => s.codeDefinition._id.toString() === sourceCodeId);
        setSplitReviewData({ show: true, sourceCode, segmentsToReview, newCodes });
      },
      showCheckbox: true, isCheckboxRequired: true, checkboxLabel: "I understand this action cannot be undone.", confirmText: "Yes, Start Splitting", showCancelButton: true,
    });
    setShowConfirmModal(true);
  };

  const handleCompleteSplit = async (assignments) => {
    const result = await handleSplitCodes({ sourceCodeId: splitReviewData.sourceCode._id, newCodeDefinitions: splitReviewData.newCodes, assignments });
    if (result.success) {
      setSplitReviewData({ show: false, sourceCode: null, segmentsToReview: [], newCodes: [] });
    } else {
      setConfirmModalData({
        title: 'Split Failed', shortMessage: result.error || 'An unexpected error occurred while finalizing the split.', onConfirm: () => setShowConfirmModal(false), confirmText: 'OK', showCancelButton: false,
      });
      setShowConfirmModal(true);
    }
  };

  const handleMerge = async (mergeData) => {
    setShowSplitMergeModal(false);
    setConfirmModalData({
      title: 'Confirm Code Merge',
      shortMessage: (
        <p>This will merge the selected codes into a single new code and reassign all associated segments.<br /><br /><span className="font-bold text-red-500">THIS ACTION CANNOT BE UNDONE.</span><br /><br />Are you sure you want to proceed?</p>
      ),
      onConfirm: async () => {
        setShowConfirmModal(false);
        const result = await handleMergeCodes(mergeData);
        if (!result.success) {
          setConfirmModalData({
            title: 'Merge Failed', shortMessage: result.error || 'An unexpected error occurred during the merge.', onConfirm: () => setShowConfirmModal(false), confirmText: 'OK', showCancelButton: false,
          });
          setShowConfirmModal(true);
        }
      },
      showCheckbox: true, isCheckboxRequired: true, checkboxLabel: "I understand this action cannot be undone.", confirmText: "Yes, Merge Codes", showCancelButton: true,
    });
    setShowConfirmModal(true);
  };

  const handleExportToExcel = async (viewType) => {
    if (!project || !user) return;
    try {
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/export-coded-segments?format=${viewType}`, { headers: { Authorization: `Bearer ${user.token}` }, responseType: 'blob' });
      const fileName = `${project.name}_coded_segments_${viewType}.xlsx`;
      FileSaver.saveAs(response.data, fileName);
    } catch (error) {
      console.error('Export failed', error);
      alert(`Failed to export table: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleTimestampClick = useCallback((seconds) => {
    if (audioPlayerRef.current) { audioPlayerRef.current.seekToTime(seconds); }
  }, []);

  const isLeftPanelCollapsed = leftPanelWidth === COLLAPSED_WIDTH;

  if (loading) return <div className="mt-10 text-center text-gray-500">Loading...</div>;
  if (error) return <div className="mt-10 text-center text-red-600">{error}</div>;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50 text-gray-900 transition-colors duration-300 dark:bg-gray-900 dark:text-gray-100">
      <Navbar
        projectName={projectName}
        isImported={project?.isImported}
        onOpenProjectOverviewModal={() => setShowProjectOverviewModal(true)}
        onOpenPreferencesModal={() => setShowPreferencesModal(true)}
        isEditing={isEditing}
        onNavigateAttempt={handleNavigationAttempt}
        onLogoutAttempt={handleLogoutAttempt}
        setShowConfirmModal={setShowConfirmModal}
        setConfirmModalData={setConfirmModalData}
      />
      <PreferencesModal
        show={showPreferencesModal}
        onClose={() => setShowPreferencesModal(false)}
        showTooltip={showCodeTooltip}
        onToggleTooltip={handleToggleCodeTooltip}
        onRestoreDefaults={handleRestoreDefaults}
        smartSelectionEnabled={smartSelectionEnabled}
        onToggleSmartSelection={handleToggleSmartSelection}
      />
      <ApiKeyModal
        show={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSaveSuccess={() => { setShowImportOptionsModal(true); }}
      />
      {transcriptionStatus.isActive && (
        <div className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-black bg-opacity-70">
          <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-xl dark:bg-gray-800">
            <h3 className="mb-4 text-xl font-bold text-[#1D3C87] dark:text-[#F05623]">{transcriptionStatus.message}</h3>
            <div className="mb-2 h-4 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600">
              <div className="flex h-4 items-center justify-center rounded-full bg-[#F05623] transition-all duration-300 ease-linear" style={{ width: `${transcriptionStatus.progress}%` }}>
                {transcriptionStatus.progress === 100 && ( <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div> )}
              </div>
            </div>
            <p className="text-lg font-bold text-gray-700 dark:text-gray-200">{transcriptionStatus.progress}%</p>
          </div>
        </div>
      )}
      <div className="h-[calc(100vh-theme(space.5))] px-2 pt-21">
        <div className="flex h-full gap-3">
          <LeftPanel
            width={leftPanelWidth}
            isLeftPanelCollapsed={isLeftPanelCollapsed}
            onMouseDownResize={handleMouseDown}
            setIsLeftPanelCollapsed={() => setLeftPanelWidth(prev => prev === COLLAPSED_WIDTH ? DEFAULT_WIDTH : COLLAPSED_WIDTH)}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchInputRef={searchInputRef}
            showImportedFiles={showImportedFiles}
            setShowImportedFiles={setShowImportedFiles}
            handleFileChange={handleFileChange}
            project={project}
            setShowImportOptionsModal={setShowImportOptionsModal}
            selectedFileId={selectedFileId}
            handleSelectFile={handleSidebarFileClick}
            handleDeleteFile={handleDeleteFile}
            handleRenameFile={handleRenameFile}
            handlePinFile={handlePinFile}
            pinnedFiles={pinnedFiles}
            handleExportFile={handleExportFile}
            showCodeDefinitions={showCodeDefinitions}
            setShowCodeDefinitions={setShowCodeDefinitions}
            codeDefinitions={codeDefinitions}
            setCodeDefinitionToEdit={setCodeDefinitionToEdit}
            setShowDefineCodeModal={setShowDefineCodeModal}
            handleDeleteCodeDefinition={handleDeleteCodeDefinition}
            showCodedSegments={showCodedSegments}
            setShowCodedSegments={setShowCodedSegments}
            groupedCodedSegments={groupedCodedSegments}
            expandedCodes={expandedCodes}
            toggleCodeGroup={toggleCodeGroup}
            handleDeleteCodedSegment={handleDeleteCodedSegment}
            showMemosPanel={showMemosPanel}
            setShowMemosPanel={setShowMemosPanel}
            groupedMemos={groupedMemos}
            handleExportMemos={handleExportMemos}
            handleDeleteMemo={handleDeleteMemo}
            setActiveMemoId={setActiveMemoId}
            setAnnotationToScrollToId={setAnnotationToScrollToId}
            setActiveCodedSegmentId={setActiveCodedSegmentId}
            setMemoToEdit={setMemoToEdit}
            setShowCodedSegmentsTableModal={setShowCodedSegmentsTableModal}
            handleExportFileCodedSegments={handleExportFileCodedSegments}
            setCodeDefinitionToView={setCodeDefinitionToView}
            setShowCodeDetailsModal={setShowCodeDetailsModal}
            setShowSplitMergeModal={setShowSplitMergeModal}
            isEditing={isEditing}
            fileInEditMode={fileInEditMode}
          />
          <div className="flex flex-1 flex-col gap-3 overflow-hidden">
            {/* 1. Edit Toolbar */}
            {isEditing && fileInEditMode && (
              <EditToolbar
                onSave={handleSaveOnly}
                onLock={handleLockInitiate}
                onCancel={handleCancelEdit}
                hasUnsavedChanges={editedContent !== fileInEditMode.content}
                onUndo={handleEditorUndo}
                onRedo={handleEditorRedo}
                canUndo={history.undoStack.length > 0}
                canRedo={history.redoStack.length > 0}
                initialShowTip={showFormattingTip}
                onDismissTip={() => setShowFormattingTip(false)}
                showFind={showFind}
                onToggleFind={handleToggleFind}
                showFindReplace={showFindReplace}
                onToggleFindReplace={handleToggleFindReplace}
                findQuery={findQuery}
                onFindChange={(e) => setFindQuery(e.target.value)}
                replaceQuery={replaceQuery}
                onReplaceChange={(e) => setReplaceQuery(e.target.value)}
                onFindNext={handleFindNext}
                onFindPrev={handleFindPrev}
                onReplaceOne={handleReplaceOne}
                onReplaceAll={handleReplaceAll}
                matchesCount={findMatches.length}
                currentMatchIndex={currentFindIndex}
                fontSize={fontSize}
                setFontSize={setFontSize}
                lineHeight={lineHeight}
                setLineHeight={setLineHeight}
                showLineHeightDropdown={showLineHeightDropdown}
                setShowLineHeightDropdown={setShowLineHeightDropdown}
              />
            )}
            
            {/* 2. Main Content Area (Viewer + Overlay) */}
            <div className="relative flex flex-1 flex-col overflow-hidden rounded-xl shadow-md bg-white dark:bg-gray-800">

              {!activeFile && (
                <div className="flex h-full flex-col items-center justify-center p-8 text-center text-gray-400 dark:text-gray-500">
                  <div className="mb-6 rounded-full bg-gray-100 p-6 dark:bg-gray-700/50">
                    <svg 
                      className="h-16 w-16 text-gray-300 dark:text-gray-600" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-gray-700 dark:text-gray-200">
                    No Files Imported
                  </h3>
                  <p className="max-w-sm mb-8 text-sm leading-relaxed">
                    Import an audio or text file to get started.
                  </p>
                  <button
                    onClick={() => setShowImportOptionsModal(true)}
                    className="flex items-center justify-center gap-2 transform rounded-lg bg-[#d34715] py-2.5 px-5 font-bold text-white shadow-lg transition duration-300 hover:scale-105 hover:bg-[#F05623]"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Import File
                  </button>
                </div>
              )}
              
              {/* THE OVERLAY: Visible only in Draft Mode (Unlocked & Not Editing) */}
              {(!isEditing && activeFile && !isCurrentFileLocked) && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-10 text-center bg-white/50 dark:bg-black/55 backdrop-blur-xs transition-all duration-300">
                  <div className="mb-6 flex items-center justify-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-500 shadow-sm">
                      <FaExclamationTriangle size={28} />
                    </div>
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-gray-100">File in Edit Mode</h3>
                  <p className="max-w-md text-gray-700 dark:text-gray-200 mb-8 font-medium">
                    This document is currently in draft mode. To ensure content consistency during analysis, you must finalize and lock the text before adding codes or annotation.
                  </p>
                  <button 
                    onClick={() => enterEditMode(currentFile)} 
                    className="flex items-center gap-2 rounded-lg bg-cyan-900 px-6 py-3 font-semibold text-white transition-all hover:bg-cyan-800 hover:shadow-lg dark:bg-[#F05623] dark:hover:bg-[#d04a1e]"
                  >
                    <FaPen /> Enter Edit Mode
                  </button>
                </div>
              )}



              {/* THE DOCUMENT VIEWER: Always rendered in background */}
              {activeFile  && (
                isEditing ? (
                  <TextEditor
                    content={editedContent}
                    onContentChange={handleContentUpdate}
                    fontSize={fontSize}
                    lineHeight={lineHeight}
                    editMatches={findMatches}
                    currentEditMatchIndex={currentFindIndex}
                    onTimestampClick={handleTimestampClick}
                    hasAudio={!!selectedFileAudioUrl}
                  />
                ) : (
                 <DocumentViewer
                  textareaRef={textareaRef}
                  isEditing={isEditing}
                  content={isEditing ? editedContent : selectedContent}
                  onContentChange={handleContentUpdate}
                  selectedContent={selectedContent}
                  codedSegments={codedSegments}
                  inlineHighlights={inlineHighlights}
                  memos={memos}
                  createRangeFromOffsets={createRangeFromOffsets}
                  activeCodedSegmentId={activeCodedSegmentId}
                  setActiveCodedSegmentId={setActiveCodedSegmentId}
                  activeMemoId={activeMemoId}
                  setActiveMemoId={setActiveMemoId}
                  showCodeColors={showCodeColors}
                  viewerSearchMatches={viewerSearchMatches}
                  currentMatchIndex={currentMatchIndex}
                  viewerRef={viewerRef}
                  viewerSearchInputRef={viewerSearchInputRef}
                  viewerSearchQuery={viewerSearchQuery}
                  handleViewerSearchChange={handleViewerSearchChange}
                  goToPrevMatch={goToPrevMatch}
                  goToNextMatch={goToNextMatch}
                  handleClearViewerSearch={handleClearViewerSearch}
                  activeTool={activeTool}
                  setActiveTool={setActiveTool}
                  showHighlightColorDropdown={showHighlightColorDropdown}
                  setShowHighlightColorDropdown={setShowHighlightColorDropdown}
                  highlightColors={highlightColors}
                  selectedHighlightColor={selectedHighlightColor}
                  setSelectedHighlightColor={setSelectedHighlightColor}
                  showCodeDropdown={showCodeDropdown}
                  setShowCodeDropdown={setShowCodeDropdown}
                  setShowCodeColors={setShowCodeColors}
                  setShowFloatingToolbar={setShowFloatingToolbar}
                  setShowFloatingAssignCode={setShowFloatingAssignCode}
                  setShowFloatingMemoInput={setShowFloatingMemoInput}
                  handleViewerMouseUp={handleViewerMouseUp}
                  handleViewerMouseDown={handleViewerMouseDown}
                  isSelectingRef={isSelectingRef}
                  setMemoToEdit={setMemoToEdit}
                  isLeftPanelCollapsed={isLeftPanelCollapsed}
                  project={project}
                  handleDeleteCodedSegment={handleDeleteCodedSegment}
                  handleReassignCodeClick={handleSwapIconClick}
                  fontSize={fontSize}
                  setFontSize={setFontSize}
                  lineHeight={lineHeight}
                  setLineHeight={setLineHeight}
                  showLineHeightDropdown={showLineHeightDropdown}
                  setShowLineHeightDropdown={setShowLineHeightDropdown}
                  showCodeTooltip={showCodeTooltip}
                  onUndo={undo}
                  onRedo={redo}
                  canUndo={canUndo}
                  canRedo={canRedo}
                  handleCreateMemoForSegment={handleCreateMemoForSegment}
                  hasAudio={!!selectedFileAudioUrl}
                  onTimestampClick={handleTimestampClick}
                  editMatches={findMatches}
                  currentEditMatchIndex={currentFindIndex}
                  setFloatingMemoInputPosition={setFloatingMemoInputPosition}
                />
                )
              )}
            </div>

            {/* 3. Audio Player - Hidden in Draft Mode */}
            {selectedFileAudioUrl && (isEditing || isCurrentFileLocked) && (
              <AudioPlayer
                ref={audioPlayerRef}
                fileId={selectedFileId}
                src={`${import.meta.env.VITE_BACKEND_URL}${selectedFileAudioUrl}`}
              />
            )}
          </div>
        </div>
      </div>

      {/* Import Options Modal */}
      {showImportOptionsModal && (
        <ImportOptionsModal
          show={showImportOptionsModal}
          onClose={handleCloseImportModal}
          // ✅ lifted state
          modalStep={importModalStep}
          setModalStep={setImportModalStep}
          handleAudioImport={handleAudioImport}
          handleTextImport={handleTextImport}
        />
      )}

      {showFloatingToolbar && (
        <FloatingToolbar
          y={floatingToolbarPosition.top}
          x={floatingToolbarPosition.left}
          onCode={() => {
            handleCodeSelectionAction();
            setShowFloatingToolbar(false);
          }}
          onMemo={() => {
            handleMemoSelectionAction();
            setShowFloatingToolbar(false);
          }}
          onHighlight={() => {
            handleHighlightSelectionAction();
            setShowFloatingToolbar(false);
          }}
          onCancel={() => setShowFloatingToolbar(false)}
          selectionInfo={getSelectionInfo()}
        />
      )}

      {showFloatingAssignCode && (
        <FloatingAssignCode
          x={floatingAssignCodePosition.left}
          y={floatingAssignCodePosition.top}
          onClose={() => {
            setShowFloatingAssignCode(false);
            setSegmentToReassign(null);
          }}
          onAssignCode={handleAssignCode}
          codeDefinitions={codeDefinitions}
          onDefineNewCode={() => {
            setShowFloatingAssignCode(false);
            if (!selectedFileId) {
              setConfirmModalData({
                title: "Define Code Error",
                shortMessage: "Please select a document to define a code.",
                onConfirm: () => setShowConfirmModal(false),
                confirmText: "OK",
                showCancelButton: false,
              });
              setShowConfirmModal(true);
              return;
            }
            setShowDefineCodeModal(true);
            setCodeDefinitionToEdit(null);
          }}
          selectionInfo={currentSelectionInfo}
        />
      )}

      {/* UPDATE: Floating Memo Input now handles Edit Mode too via initialMemo */}
      <AnimatePresence>
        {showFloatingMemoInput && (
          <FloatingMemoInput
            x={floatingMemoInputPosition.left}
            y={floatingMemoInputPosition.top}
            onClose={() => {
              setShowFloatingMemoInput(false);
              setMemoToEdit(null); // Clear edit state on close
            }}
            onSave={handleSaveMemo}
            selectionInfo={currentMemoSelectionInfo}
            allMemos={memos}
            initialMemo={memoToEdit} // Pass the memo being edited
            onDelete={handleDeleteMemo} // Pass delete handler
            setShowConfirmModal={setShowConfirmModal}
            setConfirmModalData={setConfirmModalData}
          />
        )}
      </AnimatePresence>

      <DefineCodeModal
        show={showDefineCodeModal}
        onClose={handleDefineCodeModalClose}
        onSave={handleSaveCodeDefinition}
        initialCode={codeDefinitionToEdit}
        onBackendError={handleDefineModalErrorSetter}
        codeDefinitions={codeDefinitions}
      />

      <CodeDetailsModal
        show={showCodeDetailsModal}
        onClose={() => setShowCodeDetailsModal(false)}
        codeDefinition={codeDefinitionToView}
        codeSegment={null}
        allCodedSegments={project?.codedSegments || []}
        currentFileId={selectedFileId}
      />

      <ConfirmationModal
        show={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmModalData.onConfirm}
        onCancel={confirmModalData.onCancel}
        title={confirmModalData.title}
        shortMessage={confirmModalData.shortMessage}
        detailedMessage={confirmModalData.detailedMessage}
        showInput={confirmModalData.showInput}
        promptText={confirmModalData.promptText}
        confirmText={confirmModalData.confirmText}
        showCancelButton={confirmModalData.showCancelButton}
        {...confirmModalData}
      />

      {showCodedSegmentsTableModal && (
        <CodedSegmentsTableModal
          show={showCodedSegmentsTableModal}
          onClose={() => setShowCodedSegmentsTableModal(false)}
          codedSegments={codedSegments}
          codeDefinitions={codeDefinitions}
          projectName={project?.name}
          handleExportToExcel={handleExportFileCodedSegments}
          isProjectOverview={false}
          selectedFileId={selectedFileId}
          project={project}
          baseNameForDownload={
            project?.importedFiles.find((f) => f._id === selectedFileId)?.name
          }
        />
      )}

      {showProjectOverviewModal && (
        <CodedSegmentsTableModal
          show={showProjectOverviewModal}
          onClose={() => setShowProjectOverviewModal(false)}
          codedSegments={project?.codedSegments || []}
          codeDefinitions={codeDefinitions}
          projectName={project?.name}
          handleExportToExcel={handleExportToExcel}
          handleExportOverlaps={handleExportOverlaps}
          isProjectOverview={true}
          project={project}
          projectId={projectId}
          baseNameForDownload={project?.name}
        />
      )}

      <SplitMergeCodesModal
        show={showSplitMergeModal}
        onClose={() => setShowSplitMergeModal(false)}
        codeDefinitions={codeDefinitions}
        onMerge={handleMerge}
        onInitiateSplit={handleInitiateSplit}
        allCodedSegments={project?.codedSegments || []}
      />

      <SplitReviewModal
        show={splitReviewData.show}
        onClose={() =>
          setSplitReviewData((prev) => ({ ...prev, show: false }))
        }
        sourceCode={splitReviewData.sourceCode}
        segmentsToReview={splitReviewData.segmentsToReview}
        newCodes={splitReviewData.newCodes}
        onCompleteSplit={handleCompleteSplit}
      />
      </div>
    );
};

export default ProjectView;