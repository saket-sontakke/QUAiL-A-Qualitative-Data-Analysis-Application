import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaPlus, FaSearch, FaTimes, FaCaretDown, FaCaretRight,
  FaTrashAlt, FaEdit, FaList, FaCheck
} from 'react-icons/fa';
import { TbLockOff } from "react-icons/tb";
import { FaAnglesLeft, FaAnglesRight } from "react-icons/fa6";
import { CgImport } from 'react-icons/cg';
import { PiExportBold } from "react-icons/pi";
import { AiFillAudio } from "react-icons/ai";
import { IoDocumentTextOutline } from "react-icons/io5";
import { MdOutlineVerticalSplit, MdDragIndicator, MdOutlineMoreVert } from "react-icons/md";
import { RiPushpinFill, RiUnpinFill } from "react-icons/ri";
import ConfirmationModal from '../components/ConfirmationModal.jsx';

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
  handlePinFile,
  pinnedFiles,
  handleRenameFile,
  handleExportFile,
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
  fileInEditMode
}) => {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [renamingFileId, setRenamingFileId] = useState(null);
  const [newBaseName, setNewBaseName] = useState('');
  const [fileExtension, setFileExtension] = useState('');
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [exportMenuFileId, setExportMenuFileId] = useState(null);
  const menuRef = useRef(null);
  const [showRenameErrorModal, setShowRenameErrorModal] = useState(false);
  const [renameErrorMessage, setRenameErrorMessage] = useState('');

  const handleConfirmRename = async (file) => {
      if (!newBaseName.trim()) return;

      const finalNewName = (newBaseName.trim() + fileExtension);
      
      // We don't need try/catch here anymore because handleRenameFile handles it safely
      const result = await handleRenameFile(file, finalNewName);

      if (result.success) {
          // Success! Close the edit box
          setRenamingFileId(null); 
      } else {
          // Failure! The hook caught the error and returned { success: false, error: "..." }
          console.error("Rename failed:", result.error);
          
          // Use the error message returned from your hook
          setRenameErrorMessage(result.error);
          
          // Or, if you want to be specific about duplicates, check the text:
          // if (result.error.includes("already exists")) { ... }
          
          setShowRenameErrorModal(true);
      }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const lowerCaseQuery = searchQuery.toLowerCase();

  const filesToShow = [...(project?.importedFiles || [])];

  if (isEditing && fileInEditMode && fileInEditMode.isStaged) {
      filesToShow.unshift({ ...fileInEditMode, _id: 'staged-file' });
  }

  const sortedAndFilteredFiles = filesToShow
    .filter(file => file.name.toLowerCase().includes(lowerCaseQuery))
    .sort((a, b) => {
      const isAPinned = pinnedFiles.includes(a._id);
      const isBPinned = pinnedFiles.includes(b._id);
      if (isAPinned && !isBPinned) return -1;
      if (!isAPinned && isBPinned) return 1;
      if (a._id === 'staged-file') return -1;
      if (b._id === 'staged-file') return 1;
      return a.name.localeCompare(b.name);
    });

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

  const checkScrollability = (element) => {
    if (!element || sortedAndFilteredFiles.length <= 4) {
      setShowScrollFade(false);
      return;
    }
    const isScrollable = element.scrollHeight - element.scrollTop - element.clientHeight > 1;
    setShowScrollFade(isScrollable);
  };

  useLayoutEffect(() => {
    checkScrollability(fileListRef.current);
  }, [sortedAndFilteredFiles, showImportedFiles]);

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
        <div className="relative z-20 shrink-0 bg-white px-4 py-5 dark:bg-gray-800">
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
                      {sortedAndFilteredFiles.length > 0 ? (
                        sortedAndFilteredFiles.map((file) => {
                          const isPinned = pinnedFiles.includes(file._id);
                          const isLocked = file.isLocked === true;
                          const isStaged = file._id === 'staged-file';
                          
                          return (
                            <li
                              key={file._id}
                              onClick={() => {
                                if (renamingFileId !== file._id && !isStaged) {
                                  handleSelectFile(file);
                                }
                              }}
                              className={`group flex items-center justify-between rounded-md py-1 px-2 transition duration-200 ease-in-out ${
                                file._id === selectedFileId 
                                  ? 'border border-gray-300 bg-gray-200 font-semibold text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200' 
                                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                              } ${isStaged ? 'opacity-70 cursor-default' : 'cursor-pointer'}`}
                              title={file.name}
                            >
                              <div className="flex flex-1 items-center gap-2 overflow-hidden">
                                {isPinned && <RiPushpinFill className="shrink-0 text-gray-500 dark:text-gray-300" title="Pinned File" />}
                                
                                {!isLocked && !isStaged && (
                                  <TbLockOff className="shrink-0 text-yellow-600 dark:text-yellow-500" title="In edit mode - not finalized yet" />
                                )}
                                
                                {file.sourceType === 'audio' ? (
                                  <AiFillAudio className="shrink-0 text-[#F05623]" title="Transcribed Audio File" />
                                ) : (
                                  <IoDocumentTextOutline className="shrink-0 text-[#1D3C87] dark:text-blue-500" title="Text File" />
                                )}
                                
                                {renamingFileId === file._id ? (
                                  <div className="flex w-full items-center gap-1">
                                    <div className="flex w-full items-center rounded border border-gray-400 bg-white dark:border-gray-500 dark:bg-gray-600">
                                      <input
                                        type="text"
                                        value={newBaseName}
                                        onChange={(e) => setNewBaseName(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleConfirmRename(file);
                                          if (e.key === 'Escape') setRenamingFileId(null);
                                        }}
                                        onBlur={() => setRenamingFileId(null)}
                                        className="w-full bg-transparent px-1 text-sm text-gray-900 outline-none dark:text-white"
                                        autoFocus
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                      <span className="shrink-0 pr-1 text-sm text-gray-500 dark:text-gray-400">
                                        {fileExtension}
                                      </span>
                                    </div>
                                    <button
                                      // Prevent click if empty
                                      disabled={!newBaseName.trim()} 
                                      onMouseDown={(e) => {
                                        e.stopPropagation();
                                        handleConfirmRename(file);
                                      }}
                                      // Add conditional styling for opacity and cursor
                                      className={`rounded p-1 text-green-500 hover:bg-green-100 dark:hover:bg-gray-600 ${
                                        !newBaseName.trim() ? 'opacity-50 cursor-not-allowed' : ''
                                      }`}
                                      title="Confirm"
                                    >
                                      <FaCheck size={12} />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setRenamingFileId(null);
                                      }}
                                      className="rounded p-1 text-red-500 hover:bg-red-100 dark:hover:bg-gray-600"
                                      title="Cancel"
                                    >
                                      <FaTimes size={12} />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                                    {file.name}
                                    {isStaged && <em className="ml-2 text-xs text-gray-500 dark:text-gray-400">(editing...)</em>}
                                  </span>
                                )}
                              </div>
                              
                              {renamingFileId !== file._id && (
                                <div className="shrink-0">
                                  {!isStaged && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const menuWidth = 128;
                                        setMenuPosition({ top: rect.bottom, left: rect.right - menuWidth });
                                        setOpenMenuId(openMenuId === file._id ? null : file._id);
                                      }}
                                      className="rounded-full p-1 text-gray-500 opacity-0 group-hover:opacity-100 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                                      title="More options"
                                    >
                                      <MdOutlineMoreVert size={16} />
                                    </button>
                                  )}
                                  {openMenuId === file._id && (
                                    <div
                                      ref={menuRef}
                                      className="fixed z-50 mt-1 w-32 rounded-md bg-white py-1 shadow-lg dark:bg-gray-900"
                                      style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
                                      onMouseLeave={() => setExportMenuFileId(null)}
                                      // Added this to prevent clicks in empty space of menu from bubbling
                                      onClick={(e) => e.stopPropagation()} 
                                    >
                                      <a href="#" onClick={(e) => { 
                                          e.preventDefault(); 
                                          e.stopPropagation(); // Added stopPropagation
                                          handlePinFile(file._id); 
                                          setOpenMenuId(null); 
                                      }} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800">
                                        {isPinned ? <RiUnpinFill /> : <RiPushpinFill />}
                                        <span>{isPinned ? 'Unpin' : 'Pin'}</span>
                                      </a>
                                      <a href="#" onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation(); // Added stopPropagation
                                        const originalName = file.name;
                                        const lastDot = originalName.lastIndexOf('.');
                                        const baseName = lastDot === -1 ? originalName : originalName.substring(0, lastDot);
                                        const extension = lastDot === -1 ? '' : originalName.substring(lastDot);
                                        setNewBaseName(baseName);
                                        setFileExtension(extension);
                                        setRenamingFileId(file._id);
                                        setOpenMenuId(null);
                                      }} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800">
                                        <FaEdit />
                                        <span>Rename</span>
                                      </a>
                                      <a href="#" onClick={(e) => { 
                                          e.preventDefault(); 
                                          e.stopPropagation(); // Added stopPropagation
                                          handleDeleteFile(file._id, file.name); 
                                          setOpenMenuId(null); 
                                      }} className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-gray-800">
                                        <FaTrashAlt />
                                        <span>Delete</span>
                                      </a>
                                      <div 
                                        className="relative" 
                                        onMouseEnter={() => setExportMenuFileId(file._id)} 
                                        onMouseLeave={() => setExportMenuFileId(null)}
                                      >
                                        <div className="flex cursor-pointer items-center justify-between gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800">
                                          <div className="flex items-center gap-2">
                                            <PiExportBold />
                                            <span>Export</span>
                                          </div>
                                          <FaCaretRight />
                                        </div>
                                        <AnimatePresence>
                                          {exportMenuFileId === file._id && (
                                            <motion.div 
                                              initial={{ opacity: 0, x: -10 }}
                                              animate={{ opacity: 1, x: 0 }}
                                              exit={{ opacity: 0, x: -10 }}
                                              transition={{ duration: 0.15 }}
                                              className="absolute left-full -top-1 z-10 w-32 rounded-md bg-white py-1 shadow-lg dark:bg-gray-900"
                                            >
                                              <a href="#" onClick={(e) => { 
                                                  e.preventDefault(); 
                                                  e.stopPropagation(); // Added stopPropagation
                                                  handleExportFile(file, 'pdf'); 
                                                  setOpenMenuId(null); 
                                              }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800">
                                                PDF
                                              </a>
                                              <a href="#" onClick={(e) => { 
                                                  e.preventDefault(); 
                                                  e.stopPropagation(); // Added stopPropagation
                                                  handleExportFile(file, 'docx'); 
                                                  setOpenMenuId(null); 
                                              }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800">
                                                Word (.docx)
                                              </a>
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </li>
                          );
                        })
                      ) : (
                        <li className="text-sm text-gray-500">
                          {searchQuery ? 'No files found.' : 'No files imported yet.'}
                        </li>
                      )}

                      </motion.ul>
                      {showScrollFade && (
                        <div
                          className="pointer-events-none absolute bottom-0 left-0 h-8 w-full bg-linear-to-t from-white via-white/80 to-transparent dark:from-gray-800 dark:via-gray-800/80"
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
                    <PiExportBold onClick={(e) => { e.stopPropagation(); if (!selectedFileId) { console.error("Please select a document to export its memos."); return; } handleExportMemos(); }} className="cursor-pointer text-base text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" title="Export Memos" />
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

      <ConfirmationModal
        show={showRenameErrorModal}
        title="Rename Failed"
        shortMessage={renameErrorMessage}
        confirmText="Okay"
        showCancelButton={false}
        onClose={() => setShowRenameErrorModal(false)}
        onConfirm={() => setShowRenameErrorModal(false)}
      />
    </motion.div>
  );
};

export default LeftPanel;