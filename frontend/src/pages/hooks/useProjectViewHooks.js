import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useHistory } from './useHistory.js';
import { useProjectCore } from './useProjectCore.js';
import { useFileManager } from './useFileManager.jsx';
import { useCodeSystem } from './useCodeSystem.jsx';
import { useAnnotationManager } from './useAnnotationManager.js';
import { useSearchSystem } from './useSearchSystem.js';
import { useViewerSelection } from './useViewerSelection.js';
import { createRangeFromOffsets } from './projectDOMUtils.js';

/**
 * A comprehensive custom hook that encapsulates the state management and business
 * logic for the main project view. It orchestrates all sub-hooks and provides
 * a unified interface.
 *
 * @param {object} props - The hook's configuration object.
 * @param {(file: object) => void} props.onImportSuccess - Callback when a file import is successful.
 * @param {React.Dispatch<React.SetStateAction<object|null>>} props.setFileInEditMode - State setter for edit mode.
 * @param {string|null} [props.idFromProp=null] - Optional project ID passed as a prop.
 * @param {boolean} props.isInEditMode - Whether the viewer is in edit mode.
 * @param {function} props.onRequestApiKey - Callback to request API key setup.
 * @returns {object} All state and handler functions required by the ProjectView component.
 */
export default function useProjectViewHooks({ 
  onImportSuccess, 
  setFileInEditMode, 
  idFromProp = null, 
  isInEditMode, 
  onRequestApiKey 
}) {
  const navigate = useNavigate();

  // Initialize core project state
  const coreState = useProjectCore(idFromProp);
  const {
    projectId,
    project,
    setProject,
    projectName,
    loading,
    error,
    setError,
    transcriptionStatus,
    setTranscriptionStatus,
    selectedContent,
    setSelectedContent,
    selectedFileName,
    setSelectedFileName,
    selectedFileId,
    setSelectedFileId,
    selectedFileAudioUrl,
    setSelectedFileAudioUrl,
    codedSegments,
    setCodedSegments,
    inlineHighlights,
    setInlineHighlights,
    codeDefinitions,
    setCodeDefinitions,
    memos,
    setMemos,
    isLeftPanelCollapsed,
    setIsLeftPanelCollapsed,
    showImportedFiles,
    setShowImportedFiles,
    showCodeDefinitions,
    setShowCodeDefinitions,
    showCodedSegments,
    setShowCodedSegments,
    showMemosPanel,
    setShowMemosPanel,
    selectedHighlightColor,
    setSelectedHighlightColor,
    showHighlightColorDropdown,
    setShowHighlightColorDropdown,
    highlightColors,
    showCodeColors,
    setShowCodeColors,
    showCodeDropdown,
    setShowCodeDropdown,
    selectedCodeColor,
    setSelectedCodeColor,
    showDefineCodeModal,
    setShowDefineCodeModal,
    codeDefinitionToEdit,
    setCodeDefinitionToEdit,
    showMemoModal,
    setShowMemoModal,
    showConfirmModal,
    setShowConfirmModal,
    confirmModalData,
    setConfirmModalData,
    showCodedSegmentsTableModal,
    setShowCodedSegmentsTableModal,
    activeCodedSegmentId,
    setActiveCodedSegmentId,
    activeMemoId,
    setActiveMemoId,
    annotationToScrollToId,
    setAnnotationToScrollToId,
    expandedCodes,
    setExpandedCodes,
    expandedMemos,
    setExpandedMemos,
    leftPanelRef,
    viewerRef,
    setDefineModalBackendErrorRef,
    pinnedFiles,
    setPinnedFiles,
    toggleCodeGroup,
    toggleMemoGroup,
    handleDefineModalErrorSetter,
    handleSelectFile,
    fetchProject,
    handlePinFile,
    handleDefineCodeModalClose,
    user,
    syncGlobalProjectState,
  } = coreState;

  const { undo, redo, canUndo, canRedo, executeAction } = useHistory(selectedFileId);

  // Initialize file management
  const fileManager = useFileManager({
    projectId,
    user,
    setProject,
    setError,
    setConfirmModalData,
    setShowConfirmModal,
    setTranscriptionStatus,
    onImportSuccess,
    onRequestApiKey,
    handleSelectFile,
    setFileInEditMode,
  });

  // Initialize code system
  const codeSystem = useCodeSystem({
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
    codeDefinitions,
    setCodeDefinitions,
    viewerRef,
    executeAction,
    syncGlobalProjectState,
  });

  // Initialize annotation manager
  const annotationManager = useAnnotationManager({
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
    setShowFloatingMemoInput: coreState.setShowFloatingMemoInput,
    setActiveMemoId,
    executeAction,
    syncGlobalProjectState,
  });

  // Initialize search system
  const searchSystem = useSearchSystem({
    selectedContent,
    viewerRef,
    leftPanelRef,
    isLeftPanelCollapsed,
    showCodeColors,
    setShowCodeColors,
    setActiveCodedSegmentId,
  });

  const handleSelectFileWrapper = (file, projectOverride = null) => {
    coreState.handleSelectFile(file, projectOverride);
    searchSystem.handleClearViewerSearch();
  };

  useEffect(() => {
    searchSystem.handleClearViewerSearch();
  }, [selectedFileId]);

  // Initialize viewer selection
  const viewerSelection = useViewerSelection({
    selectedFileId,
    selectedFileName,
    viewerRef,
    isInEditMode,
    setConfirmModalData,
    setShowConfirmModal,
    setCurrentMemoSelectionInfo: annotationManager.setCurrentMemoSelectionInfo,
    setMemoToEdit: annotationManager.setMemoToEdit,
    setShowMemoModal,
    createHighlight: annotationManager.createHighlight,
    eraseHighlights: annotationManager.eraseHighlights,
    setShowHighlightColorDropdown: coreState.setShowHighlightColorDropdown,
    setShowCodeDropdown: coreState.setShowCodeDropdown,
    showFloatingMemoInput: coreState.showFloatingMemoInput,
    setShowFloatingMemoInput: coreState.setShowFloatingMemoInput,
    floatingMemoInputPosition: coreState.floatingMemoInputPosition,
    setFloatingMemoInputPosition: coreState.setFloatingMemoInputPosition,
  });

  // Update annotation manager's setShowFloatingMemoInput
  const { setShowFloatingMemoInput } = viewerSelection;

  // Wrapper function for handleAssignCode that includes currentSelectionInfo
  const handleAssignCodeWrapper = (newCodeId) => {
    viewerSelection.setShowFloatingAssignCode(false);
    return codeSystem.handleAssignCode(newCodeId, viewerSelection.currentSelectionInfo);
  };

  // Wrapper function for handleReassignCodeClick
  const handleReassignCodeClickWrapper = (codedSegment) => {
    return codeSystem.handleReassignCodeClick(
      codedSegment, 
      viewerSelection.setFloatingAssignCodePosition, 
      viewerSelection.setShowFloatingAssignCode
    );
  };

  // Return the complete interface
  return {
    // Navigation
    projectName,
    navigate,
    
    // Core project state
    project,
    projectId,
    loading,
    error,
    setError,
    transcriptionStatus,
    
    // File state
    selectedContent,
    setSelectedContent,
    selectedFileName,
    setSelectedFileName,
    selectedFileId,
    setSelectedFileId,
    selectedFileAudioUrl,
    
    // Annotation data
    codedSegments,
    setCodedSegments,
    inlineHighlights,
    setInlineHighlights,
    codeDefinitions,
    setCodeDefinitions,
    memos,
    setMemos,
    
    // UI state
    leftPanelRef,
    isLeftPanelCollapsed,
    setIsLeftPanelCollapsed,
    showImportedFiles,
    setShowImportedFiles,
    showCodeDefinitions,
    setShowCodeDefinitions,
    showCodedSegments,
    setShowCodedSegments,
    showMemosPanel,
    setShowMemosPanel,
    selectedHighlightColor,
    setSelectedHighlightColor,
    showHighlightColorDropdown,
    setShowHighlightColorDropdown,
    highlightColors,
    showCodeColors,
    setShowCodeColors,
    showCodeDropdown,
    setShowCodeDropdown,
    selectedCodeColor,
    setSelectedCodeColor,
    
    // Modal states
    showDefineCodeModal,
    setShowDefineCodeModal,
    codeDefinitionToEdit,
    setCodeDefinitionToEdit,
    showMemoModal,
    setShowMemoModal,
    showConfirmModal,
    setShowConfirmModal,
    confirmModalData,
    setConfirmModalData,
    showCodedSegmentsTableModal,
    setShowCodedSegmentsTableModal,
    
    // Active states
    activeCodedSegmentId,
    setActiveCodedSegmentId,
    activeMemoId,
    setActiveMemoId,
    annotationToScrollToId,
    setAnnotationToScrollToId,
    
    // Expansion states
    expandedCodes,
    setExpandedCodes,
    expandedMemos,
    setExpandedMemos,
    
    // Refs
    viewerRef,
    setDefineModalBackendErrorRef,
    
    // Pinned files
    pinnedFiles,
    handlePinFile,
    
    // Core functions
    toggleCodeGroup,
    toggleMemoGroup,
    handleDefineModalErrorSetter,
    fetchProject,
    createRangeFromOffsets,
    handleSelectFile: handleSelectFileWrapper,
    handleDefineCodeModalClose,
    
    // File management
    handleFileChange: fileManager.handleFileChange,
    handleTextImport: fileManager.handleTextImport,
    handleAudioImport: fileManager.handleAudioImport,
    handleCommitNewFile: fileManager.handleCommitNewFile,
    handleUpdateFileContent: fileManager.handleUpdateFileContent,
    handleRenameFile: fileManager.handleRenameFile,
    handleExportFile: fileManager.handleExportFile,
    handleDeleteFile: fileManager.handleDeleteFile,
    
    // Code system
    segmentToReassign: codeSystem.segmentToReassign,
    setSegmentToReassign: codeSystem.setSegmentToReassign,
    groupedCodedSegments: codeSystem.groupedCodedSegments,
    handleAssignCode: handleAssignCodeWrapper,
    handleReassignCodeClick: handleReassignCodeClickWrapper,
    handleSaveCodeDefinition: codeSystem.handleSaveCodeDefinition,
    handleMergeCodes: codeSystem.handleMergeCodes,
    handleSplitCodes: codeSystem.handleSplitCodes,
    handleDeleteCodeDefinition: codeSystem.handleDeleteCodeDefinition,
    handleDeleteCodedSegment: codeSystem.handleDeleteCodedSegment,
    handleExportFileCodedSegments: codeSystem.handleExportFileCodedSegments,
    handleExportToExcel: (format) => codeSystem.handleExportToExcel(format, projectName),
    handleExportOverlaps: () => codeSystem.handleExportOverlaps(projectName),
    
    // Annotation management
    currentMemoSelectionInfo: annotationManager.currentMemoSelectionInfo,
    setCurrentMemoSelectionInfo: annotationManager.setCurrentMemoSelectionInfo,
    memoToEdit: annotationManager.memoToEdit,
    setMemoToEdit: annotationManager.setMemoToEdit,
    groupedMemos: annotationManager.groupedMemos,
    handleCreateMemoForSegment: annotationManager.handleCreateMemoForSegment,
    handleSaveMemo: annotationManager.handleSaveMemo,
    handleDeleteMemo: annotationManager.handleDeleteMemo,
    handleExportMemos: annotationManager.handleExportMemos,
    
    // Search system
    searchQuery: searchSystem.searchQuery,
    setSearchQuery: searchSystem.setSearchQuery,
    searchInputRef: searchSystem.searchInputRef,
    viewerSearchQuery: searchSystem.viewerSearchQuery,
    setViewerSearchQuery: searchSystem.setViewerSearchQuery,
    viewerSearchInputRef: searchSystem.viewerSearchInputRef,
    viewerSearchMatches: searchSystem.viewerSearchMatches,
    setViewerSearchMatches: searchSystem.setViewerSearchMatches,
    currentMatchIndex: searchSystem.currentMatchIndex,
    setCurrentMatchIndex: searchSystem.setCurrentMatchIndex,
    goToNextMatch: searchSystem.goToNextMatch,
    goToPrevMatch: searchSystem.goToPrevMatch,
    handleViewerSearchChange: searchSystem.handleViewerSearchChange,
    handleClearViewerSearch: searchSystem.handleClearViewerSearch,
    
    // Viewer selection
    currentSelectionInfo: viewerSelection.currentSelectionInfo,
    setCurrentSelectionInfo: viewerSelection.setCurrentSelectionInfo,
    currentSelectionRange: viewerSelection.currentSelectionRange,
    setCurrentSelectionRange: viewerSelection.setCurrentSelectionRange,
    isInEditMode,
    activeTool: viewerSelection.activeTool,
    setActiveTool: viewerSelection.setActiveTool,
    showFloatingToolbar: viewerSelection.showFloatingToolbar,
    setShowFloatingToolbar: viewerSelection.setShowFloatingToolbar,
    floatingToolbarPosition: viewerSelection.floatingToolbarPosition,
    setFloatingToolbarPosition: viewerSelection.setFloatingToolbarPosition,
    showFloatingAssignCode: viewerSelection.showFloatingAssignCode,
    setShowFloatingAssignCode: viewerSelection.setShowFloatingAssignCode,
    floatingAssignCodePosition: viewerSelection.floatingAssignCodePosition,
    setFloatingAssignCodePosition: viewerSelection.setFloatingAssignCodePosition,
    showFloatingMemoInput: viewerSelection.showFloatingMemoInput,
    setShowFloatingMemoInput: viewerSelection.setShowFloatingMemoInput,
    floatingMemoInputPosition: viewerSelection.floatingMemoInputPosition,
    setFloatingMemoInputPosition: viewerSelection.setFloatingMemoInputPosition,
    getSelectionInfo: viewerSelection.getSelectionInfo,
    handleCodeSelectionAction: viewerSelection.handleCodeSelectionAction,
    handleHighlightSelectionAction: viewerSelection.handleHighlightSelectionAction,
    handleMemoSelectionAction: viewerSelection.handleMemoSelectionAction,
    handleEraseSelectionAction: viewerSelection.handleEraseSelectionAction,
    handleViewerMouseUp: viewerSelection.handleViewerMouseUp,
    
    // History
    undo,
    redo,
    canUndo,
    canRedo,
  };
}