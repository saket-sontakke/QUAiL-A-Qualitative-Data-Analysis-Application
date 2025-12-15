import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../layout/Navbar.jsx';
import ConfirmationModal from '../components/ConfirmationModal.jsx';
import DefineCodeModal from '../code/DefineCodeModal.jsx';
import MemoModal from '../memo/MemoModal.jsx';
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

/**
 * The main component for viewing and interacting with a single project.
 * It serves as the primary workspace, orchestrating the state and interactions
 * between various sub-components like the file list, document viewer, code definitions,
 * memos, and various modals. It manages file editing, content analysis (coding, memos),
 * and UI layout.
 * @returns {JSX.Element} The rendered project view component.
 */
const ProjectView = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [fileInEditMode, setFileInEditMode] = useState(null);
  const [editedContent, setEditedContent] = useState('');
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
    handleFileChange, handleSelectFile, handleDeleteFile, handleRenameFile, handlePinFile,
    pinnedFiles, handleExportFile, codeDefinitions, showCodeDefinitions, setShowCodeDefinitions,
    showDefineCodeModal, setShowDefineCodeModal, codeDefinitionToEdit, setCodeDefinitionToEdit,
    handleSaveCodeDefinition, handleDefineCodeModalClose, handleDeleteCodeDefinition,
    handleDefineModalErrorSetter, codedSegments, inlineHighlights, groupedCodedSegments, expandedCodes,
    toggleCodeGroup, showCodedSegments, setShowCodedSegments, showCodedSegmentsTableModal,
    setShowCodedSegmentsTableModal, activeCodedSegmentId, setActiveCodedSegmentId,
    handleAssignCode, handleReassignCodeClick, setSegmentToReassign, handleDeleteCodedSegment,
    handleExportFileCodedSegments, handleExportOverlaps, memos, groupedMemos, showMemosPanel,
    setShowMemosPanel, showMemoModal, setShowMemoModal, memoToEdit, setMemoToEdit,
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
  } = useProjectViewHooks({ 
    onImportSuccess: enterEditMode, 
    setFileInEditMode: setFileInEditMode, 
    isInEditMode: isEditing, 
    onRequestApiKey: () => {
        setShowImportOptionsModal(false);
        setShowApiKeyModal(true);
    }});

  const [showSplitMergeModal, setShowSplitMergeModal] = useState(false);
  const [splitReviewData, setSplitReviewData] = useState({
    show: false, sourceCode: null, segmentsToReview: [], newCodes: [],
  });

  const [showImportOptionsModal, setShowImportOptionsModal] = useState(false);
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

  /**
   * Updates the content of the document being edited and manages the local undo/redo history.
   * Pushes the previous content state to the undo stack and clears the redo stack.
   * @param {string} newContent - The new text content from the editor textarea.
   */
  const handleContentUpdate = (newContent) => {
    if (newContent === editedContent) return;
    setHistory(prev => ({
      undoStack: [...prev.undoStack, editedContent],
      redoStack: [],
    }));
    setEditedContent(newContent);
  };

  /**
   * Escapes special characters in a string for use in a regular expression.
   * @param {string} string - The input string to escape.
   * @returns {string} The escaped string, safe for RegExp construction.
   */
  const escapeRegExp = (string) => {
    if (!string) return '';
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  /**
   * Effect to find all matches for the current find query within the edited content.
   * It runs whenever the find query, content, or find/replace visibility changes.
   * It builds a regular expression and stores the indices of all matches.
   */
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

  /**
   * Effect to highlight the current find match in the editor's textarea and scroll it into view.
   * It runs when the current match index or the list of matches changes.
   */
  useEffect(() => {
    const currentToolActive = showFind || showFindReplace;
    if (!isEditing || !currentToolActive || findMatches.length === 0 || currentFindIndex < 0) return;
    const match = findMatches[currentFindIndex];
    const textarea = textareaRef?.current;
    if (!textarea || !match) return;
    if (document.activeElement.tagName !== 'INPUT') {
        textarea.focus();
    }
    textarea.setSelectionRange(match.startIndex, match.endIndex);
    const textBefore = textarea.value.substring(0, match.startIndex);
    const lines = textBefore.split('\n').length;
    const avgLineHeight = textarea.scrollHeight / textarea.value.split('\n').length;
    const newScrollTop = (lines * avgLineHeight) - (textarea.clientHeight / 2);
    textarea.scrollTop = Math.max(0, newScrollTop);
  }, [currentFindIndex, findMatches, isEditing, showFind, showFindReplace]);

  /**
   * Toggles the visibility of the "Find" interface.
   * If the "Find & Replace" interface is open, it will be closed.
   */
  const handleToggleFind = () => {
    setShowFind(prev => !prev);
    if (showFindReplace) {
      setShowFindReplace(false);
    }
  };

  /**
   * Toggles the visibility of the "Find & Replace" interface.
   * If the "Find" interface is open, it will be closed.
   */
  const handleToggleFindReplace = () => {
    setShowFindReplace(prev => !prev);
    if (showFind) {
      setShowFind(false);
    }
  };

  /**
   * Navigates to the next search match in the document.
   * Wraps around to the first match if the last one is reached.
   */
  const handleFindNext = () => {
    if (findMatches.length > 0) {
      setCurrentFindIndex(prev => (prev + 1) % findMatches.length);
    }
  };

  /**
   * Navigates to the previous search match in the document.
   * Wraps around to the last match if the first one is reached.
   */
  const handleFindPrev = () => {
    if (findMatches.length > 0) {
      setCurrentFindIndex(prev => (prev - 1 + findMatches.length) % findMatches.length);
    }
  };

  /**
   * Replaces the currently highlighted search match with the replacement query.
   */
  const handleReplaceOne = () => {
    if (findMatches.length === 0 || currentFindIndex < 0) return;
    const match = findMatches[currentFindIndex];
    const newContent =
      editedContent.substring(0, match.startIndex) +
      replaceQuery +
      editedContent.substring(match.endIndex);
    handleContentUpdate(newContent);
  };

  /**
   * Replaces all occurrences of the find query with the replacement query throughout the document.
   */
  const handleReplaceAll = () => {
    if (!findQuery || findMatches.length === 0) return;
    const escapedQuery = escapeRegExp(findQuery);
    const regex = new RegExp(escapedQuery, 'gi');
    const newContent = editedContent.replace(regex, replaceQuery);
    handleContentUpdate(newContent);
  };

  /**
   * Performs an undo action within the text editor mode by reverting to the previous content state.
   */
  const handleEditorUndo = useCallback(() => {
    if (history.undoStack.length === 0) return;
    const lastState = history.undoStack[history.undoStack.length - 1];
    setHistory(prev => ({
      undoStack: prev.undoStack.slice(0, -1),
      redoStack: [...prev.redoStack, editedContent],
    }));
    setEditedContent(lastState);
  }, [history.undoStack, editedContent]);

  /**
   * Performs a redo action within the text editor mode by applying the next content state.
   */
  const handleEditorRedo = useCallback(() => {
    if (history.redoStack.length === 0) return;
    const nextState = history.redoStack[history.redoStack.length - 1];
    setHistory(prev => ({
      undoStack: [...prev.undoStack, editedContent],
      redoStack: prev.redoStack.slice(0, -1),
    }));
    setEditedContent(nextState);
  }, [history.redoStack, editedContent]);

  /**
   * Executes the logout process and navigates the user to the homepage.
   */
  const executeLogout = () => {
    logout();
    navigate('/');
  };

  /**
   * Intercepts navigation attempts (e.g., clicking back button, navigating away).
   * If in edit mode, it prompts the user to confirm before discarding changes.
   * @param {string} path - The destination path.
   * @param {object} options - Options for the navigate function.
   */
  const handleNavigationAttempt = (path, options) => {
    if (!isEditing) {
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

  /**
   * Handles a logout attempt. If in edit mode, it warns the user about unsaved changes.
   * Otherwise, it shows a standard confirmation modal before logging out.
   */
  const handleLogoutAttempt = () => {
    const modalConfig = isEditing
      ? {
          title: 'Logout with Unsaved Changes?',
          shortMessage: 'You are in Edit Mode. Unsaved changes will be lost. Are you sure you want to log out?',
          confirmText: 'Yes, Logout',
        }
      : {
          title: 'Confirm Logout',
          shortMessage: 'Are you sure you want to log out?',
          confirmText: 'Logout',
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

  /**
   * Effect to add a 'beforeunload' event listener to the window.
   * This prevents accidental closing of the tab/browser when in edit mode.
   */
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!isEditing) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isEditing]);

  /**
   * Effect to prevent browser swipe navigation (e.g., trackpad back/forward gestures)
   * when in edit mode to avoid accidental data loss.
   */
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

  /**
   * Effect to set up global keyboard shortcuts for Undo (Ctrl/Cmd+Z) and Redo (Ctrl/Cmd+Y).
   * It delegates the action to the appropriate handler based on whether the app is in edit mode.
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showConfirmModal || showDefineCodeModal || showMemoModal || (e.target.tagName === 'INPUT' && isEditing)) {
        return;
      }
      
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      if (isCtrlOrMeta && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (isEditing) {
          handleEditorUndo();
        } else {
          undo();
        }
      }

      if (isCtrlOrMeta && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        if (isEditing) {
          handleEditorRedo();
        } else {
          redo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isEditing, undo, redo, handleEditorUndo, handleEditorRedo, 
    showConfirmModal, showDefineCodeModal, showMemoModal
  ]);

  /**
   * Effect to handle the resizing logic for the left panel.
   * It adds 'mousemove' and 'mouseup' listeners when resizing is active.
   */
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

  /**
   * Initiates the resizing of the left panel on mouse down event on the resizer handle.
   * @param {React.MouseEvent} e - The mouse event.
   */
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  /**
   * Toggles the visibility of the code tooltip preference and persists it to localStorage.
   */
  const handleToggleCodeTooltip = () => {
    setShowCodeTooltip(prev => {
      const newValue = !prev;
      localStorage.setItem('showCodeTooltip', newValue);
      return newValue;
    });
  };

  /**
   * Transitions the application into document edit mode for a specified file.
   * This function sets up the editor state, collapses the side panel, and displays
   * an informational modal explaining the edit mode process.
   * @param {object} file - The file object to be edited. Can be a staged new file or an existing one.
   */
  function enterEditMode(file) {
    const fileForSelection = {
      ...file,
      _id: file.isStaged ? 'staged-file' : file._id,
    };

    setFileInEditMode(fileForSelection);
    setEditedContent(file.content);
    handleSelectFile(fileForSelection); 
    setHistory({ undoStack: [], redoStack: [] });
    setLeftPanelWidth(COLLAPSED_WIDTH);
    setConfirmModalData({
      title: 'Edit Your Document',
      shortMessage: (
        <p className="text-base leading-relaxed">
          Your document is now in <strong>edit mode</strong>. This is your opportunity to refine the text before it's finalized.
          <br /><br />
          <span className="block text-center font-black uppercase tracking-wide text-gray-800 dark:text-gray-100">
            PLEASE MAKE ANY CORRECTIONS OR FORMATTING CHANGES NOW.
          </span>
          <br />
          After saving, this version will be committed to your project, and its <strong>content will be locked</strong> from further edits.
        </p>
      ),
      confirmText: 'Got It!',
      showCancelButton: false,
      onConfirm: () => {
        setShowConfirmModal(false);
        setShowFormattingTip(true);
      },
    });
    setShowConfirmModal(true);

  }

  /**
   * Handles the action to restore default application settings. It prompts the user
   * for confirmation before clearing relevant localStorage items and reloading the page.
   */
  const handleRestoreDefaults = () => {
    setShowPreferencesModal(false);
    setConfirmModalData({
      title: 'Restore Default Settings?',
      shortMessage: "This will reset all application warnings and restore display settings to their original state. Are you sure you want to continue?",
      confirmText: 'Yes, Restore Defaults',
      showCancelButton: true,
      onConfirm: () => {
        setShowCodeTooltip(true);
        localStorage.setItem('showCodeTooltip', 'true');
        setShowConfirmModal(false);
        window.location.reload();
      },
    });
    setShowConfirmModal(true);
  };

  /**
   * Handles the click event on the reassign-code icon next to a coded segment.
   * It calculates the optimal position for the FloatingAssignCode panel and displays it.
   * @param {React.MouseEvent} event - The click event.
   * @param {object} codeAnnotation - The coded segment data to be reassigned.
   */
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

  /**
   * Initiates the save process from edit mode by showing a confirmation modal.
   * This modal warns the user that saving will permanently lock the document from further edits.
   */
  const handleSaveInitiate = () => {
    setConfirmModalData({
      title: 'Confirm Save',
      shortMessage: "This action will finalize the document and permanently lock it from any further edits. Are you sure you want to proceed?",
      onConfirm: handleSaveConfirm,
      showCheckbox: true,
      isCheckboxRequired: true,
      checkboxLabel: "I understand and wish to lock this document.",
      confirmText: 'Save and Lock',
      showCancelButton: true
    });
    setShowConfirmModal(true);
  };

  /**
   * Confirms and executes the save action after the user agrees in the modal.
   * It either commits a new (staged) file or updates the content of an existing file.
   * After saving, it exits edit mode.
   */
  const handleSaveConfirm = async () => {
  if (!fileInEditMode) return;

  if (fileInEditMode.isStaged) {
    const fileToCommit = {
      name: fileInEditMode.name,
      content: editedContent,
      sourceType: fileInEditMode.sourceType,
      audioUrl: fileInEditMode.audioUrl || null,
      words: fileInEditMode.words || null,
    };
    await handleCommitNewFile(fileToCommit);
  } else {
    await handleUpdateFileContent(fileInEditMode._id, editedContent);
  }

  setFileInEditMode(null);
  setLeftPanelWidth(DEFAULT_WIDTH);
  setShowConfirmModal(false);
  setHistory({ undoStack: [], redoStack: [] });
  setShowFormattingTip(false); 
};

  /**
   * Initiates the code splitting process. It shows a confirmation modal to the user,
   * warning them that the action is irreversible. If confirmed, it prepares the data
   * for the SplitReviewModal.
   * @param {string} sourceCodeId - The ID of the code definition to be split.
   * @param {Array<object>} newCodes - An array of new code definition objects.
   */
  const handleInitiateSplit = (sourceCodeId, newCodes) => {
    setShowSplitMergeModal(false);
    setConfirmModalData({
      title: 'Confirm Code Split',
      shortMessage: (
        <p>
          This will delete the original code and require you to re-categorize all of its associated segments.
          <br /><br />
          <span className="font-bold text-red-500">THIS ACTION CANNOT BE UNDONE.</span>
          <br /><br />
          Are you sure you want to start the review process?
        </p>
      ),
      onConfirm: () => {
        setShowConfirmModal(false);
        const sourceCode = codeDefinitions.find(c => c._id === sourceCodeId);
        const segmentsToReview = project.codedSegments.filter(s => s.codeDefinition._id.toString() === sourceCodeId);
        setSplitReviewData({ show: true, sourceCode, segmentsToReview, newCodes });
      },
      showCheckbox: true,
      isCheckboxRequired: true,
      checkboxLabel: "I understand this action cannot be undone.",
      confirmText: "Yes, Start Splitting",
      showCancelButton: true,
    });
    setShowConfirmModal(true);
  };

  /**
   * Finalizes the code splitting process by sending the new code assignments to the backend.
   * Hides the split review modal on success or shows an error modal on failure.
   * @param {object} assignments - An object mapping original segment IDs to new code definition IDs.
   */
  const handleCompleteSplit = async (assignments) => {
    const result = await handleSplitCodes({
      sourceCodeId: splitReviewData.sourceCode._id,
      newCodeDefinitions: splitReviewData.newCodes,
      assignments,
    });
    if (result.success) {
      setSplitReviewData({ show: false, sourceCode: null, segmentsToReview: [], newCodes: [] });
    } else {
      setConfirmModalData({
        title: 'Split Failed',
        shortMessage: result.error || 'An unexpected error occurred while finalizing the split.',
        onConfirm: () => setShowConfirmModal(false),
        confirmText: 'OK',
        showCancelButton: false,
      });
      setShowConfirmModal(true);
    }
  };

  /**
   * Handles the code merging process. It shows a confirmation modal to the user,
   * warning them that the action is irreversible. If confirmed, it calls the backend
   * to perform the merge and shows an error if it fails.
   * @param {object} mergeData - Data required for the merge, including source code IDs and the new code definition.
   */
  const handleMerge = async (mergeData) => {
    setShowSplitMergeModal(false);
    setConfirmModalData({
      title: 'Confirm Code Merge',
      shortMessage: (
        <p>
          This will merge the selected codes into a single new code and reassign all associated segments.
          <br /><br />
          <span className="font-bold text-red-500">THIS ACTION CANNOT BE UNDONE.</span>
          <br /><br />
          Are you sure you want to proceed?
        </p>
      ),
      onConfirm: async () => {
        setShowConfirmModal(false);
        const result = await handleMergeCodes(mergeData);
        if (!result.success) {
          setConfirmModalData({
            title: 'Merge Failed',
            shortMessage: result.error || 'An unexpected error occurred during the merge.',
            onConfirm: () => setShowConfirmModal(false),
            confirmText: 'OK',
            showCancelButton: false,
          });
          setShowConfirmModal(true);
        }
      },
      showCheckbox: true,
      isCheckboxRequired: true,
      checkboxLabel: "I understand this action cannot be undone.",
      confirmText: "Yes, Merge Codes",
      showCancelButton: true,
    });
    setShowConfirmModal(true);
  };

  /**
   * Handles exporting coded segments data to an Excel file.
   * @param {string} viewType - The type of export view (e.g., 'by_code', 'by_document').
   */
  const handleExportToExcel = async (viewType) => {
    if (!project || !user) return;
    try {
      const response = await axios.get(
      `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/export-coded-segments?format=${viewType}`, {
        headers: { Authorization: `Bearer ${user.token}` },
        responseType: 'blob',
      });
      const fileName = `${project.name}_coded_segments_${viewType}.xlsx`;
      FileSaver.saveAs(response.data, fileName);
    } catch (error) {
      console.error('Export failed', error);
      alert(`Failed to export table: ${error.response?.data?.error || error.message}`);
    }
  };

  /**
   * Callback function to handle clicks on timestamps within the document viewer.
   * It seeks the audio player to the corresponding time.
   * @param {number} seconds - The time in seconds to seek to.
   */
  const handleTimestampClick = useCallback((seconds) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.seekToTime(seconds);
    }
  }, []);

  const isLeftPanelCollapsed = leftPanelWidth === COLLAPSED_WIDTH;

  if (loading) return <div className="mt-10 text-center text-gray-500">Loading...</div>;
  if (error) return <div className="mt-10 text-center text-red-600">{error}</div>;

  return (
    // <div className="min-h-screen bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white">
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
      />
      <ApiKeyModal
        show={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSaveSuccess={() => {
            // Optional: Re-open the import modal so they can try again immediately
            setShowImportOptionsModal(true);
        }}
      />

      {transcriptionStatus.isActive && (
        <div className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-black bg-opacity-70">
          <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-xl dark:bg-gray-800">
            <h3 className="mb-4 text-xl font-bold text-[#1D3C87] dark:text-[#F05623]">
              {transcriptionStatus.message}
            </h3>
            <div className="mb-2 h-4 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600">
              <div
                className="flex h-4 items-center justify-center rounded-full bg-[#F05623] transition-all duration-300 ease-linear"
                style={{ width: `${transcriptionStatus.progress}%` }}
              >
                {transcriptionStatus.progress === 100 && (
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                )}
              </div>
            </div>
            <p className="text-lg font-bold text-gray-700 dark:text-gray-200">
              {transcriptionStatus.progress}%
            </p>
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
            handleSelectFile={handleSelectFile}
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
            setShowMemoModal={setShowMemoModal}
            setShowCodedSegmentsTableModal={setShowCodedSegmentsTableModal}
            handleExportFileCodedSegments={handleExportFileCodedSegments}
            setCodeDefinitionToView={setCodeDefinitionToView}
            setShowCodeDetailsModal={setShowCodeDetailsModal}
            setShowSplitMergeModal={setShowSplitMergeModal}
            isEditing={isEditing}
            fileInEditMode={fileInEditMode}
          />

          <div className="flex flex-1 flex-col gap-3 overflow-hidden">
            {isEditing && fileInEditMode && (
              <EditToolbar
                onSave={handleSaveInitiate}
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
              setShowMemoModal={setShowMemoModal}
              setShowFloatingAssignCode={setShowFloatingAssignCode}
              setShowFloatingMemoInput={setShowFloatingMemoInput}
              handleViewerMouseUp={handleViewerMouseUp}
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
            />

            {selectedFileAudioUrl && (
              <AudioPlayer
                ref={audioPlayerRef}
                fileId={selectedFileId}
                src={`${import.meta.env.VITE_BACKEND_URL}${selectedFileAudioUrl}`}
              />
            )}
          </div>
        </div>
      </div>

      {showImportOptionsModal && (
        <ImportOptionsModal
          show={showImportOptionsModal}
          onClose={() => setShowImportOptionsModal(false)}
          handleAudioImport={handleAudioImport}
          handleTextImport={handleTextImport}
        />
      )}

      {showFloatingToolbar && (
        <FloatingToolbar
          y={floatingToolbarPosition.top} x={floatingToolbarPosition.left}
          onCode={() => { handleCodeSelectionAction(); setShowFloatingToolbar(false); }}
          onMemo={() => { handleMemoSelectionAction(); setShowFloatingToolbar(false); }}
          onHighlight={() => { handleHighlightSelectionAction(); setShowFloatingToolbar(false); }}
          onCancel={() => setShowFloatingToolbar(false)}
          selectionInfo={getSelectionInfo()}
        />
      )}

      {showFloatingAssignCode && (
        <FloatingAssignCode
          x={floatingAssignCodePosition.left} y={floatingAssignCodePosition.top}
          onClose={() => { setShowFloatingAssignCode(false); setSegmentToReassign(null); }}
          onAssignCode={handleAssignCode}
          codeDefinitions={codeDefinitions}
          onDefineNewCode={() => {
            setShowFloatingAssignCode(false);
            if (!selectedFileId) {
              setConfirmModalData({
                title: 'Define Code Error',
                shortMessage: 'Please select a document to define a code.',
                onConfirm: () => setShowConfirmModal(false),
                confirmText: 'OK',
                showCancelButton: false
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

      {showFloatingMemoInput && (
        <FloatingMemoInput
          x={floatingMemoInputPosition.left} y={floatingMemoInputPosition.top}
          onClose={() => setShowFloatingMemoInput(false)}
          onSave={handleSaveMemo}
          selectionInfo={currentMemoSelectionInfo}
          allMemos={memos}
        />
      )}

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

      <MemoModal
        show={showMemoModal}
        onClose={() => { setShowMemoModal(false); setMemoToEdit(null); window.getSelection().removeAllRanges(); }}
        allMemos={memos}
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
          baseNameForDownload={project?.importedFiles.find(f => f._id === selectedFileId)?.name}
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
        onClose={() => setSplitReviewData(prev => ({ ...prev, show: false }))}
        sourceCode={splitReviewData.sourceCode}
        segmentsToReview={splitReviewData.segmentsToReview}
        newCodes={splitReviewData.newCodes}
        onCompleteSplit={handleCompleteSplit}
      />
    </div>
  );
};

export default ProjectView;
