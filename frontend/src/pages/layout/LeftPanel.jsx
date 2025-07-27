import { motion, AnimatePresence } from 'framer-motion';
import {
    FaPlus,
    FaSearch,
    FaTimes,
    FaCaretDown,
    FaCaretRight,
    FaTrashAlt,
    FaEdit,
    FaList,
} from 'react-icons/fa';
import { FaAnglesLeft, FaAnglesRight } from "react-icons/fa6";
import { CgImport, CgExport } from 'react-icons/cg';

/**
 * @component LeftPanel
 * @description A collapsible side panel for managing project files, code definitions,
 * coded segments, and memos. It includes search functionality and controls for various actions.
 */
const LeftPanel = ({
    // Panel State and Controls
    isLeftPanelCollapsed,
    setIsLeftPanelCollapsed,

    // Search Functionality
    searchQuery,
    setSearchQuery,
    searchInputRef,
    
    // Imported Files Section
    showImportedFiles,
    setShowImportedFiles,
    handleFileChange,
    project,
    selectedFileId,
    handleSelectFile,
    handleDeleteFile,

    // Code Definitions Section
    showCodeDefinitions,
    setShowCodeDefinitions,
    codeDefinitions,
    setCodeDefinitionToEdit,
    setShowDefineCodeModal,
    handleDeleteCodeDefinition,

    // Coded Segments Section
    showCodedSegments,
    setShowCodedSegments,
    groupedCodedSegments,
    expandedCodes,
    toggleCodeGroup,
    handleExportToExcel,
    handleDeleteCodedSegment,
    setShowCodedSegmentsTableModal,
    setActiveCodedSegmentId,
    setAnnotationToScrollToId,

    // Memos Section
    showMemosPanel,
    setShowMemosPanel,
    groupedMemos,
    handleExportMemos,
    handleDeleteMemo,
    setActiveMemoId,
    setMemoToEdit,
    setShowMemoModal,
}) => (
    <motion.div
        initial={{ width: '250px' }}
        animate={{ width: isLeftPanelCollapsed ? '48px' : '250px' }}
        transition={{ duration: 0.3 }}
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden flex flex-col h-full"
        style={{ minWidth: isLeftPanelCollapsed ? '48px' : '250px' }}
    >
        {/* Fixed Header: Contains the collapse/expand toggle and search bar. */}
        <div className="flex-shrink-0 px-4 py-8 relative bg-white dark:bg-gray-800 z-20">
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
                <div className="relative flex items-center pr-10">
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
                            className="absolute right-12 p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                            title="Clear search"
                        >
                            <FaTimes />
                        </button>
                    )}
                </div>
            )}
        </div>

        {/* Scrollable Content Area: Contains collapsible sections for files, codes, and memos. */}
        <motion.div
            ref={searchInputRef} 
            initial={{ opacity: 1 }}
            animate={{ opacity: isLeftPanelCollapsed ? 0 : 1 }}
            transition={{ duration: 0.2 }}
            className="flex-1 pb-4 px-4 overflow-y-auto"
        >
            {!isLeftPanelCollapsed && (
                <>
                    {/* Imported Files Section */}
                    <div className="mb-6">
                        <div
                            className="flex justify-between items-center mb-3 cursor-pointer"
                            onClick={() => setShowImportedFiles(!showImportedFiles)}
                        >
                            <h3 className="font-semibold text-[#1D3C87] dark:text-[#F05623] flex items-center gap-3">
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
                                        accept=".txt,.docx,.rtf"
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

                    {/* Code Definitions Section */}
                    <div className="mb-6">
                        <div
                            className="flex justify-between items-center mb-2 cursor-pointer"
                            onClick={() => setShowCodeDefinitions(!showCodeDefinitions)}
                        >
                            <h4 className="font-semibold text-[#1D3C87] dark:text-[#F05623] flex items-center gap-3">
                                Code Definitions
                                <FaPlus
                                    onClick={(e) => {
                                        e.stopPropagation();
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

                    {/* Coded Segments Section */}
                    <div className="mb-6">
                        <div
                            className="flex justify-between items-center mb-2 cursor-pointer"
                            onClick={() => setShowCodedSegments(!showCodedSegments)}
                        >
                            <h4 className="font-semibold text-[#1D3C87] dark:text-[#F05623] flex items-center gap-3">
                                Coded Segments
                                <span className="flex items-center gap-3">
                                    <FaList
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowCodedSegmentsTableModal(true);
                                        }}
                                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer" 
                                        title="View All Coded Segments in a Table"
                                    />
                                    <CgExport
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleExportToExcel();
                                        }}
                                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
                                        title="Export Coded Segments to Excel"
                                    />
                                </span>
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
                    
                    {/* Memos Section */}
                    <div className="mb-6">
                        <div
                            className="flex justify-between items-center mb-2 cursor-pointer"
                            onClick={() => setShowMemosPanel(!showMemosPanel)}
                        >
                            <h4 className="font-semibold text-[#1D3C87] dark:text-[#F05623] flex items-center gap-3">
                                Memos
                                <CgExport
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!selectedFileId) {
                                            // Note: Error handling logic for export is assumed to be in the parent component.
                                            // This is just a placeholder for the click handler.
                                            console.error("Please select a document to export its memos.");
                                            return;
                                        }
                                        handleExportMemos();
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
                                                            setActiveMemoId(memo._id);
                                                            setAnnotationToScrollToId(memo._id);
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
);

export default LeftPanel;
