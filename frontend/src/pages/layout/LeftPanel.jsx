import { useState, useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaPlus, FaSearch, FaTimes, FaCaretDown, FaCaretRight,
  FaTrashAlt, FaEdit, FaList,
} from 'react-icons/fa';
import { FaAnglesLeft, FaAnglesRight } from "react-icons/fa6";
import { CgImport, CgExport } from 'react-icons/cg';
import { AiFillAudio } from "react-icons/ai";
import { IoDocumentTextOutline } from "react-icons/io5";
import { MdOutlineVerticalSplit, MdDragIndicator } from "react-icons/md";

/**
 * A collapsible and resizable side panel that serves as the main hub for
 * managing a project's assets. It includes a global search and distinct,
 * collapsible sections for handling imported files, code definitions, coded
 * segments, and memos.
 *
 * @param {object} props - The component props.
 * @param {number} props.width - The current width of the panel in pixels.
 * @param {boolean} props.isLeftPanelCollapsed - A flag indicating if the panel is collapsed.
 * @param {(e: React.MouseEvent) => void} props.onMouseDownResize - Mouse down handler to initiate panel resizing.
 * @param {() => void} props.setIsLeftPanelCollapsed - Function to toggle the panel's collapsed state.
 * @param {React.Dispatch<React.SetStateAction<boolean>>} props.setShowImportOptionsModal - Function to show the file import modal.
 * @param {string} props.searchQuery - The current text in the search input.
 * @param {React.Dispatch<React.SetStateAction<string>>} props.setSearchQuery - Function to update the search query.
 * @param {React.RefObject<HTMLInputElement>} props.searchInputRef - Ref for the search input field.
 * @param {boolean} props.showImportedFiles - A flag to toggle the visibility of the imported files list.
 * @param {React.Dispatch<React.SetStateAction<boolean>>} props.setShowImportedFiles - Function to set the imported files visibility.
 * @param {object} props.project - The current project object, containing imported files.
 * @param {string|null} props.selectedFileId - The ID of the currently selected file.
 * @param {(file: object) => void} props.handleSelectFile - Function to handle selecting a file.
 * @param {(fileId: string, fileName: string) => void} props.handleDeleteFile - Function to handle deleting a file.
 * @param {boolean} props.showCodeDefinitions - A flag to toggle the code definitions list.
 * @param {React.Dispatch<React.SetStateAction<boolean>>} props.setShowCodeDefinitions - Function to set code definitions visibility.
 * @param {Array<object>} props.codeDefinitions - An array of all code definition objects.
 * @param {React.Dispatch<React.SetStateAction<object|null>>} props.setCodeDefinitionToEdit - Function to set the code definition to be edited.
 * @param {React.Dispatch<React.SetStateAction<boolean>>} props.setShowDefineCodeModal - Function to show the define code modal.
 * @param {(codeDefId: string, codeDefName: string) => void} props.handleDeleteCodeDefinition - Function to handle deleting a code definition.
 * @param {boolean} props.showCodedSegments - A flag to toggle the coded segments list.
 * @param {React.Dispatch<React.SetStateAction<boolean>>} props.setShowCodedSegments - Function to set coded segments visibility.
 * @param {Array<object>} props.groupedCodedSegments - An array of coded segments, grouped by code definition.
 * @param {object} props.expandedCodes - An object tracking which coded segment groups are expanded.
 * @param {(codeName: string) => void} props.toggleCodeGroup - Function to toggle the expansion of a coded segment group.
 * @param {(segmentId: string, segmentName: string) => void} props.handleDeleteCodedSegment - Function to handle deleting a coded segment.
 * @param {React.Dispatch<React.SetStateAction<boolean>>} props.setShowCodedSegmentsTableModal - Function to show the coded segments table modal.
 * @param {React.Dispatch<React.SetStateAction<string|null>>} props.setActiveCodedSegmentId - Function to set the active coded segment.
 * @param {React.Dispatch<React.SetStateAction<string|null>>} props.setAnnotationToScrollToId - Function to set an annotation ID to scroll to in the viewer.
 * @param {boolean} props.showMemosPanel - A flag to toggle the memos list.
 * @param {React.Dispatch<React.SetStateAction<boolean>>} props.setShowMemosPanel - Function to set memos list visibility.
 * @param {Array<object>} props.groupedMemos - An array of all memo objects.
 * @param {() => void} props.handleExportMemos - Function to handle exporting memos.
 * @param {(memoId: string, memoTitle: string) => void} props.handleDeleteMemo - Function to handle deleting a memo.
 * @param {React.Dispatch<React.SetStateAction<string|null>>} props.setActiveMemoId - Function to set the active memo.
 * @param {React.Dispatch<React.SetStateAction<object|null>>} props.setMemoToEdit - Function to set the memo to be edited.
 * @param {React.Dispatch<React.SetStateAction<boolean>>} props.setShowMemoModal - Function to show the memo modal.
 * @param {() => void} props.handleExportFileCodedSegments - Function to handle exporting coded segments.
 * @param {React.Dispatch<React.SetStateAction<object|null>>} props.setCodeDefinitionToView - Function to set the code definition to be viewed in details modal.
 * @param {React.Dispatch<React.SetStateAction<boolean>>} props.setShowCodeDetailsModal - Function to show the code details modal.
 * @param {React.Dispatch<React.SetStateAction<boolean>>} props.setShowSplitMergeModal - Function to show the split/merge codes modal.
 * @param {boolean} props.isEditing - A flag to disable panel content during certain operations.
 * @returns {JSX.Element} The rendered left panel component.
 */
const LeftPanel = ({
  width,
  isLeftPanelCollapsed,
  onMouseDownResize,
  setIsLeftPanelCollapsed,
  setShowImportOptionsModal,
  searchQuery,
  setSearchQuery,
  searchInputRef,
  showImportedFiles,
  setShowImportedFiles,
  project,
  selectedFileId,
  handleSelectFile,
  handleDeleteFile,
  showCodeDefinitions,
  setShowCodeDefinitions,
  codeDefinitions,
  setCodeDefinitionToEdit,
  setShowDefineCodeModal,
  handleDeleteCodeDefinition,
  showCodedSegments,
  setShowCodedSegments,
  groupedCodedSegments,
  expandedCodes,
  toggleCodeGroup,
  handleDeleteCodedSegment,
  setShowCodedSegmentsTableModal,
  setActiveCodedSegmentId,
  setAnnotationToScrollToId,
  showMemosPanel,
  setShowMemosPanel,
  groupedMemos,
  handleExportMemos,
  handleDeleteMemo,
  setActiveMemoId,
  setMemoToEdit,
  setShowMemoModal,
  handleExportFileCodedSegments,
  setCodeDefinitionToView,
  setShowCodeDetailsModal,
  setShowSplitMergeModal,
  isEditing,
}) => {
  const lowerCaseQuery = searchQuery.toLowerCase();

  const filteredFiles = project?.importedFiles?.filter(file =>
    file.name.toLowerCase().includes(lowerCaseQuery)
  ) || [];

  const filteredCodeDefinitions = codeDefinitions.filter(codeDef =>
    codeDef.name.toLowerCase().includes(lowerCaseQuery)
  );

  const filteredMemos = groupedMemos.filter(memo =>
    memo.displayTitle.toLowerCase().includes(lowerCaseQuery)
  );

  const filteredCodedSegments = groupedCodedSegments
    .map(group => ({
      ...group,
      segments: group.segments.filter(seg =>
        seg.text.toLowerCase().includes(lowerCaseQuery)
      ),
    }))
    .filter(group =>
      group.name.toLowerCase().includes(lowerCaseQuery) || group.segments.length > 0
    );

  const [showScrollFade, setShowScrollFade] = useState(false);
  const fileListRef = useRef(null);

  /**
   * Checks if the fade should be visible based on the current scroll position.
   * The fade appears if the content is overflowing AND the user is not at the bottom.
   */
  const checkScrollability = (element) => {
    if (!element || filteredFiles.length <= 4) {
      setShowScrollFade(false);
      return;
    }
    const isScrollable = element.scrollHeight - element.scrollTop - element.clientHeight > 1;
    setShowScrollFade(isScrollable);
  };


  /**
   * This effect runs when the file list content changes to set the initial
   * state of the scroll fade.
   */
  useLayoutEffect(() => {
    checkScrollability(fileListRef.current);
  }, [filteredFiles, showImportedFiles]);

  return (
    <motion.div
      animate={{ width: `${width}px` }}
      transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 30 }}
      className="relative flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-md dark:bg-gray-800"
      style={{ minWidth: `${width}px` }}
    >
      {!isLeftPanelCollapsed && (
        <div
          onMouseDown={onMouseDownResize}
          className="group absolute top-0 right-0 z-30 flex h-full w-3 cursor-col-resize items-center justify-center"
          title="Drag to resize"
        >
          <MdDragIndicator className="text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 dark:text-gray-500" />
        </div>
      )}

      <button
        onClick={() => setIsLeftPanelCollapsed()}
        className={`absolute top-9 -translate-y-1/2 rounded-full p-2 text-gray-600 shadow-lg transition-colors duration-200 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700 z-30 ${isLeftPanelCollapsed ? 'left-1' : 'right-4'}`}
        title={isLeftPanelCollapsed ? "Expand Panel" : "Collapse Panel"}
      >
        {isLeftPanelCollapsed ? <FaAnglesRight /> : <FaAnglesLeft />}
      </button>

      <div className={`flex h-full flex-col ${isEditing ? 'pointer-events-none opacity-60' : ''}`}>
        <div className="relative z-20 flex-shrink-0 bg-white px-4 py-5 dark:bg-gray-800">
          {!isLeftPanelCollapsed && (
            <div className="relative flex items-center pr-10">
              <input
                type="text"
                ref={searchInputRef}
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-gray-50 py-1.5 pl-8 pr-8 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-900 dark:focus:ring-[#F05623] dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              />
              <FaSearch className="absolute left-2 text-gray-400 dark:text-gray-500" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-12 p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  title="Clear search"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          )}
        </div>

        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: isLeftPanelCollapsed ? 0 : 1 }}
          transition={{ duration: 0.2 }}
          className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar"
        >
          {!isLeftPanelCollapsed && (
            <>
              {/* Imported Files Section */}
              <div className="mb-6">
                <div
                  className="mb-3 flex cursor-pointer items-center justify-between"
                  onClick={() => setShowImportedFiles(!showImportedFiles)}
                >
                  <h3 className="flex items-center gap-3 font-bold text-cyan-900 dark:text-[#F05623]">
                    Imported Files
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowImportOptionsModal(true);
                      }}
                      className="cursor-pointer text-base text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      title="Import File"
                    >
                      <CgImport className="text-xl" />
                    </button>
                  </h3>
                  {showImportedFiles ? <FaCaretDown /> : <FaCaretRight />}
                </div>
                <AnimatePresence>
                  {showImportedFiles && (
                    <div className="relative">
                      <motion.ul
                        ref={fileListRef}
                        onScroll={(e) => checkScrollability(e.target)}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="max-h-40 space-y-2 overflow-y-auto pr-1 custom-scrollbar"
                      >
                        {filteredFiles.length > 0 ? (
                          filteredFiles.map((file) => (
                            <li
                              key={file._id}
                              onClick={() => handleSelectFile(file)}
                              className={`flex cursor-pointer items-center justify-between rounded-md py-1 px-2 transition duration-200 ease-in-out ${file._id === selectedFileId ? 'border border-gray-300 bg-gray-200 font-semibold text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                              title={file.name}
                            >
                              <div className="flex items-center gap-2 overflow-hidden">
                                {file.sourceType === 'audio' ? (
                                  <AiFillAudio className="flex-shrink-0 text-[#F05623]" title="Transcribed Audio File" />
                                ) : (
                                  <IoDocumentTextOutline className="flex-shrink-0 text-[#1D3C87] dark:text-blue-500" title="Text File" />
                                )}
                                <span className="overflow-hidden text-ellipsis whitespace-nowrap">{file.name}</span>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteFile(file._id, file.name);
                                }}
                                className="flex-shrink-0 rounded-full p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-600"
                                title="Delete File"
                              >
                                <FaTrashAlt size={12} />
                              </button>
                            </li>
                          ))
                        ) : (
                          <li className="text-sm text-gray-500">
                            {searchQuery ? 'No files found.' : 'No files imported yet.'}
                          </li>
                        )}
                      </motion.ul>
                      {showScrollFade && (
                        <div
                          className="pointer-events-none absolute bottom-0 left-0 h-8 w-full bg-gradient-to-t from-white via-white/80 to-transparent dark:from-gray-800 dark:via-gray-800/80"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* Code Definitions Section */}
              <div className="mb-6">
                <div className="mb-2 flex cursor-pointer items-center justify-between" onClick={() => setShowCodeDefinitions(!showCodeDefinitions)}>
                  <h4 className="flex items-center gap-2 font-bold text-cyan-900 dark:text-[#F05623]">
                    Code Definitions
                    <FaPlus onClick={(e) => { e.stopPropagation(); setCodeDefinitionToEdit(null); setShowDefineCodeModal(true); }} className="cursor-pointer text-base text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" title="Define New Code" />
                    <MdOutlineVerticalSplit
                      onClick={(e) => { e.stopPropagation(); setShowSplitMergeModal(true); }}
                      className="cursor-pointer text-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      title="Split or Merge Codes"
                      size={23}
                    />
                  </h4>
                  {showCodeDefinitions ? <FaCaretDown /> : <FaCaretRight />}
                </div>
                <AnimatePresence>
                  {showCodeDefinitions && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                      <ul className="mb-2 max-h-40 space-y-1 overflow-y-auto rounded border border-gray-200 p-2 custom-scrollbar dark:border-gray-700">
                        {filteredCodeDefinitions.length > 0 ? (
                          filteredCodeDefinitions.map((codeDef) => (
                            <li
                              key={codeDef._id}
                              className="group flex cursor-pointer items-center justify-between rounded p-1 text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
                              style={{ backgroundColor: codeDef.color + '66' }}
                              title={`View details for: ${codeDef.name}`}
                              onClick={() => {
                                setCodeDefinitionToView(codeDef);
                                setShowCodeDetailsModal(true);
                              }}
                            >
                              <span className="font-medium text-sm">{codeDef.name}</span>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCodeDefinitionToEdit(codeDef);
                                    setShowDefineCodeModal(true);
                                  }}
                                  className="rounded-full p-1 text-gray-500 opacity-50 transition-opacity group-hover:opacity-100 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                  title="Edit Code Definition"
                                >
                                  <FaEdit size={12} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteCodeDefinition(codeDef._id, codeDef.name);
                                  }}
                                  className="rounded-full p-1 text-red-500 opacity-50 transition-opacity group-hover:opacity-100 hover:text-red-700 dark:text-red-400 dark:hover:text-red-600"
                                  title="Delete Code Definition"
                                >
                                  <FaTrashAlt size={12} />
                                </button>
                              </div>
                            </li>
                          ))
                        ) : (
                          <li className="text-xs text-gray-500">
                            {searchQuery ? 'No definitions found.' : 'No codes defined yet.'}
                          </li>
                        )}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Coded Segments Section */}
              <div className="mb-6">
                <div className="mb-2 flex cursor-pointer items-center justify-between" onClick={() => setShowCodedSegments(!showCodedSegments)}>
                  <h4 className="flex items-center gap-3 font-bold text-cyan-900 dark:text-[#F05623]">
                    Coded Segments
                    <FaList
                      onClick={(e) => { e.stopPropagation(); setShowCodedSegmentsTableModal(true); }}
                      className="cursor-pointer text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      title="View All Coded Segments in a Table"
                    />
                  </h4>
                  {showCodedSegments ? <FaCaretDown /> : <FaCaretRight />}
                </div>
                <AnimatePresence>
                  {showCodedSegments && (
                    <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="max-h-40 space-y-2 overflow-y-auto rounded border border-gray-200 p-2 text-xs custom-scrollbar dark:border-gray-700">
                      {filteredCodedSegments.length > 0 ? (filteredCodedSegments.map((group) => (
                        <li key={group.name} className="mb-1 rounded p-1">
                          <div className="flex cursor-pointer items-center justify-between rounded px-2 py-1 font-semibold" style={{ backgroundColor: group.color + '66' }} onClick={() => toggleCodeGroup(group.name)}>
                            <span className="text-gray-800 dark:text-white">{group.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-200">{group.segments.length}</span>
                              {expandedCodes[group.name] ? (<FaCaretDown className="text-gray-600 dark:text-gray-300" />) : (<FaCaretRight className="text-gray-600 dark:text-gray-300" />)}
                            </div>
                          </div>
                          <AnimatePresence>
                            {expandedCodes[group.name] && (
                              <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="mt-1 space-y-1 overflow-hidden pl-4">
                                {group.segments.map((seg) => (
                                  <li key={seg._id} className="group flex cursor-pointer items-center justify-between rounded bg-gray-100 p-1 text-gray-800 dark:bg-gray-700 dark:text-white" onClick={() => { setActiveCodedSegmentId(seg._id); setAnnotationToScrollToId(seg._id); }}>
                                    <span className="truncate">{`"${seg.text.substring(0, Math.min(seg.text.length, 40))}..."`}</span>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteCodedSegment(seg._id, seg.codeDefinition?.name || 'this segment'); }} className="rounded-full p-1 text-red-500 opacity-50 transition-opacity group-hover:opacity-100 hover:text-red-700 dark:text-red-400 dark:hover:text-red-600" title="Delete Coded Segment">
                                      <FaTrashAlt size={10} />
                                    </button>
                                  </li>
                                ))}
                              </motion.ul>
                            )}
                          </AnimatePresence>
                        </li>
                      ))) : (
                        <li className="text-xs text-gray-500">
                          {searchQuery ? 'No segments found.' : 'No codes yet for this file.'}
                        </li>
                      )}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>

              {/* Memos Section */}
              <div className="mb-6">
                <div className="mb-2 flex cursor-pointer items-center justify-between" onClick={() => setShowMemosPanel(!showMemosPanel)}>
                  <h4 className="flex items-center gap-3 font-bold text-cyan-900 dark:text-[#F05623]">
                    Memos
                    <CgExport onClick={(e) => { e.stopPropagation(); if (!selectedFileId) { console.error("Please select a document to export its memos."); return; } handleExportMemos(); }} className="cursor-pointer text-base text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" title="Export Memos" />
                  </h4>
                  {showMemosPanel ? <FaCaretDown /> : <FaCaretRight />}
                </div>
                <AnimatePresence>
                  {showMemosPanel && (
                    <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="max-h-40 space-y-2 overflow-y-auto rounded border border-gray-200 p-2 text-xs custom-scrollbar dark:border-gray-700">
                      {filteredMemos.length > 0 ? (filteredMemos.map((memo) => (
                        <li key={memo._id} className="group flex cursor-pointer items-center justify-between rounded bg-gray-100 p-1 text-gray-800 dark:bg-gray-700 dark:text-white" onClick={() => { setActiveMemoId(memo._id); setAnnotationToScrollToId(memo._id); }}>
                          <span className="truncate font-medium">{memo.displayTitle}</span>
                          <div className="flex items-center gap-1">
                            <button onClick={(e) => { e.stopPropagation(); setMemoToEdit(memo); setShowMemoModal(true); setActiveMemoId(memo._id); setAnnotationToScrollToId(memo._id); }} className="rounded-full p-1 text-gray-500 opacity-50 transition-opacity group-hover:opacity-100 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" title="Edit Memo">
                              <FaEdit size={12} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteMemo(memo._id, memo.title || 'this memo'); }} className="rounded-full p-1 text-red-500 opacity-50 transition-opacity group-hover:opacity-100 hover:text-red-700 dark:text-red-400 dark:hover:text-red-600" title="Delete Memo">
                              <FaTrashAlt size={10} />
                            </button>
                          </div>
                        </li>
                      ))) : (
                        <li className="text-xs text-gray-500">
                          {searchQuery ? 'No memos found.' : 'No memos yet for this file.'}
                        </li>
                      )}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default LeftPanel;
