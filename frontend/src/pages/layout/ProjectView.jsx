// Component Imports
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

// Custom Hook Import
import useProjectViewHooks from '../hooks/Hooks.jsx';

/**
 * @component ProjectView
 * @description The main view for a single project. It orchestrates the entire UI,
 * including the navbar, left panel, and document viewer. It uses the `useProjectViewHooks`
 * custom hook to manage all state and logic.
 */
const ProjectView = () => {
    // Deconstruct all state, refs, and handlers from the custom hook.
    const {
        // Project and Loading State
        projectName,
        project,
        error,
        loading,

        // File Management
        selectedContent,
        selectedFileId,
        showImportedFiles,
        setShowImportedFiles,
        handleFileChange,
        handleSelectFile,
        handleDeleteFile,

        // Code Definitions
        codeDefinitions,
        showCodeDefinitions,
        setShowCodeDefinitions,
        showDefineCodeModal,
        setShowDefineCodeModal,
        codeDefinitionToEdit,
        setCodeDefinitionToEdit,
        handleSaveCodeDefinition,
        handleDefineCodeModalClose,
        handleDeleteCodeDefinition,
        handleDefineModalErrorSetter,

        // Coded Segments & Highlights
        codedSegments,
        inlineHighlights,
        groupedCodedSegments,
        expandedCodes,
        toggleCodeGroup,
        showCodedSegments,
        setShowCodedSegments,
        showCodedSegmentsTableModal,
        setShowCodedSegmentsTableModal,
        activeCodedSegmentId,
        setActiveCodedSegmentId,
        handleAssignCode,
        handleDeleteCodedSegment,
        handleExportToExcel,

        // Memos
        memos,
        groupedMemos,
        showMemosPanel,
        setShowMemosPanel,
        showMemoModal,
        setShowMemoModal,
        memoToEdit,
        setMemoToEdit,
        currentMemoSelectionInfo,
        activeMemoId,
        setActiveMemoId,
        handleSaveMemo,
        handleDeleteMemo,
        handleExportMemos,

        // Viewer State and Controls
        viewerRef,
        viewerSearchQuery,
        viewerSearchInputRef,
        viewerSearchMatches,
        currentMatchIndex,
        handleViewerSearchChange,
        handleClearViewerSearch,
        goToNextMatch,
        goToPrevMatch,
        annotationToScrollToId,
        setAnnotationToScrollToId,

        // Selection and Toolbar/Modal related
        currentSelectionInfo,
        currentSelectionRange,
        getSelectionInfo,
        handleViewerMouseUp,

        // Floating Toolbar
        showFloatingToolbar,
        setShowFloatingToolbar,
        floatingToolbarPosition,
        handleCodeSelectionAction,
        handleHighlightSelectionAction,
        handleMemoSelectionAction,
        handleEraseSelectionAction,

        // Floating Assign Code
        showFloatingAssignCode,
        setShowFloatingAssignCode,
        floatingAssignCodePosition,

        // Floating Memo Input
        showFloatingMemoInput,
        setShowFloatingMemoInput,
        floatingMemoInputPosition,

        // Highlight & Viewer Tools
        activeTool,
        setActiveTool,
        highlightColors,
        selectedHighlightColor,
        setSelectedHighlightColor,
        showHighlightColorDropdown,
        setShowHighlightColorDropdown,
        showCodeColors,
        setShowCodeColors,
        showCodeDropdown,
        setShowCodeDropdown,

        // Confirmation Modal
        showConfirmModal,
        setShowConfirmModal,
        confirmModalData,
        setConfirmModalData,

        // Left Panel
        isLeftPanelCollapsed,
        setIsLeftPanelCollapsed,
        searchQuery,
        setSearchQuery,
        searchInputRef,

        // Utility
        createRangeFromOffsets,
    } = useProjectViewHooks();

    // Display loading or error states
    if (loading) return <div className="text-center mt-10 text-gray-500">Loading...</div>;
    if (error) return <div className="text-center mt-10 text-red-600">{error}</div>;

    return (
        <div className="min-h-screen bg-gray-200 dark:bg-gray-900 text-gray-800 dark:text-white">
            <Navbar
                projectName={projectName}
                projectID={project?.projectId}
            />
            
            {/* Main Content Area */}
            <div className="px-3 pt-17 h-[calc(100vh-theme(space.5))]">
                <div className="flex gap-3 h-full">
                    <LeftPanel
                        isLeftPanelCollapsed={isLeftPanelCollapsed}
                        setIsLeftPanelCollapsed={setIsLeftPanelCollapsed}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        searchInputRef={searchInputRef}
                        showImportedFiles={showImportedFiles}
                        setShowImportedFiles={setShowImportedFiles}
                        handleFileChange={handleFileChange}
                        project={project}
                        selectedFileId={selectedFileId}
                        handleSelectFile={handleSelectFile}
                        handleDeleteFile={handleDeleteFile}
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
                        handleExportToExcel={handleExportToExcel}
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
                    />

                    <DocumentViewer
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
                    />
                </div>
            </div>

            {/* Floating UI Elements */}
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
                    onClose={() => setShowFloatingAssignCode(false)}
                    onAssignCode={handleAssignCode}
                    codeDefinitions={codeDefinitions}
                    onDefineNewCode={() => {
                        setShowFloatingAssignCode(false);
                        if (!selectedFileId) {
                            setConfirmModalData({
                                title: 'Define Code Error',
                                message: 'Please select a document to define a code.',
                                onConfirm: () => setShowConfirmModal(false),
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
                    x={floatingMemoInputPosition.left}
                    y={floatingMemoInputPosition.top}
                    onClose={() => setShowFloatingMemoInput(false)}
                    onSave={handleSaveMemo}
                    selectionInfo={currentMemoSelectionInfo}
                    allMemos={project?.memos || []}
                />
            )}

            {/* Modals */}
            <DefineCodeModal
                show={showDefineCodeModal}
                onClose={handleDefineCodeModalClose}
                onSave={handleSaveCodeDefinition}
                initialCode={codeDefinitionToEdit}
                onBackendError={handleDefineModalErrorSetter}
            />
            <MemoModal
                show={showMemoModal}
                onClose={() => {
                    setShowMemoModal(false);
                    setMemoToEdit(null);
                    window.getSelection().removeAllRanges();
                }}
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
                message={confirmModalData.message}
            />
            <CodedSegmentsTableModal
                show={showCodedSegmentsTableModal}
                onClose={() => setShowCodedSegmentsTableModal(false)}
                codedSegments={codedSegments}
                codeDefinitions={codeDefinitions}
                projectName={project.name}
                handleExportToExcel={handleExportToExcel}
            />
        </div>
    );
};

export default ProjectView;
