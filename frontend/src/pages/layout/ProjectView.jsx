import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../layout/Navbar.jsx';
import ConfirmationModal from '../components/ConfirmationModal.jsx';
import DefineCodeModal from '../code/DefineCodeModal.jsx';
import MemoModal from '../memo/MemoModal.jsx';
import FloatingToolbar from '../components/FloatingToolbar.jsx';
import FloatingAssignCode from '../code/FloatingAssignCode.jsx';
import FloatingMemoInput from '../memo/FloatingMemoInput.jsx';
import CodedSegmentsTableModal from '../table/CodedSegmentsTableModal.jsx';
import LeftPanel from '../layout/LeftPanel.jsx';
import DocumentViewer from '../layout/DocumentViewer.jsx';
import ImportOptionsModal from '../components/ImportOptionsModal.jsx';
import useProjectViewHooks from '../hooks/Hooks.jsx';
import AudioPlayer from '../layout/AudioPlayer.jsx';
import EditToolbar from '../components/EditToolbar.jsx';
import CodeDetailsModal from '../code/CodeDetailsModal.jsx';
import PreferencesModal from '../components/PreferencesModal.jsx';
import SplitMergeCodesModal from '../code/SplitMergeCodesModal.jsx';
import SplitReviewModal from '../code/SplitReviewModal.jsx';
import axios from 'axios';
import FileSaver from 'file-saver';
import { useAuth } from '../auth/AuthContext.jsx';

const MIN_WIDTH = 200;
const MAX_WIDTH = 500;
const DEFAULT_WIDTH = 250;
const COLLAPSED_WIDTH = 40;
const COLLAPSE_THRESHOLD = 120;

const ProjectView = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [fileInEditMode, setFileInEditMode] = useState(null);
  const [editedContent, setEditedContent] = useState('');
  const isEditing = !!fileInEditMode;
  const [showFormattingTip, setShowFormattingTip] = useState(false);

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
  } = useProjectViewHooks({ onImportSuccess: enterEditMode, setFileInEditMode: setFileInEditMode, isInEditMode: isEditing });

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

  const updateContentAndHistory = (newContent) => {
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
    updateContentAndHistory(newContent);
  };

  const handleReplaceAll = () => {
    if (!findQuery || findMatches.length === 0) return;
    const escapedQuery = escapeRegExp(findQuery);
    const regex = new RegExp(escapedQuery, 'gi');
    const newContent = editedContent.replace(regex, replaceQuery);
    updateContentAndHistory(newContent);
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

  function enterEditMode(file) {
    const fileForSelection = {
      ...file,
      _id: file.isStaged ? 'staged-file' : file._id,
    };

    setFileInEditMode(fileForSelection);
    setEditedContent(file.content);
    handleSelectFile(fileForSelection); 
    setHistory({ undoStack: [], redoStack: [] });
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
      onConfirm: () => setShowConfirmModal(false),
    });
    setShowConfirmModal(true);

  }

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

  const handleSaveInitiate = () => {
    setConfirmModalData({
      title: 'Confirm Save',
      shortMessage: "This action will finalize the document and permanently lock it from any further edits. Are you sure you want to proceed?",
      onConfirm: handleSaveConfirm,
      isCheckboxRequired: true,
      checkboxLabel: "I understand and wish to lock this document.",
      confirmText: 'Save and Lock',
      showCancelButton: true
    });
    setShowConfirmModal(true);
  };

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
  setShowConfirmModal(false);
  setHistory({ undoStack: [], redoStack: [] });
  setShowFormattingTip(false); 
};

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

  const handleExportToExcel = async (viewType) => {
    if (!project || !user) return;
    try {
      const response = await axios.get(
        `/api/projects/${projectId}/export-coded-segments?format=${viewType}`, {
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

  const handleTimestampClick = useCallback((seconds) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.seekToTime(seconds);
    }
  }, []);

  const isLeftPanelCollapsed = leftPanelWidth === COLLAPSED_WIDTH;

  if (loading) return <div className="mt-10 text-center text-gray-500">Loading...</div>;
  if (error) return <div className="mt-10 text-center text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-200 text-gray-800 dark:bg-gray-900 dark:text-white">
      <Navbar
        projectName={projectName}
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

      {transcriptionStatus.isActive && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black bg-opacity-70">
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

      <div className="h-[calc(100vh-theme(space.5))] px-2 pt-18">
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
              />
            )}
            <DocumentViewer
              textareaRef={textareaRef}
              isEditing={isEditing}
              content={isEditing ? editedContent : selectedContent}
              onContentChange={(e) => setEditedContent(e.target.value)}
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