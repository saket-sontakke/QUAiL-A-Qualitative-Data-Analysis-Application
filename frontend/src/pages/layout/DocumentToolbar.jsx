import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaSearch,
  FaChevronUp,
  FaChevronDown,
  FaTimes,
  FaCaretDown,
  FaHighlighter,
  FaEraser,
  FaStickyNote,
  FaSearchPlus,
  FaSearchMinus,
  FaCheck,
  FaArrowLeft,
  FaUndo,
  FaRedo,
} from 'react-icons/fa';
import { MdCode, MdCodeOff, MdFormatLineSpacing } from 'react-icons/md';

const highlightColors = [
  { name: 'Yellow', value: '#FFFF00', cssClass: 'bg-yellow-300' },
  { name: 'Green', value: '#00FF00', cssClass: 'bg-green-300' },
  { name: 'Blue', value: '#ADD8E6', cssClass: 'bg-blue-300' },
  { name: 'Pink', value: '#FFC0CB', cssClass: 'bg-pink-300' },
];

/**
 * A comprehensive toolbar for the document viewer interface. It provides a wide
 * range of functionalities including text searching, formatting controls (font size,
 * line spacing), undo/redo actions, and a set of mutually exclusive tools for

 * annotation (coding, memos, highlighting, erasing).
 *
 * @param {object} props - The component props.
 * @param {string|null} props.activeTool - The currently active tool ('code', 'memo', 'highlight', 'erase').
 * @param {React.Dispatch<React.SetStateAction<string|null>>} props.setActiveTool - Function to set the active tool.
 * @param {boolean} props.showCodeColors - State indicating if coded segments should be colored.
 * @param {React.Dispatch<React.SetStateAction<boolean>>} props.setShowCodeColors - Function to set the code color visibility.
 * @param {boolean} props.showCodeDropdown - State controlling the visibility of the code tool's dropdown.
 * @param {React.Dispatch<React.SetStateAction<boolean>>} props.setShowCodeDropdown - Function to set the code dropdown visibility.
 * @param {boolean} props.showHighlightColorDropdown - State controlling the visibility of the highlight color picker.
 * @param {React.Dispatch<React.SetStateAction<boolean>>} props.setShowHighlightColorDropdown - Function to set the highlight color picker visibility.
 * @param {string} props.selectedHighlightColor - The currently selected color for the highlight tool.
 * @param {React.Dispatch<React.SetStateAction<string>>} props.setSelectedHighlightColor - Function to set the highlight color.
 * @param {React.Dispatch<React.SetStateAction<string|null>>} props.setActiveCodedSegmentId - Function to set the ID of the currently active (hovered) coded segment.
 * @param {number} props.fontSize - The current font size for the document viewer.
 * @param {React.Dispatch<React.SetStateAction<number>>} props.setFontSize - Function to set the font size.
 * @param {number} props.lineHeight - The current line height for the document viewer.
 * @param {React.Dispatch<React.SetStateAction<number>>} props.setLineHeight - Function to set the line height.
 * @param {boolean} props.showLineHeightDropdown - State controlling the visibility of the line height dropdown.
 * @param {React.Dispatch<React.SetStateAction<boolean>>} props.setShowLineHeightDropdown - Function to set the line height dropdown visibility.
 * @param {React.RefObject<HTMLInputElement>} props.viewerSearchInputRef - Ref for the search input field.
 * @param {string} props.viewerSearchQuery - The current search query text.
 * @param {(e: React.ChangeEvent<HTMLInputElement>) => void} props.handleViewerSearchChange - Handler for changes to the search input.
 * @param {Array<any>} props.viewerSearchMatches - An array of search match results.
 * @param {number} props.currentMatchIndex - The index of the currently highlighted search match.
 * @param {() => void} props.goToPrevMatch - Function to navigate to the previous search match.
 * @param {() => void} props.goToNextMatch - Function to navigate to the next search match.
 * @param {() => void} props.handleClearViewerSearch - Function to clear the search query and results.
 * @param {React.Dispatch<React.SetStateAction<boolean>>} props.setShowFloatingToolbar - Function to control the visibility of the selection toolbar.
 * @param {React.Dispatch<React.SetStateAction<boolean>>} props.setShowMemoModal - Function to control the visibility of the memo modal.
 * @param {React.Dispatch<React.SetStateAction<boolean>>} props.setShowFloatingAssignCode - Function to control the visibility of the code assignment popover.
 * @param {React.Dispatch<React.SetStateAction<boolean>>} props.setShowFloatingMemoInput - Function to control the visibility of the memo input popover.
 * @param {boolean} props.isEditing - A flag indicating if the document is in text-editing mode, which disables the toolbar.
 * @param {() => void} props.onUndo - The callback function for the undo action.
 * @param {() => void} props.onRedo - The callback function for the redo action.
 * @param {boolean} props.canUndo - A flag indicating if an undo action is available.
 * @param {boolean} props.canRedo - A flag indicating if a redo action is available.
 * @returns {JSX.Element} The rendered document toolbar component.
 */
const DocumentToolbar = ({
  activeTool,
  setActiveTool,
  showCodeColors,
  setShowCodeColors,
  showCodeDropdown,
  setShowCodeDropdown,
  showHighlightColorDropdown,
  setShowHighlightColorDropdown,
  selectedHighlightColor,
  setSelectedHighlightColor,
  setActiveCodedSegmentId,
  fontSize,
  setFontSize,
  lineHeight,
  setLineHeight,
  showLineHeightDropdown,
  setShowLineHeightDropdown,
  viewerSearchInputRef,
  viewerSearchQuery,
  handleViewerSearchChange,
  viewerSearchMatches,
  currentMatchIndex,
  goToPrevMatch,
  goToNextMatch,
  handleClearViewerSearch,
  setShowFloatingToolbar,
  setShowMemoModal,
  setShowFloatingAssignCode,
  setShowFloatingMemoInput,
  isEditing,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) => {
  const lineSpacingOptions = [1.5, 2, 2.5, 3];
  const dropdownRef = useRef(null);
  const [isCustomInputVisible, setIsCustomInputVisible] = useState(false);
  const [customLineHeight, setCustomLineHeight] = useState(lineHeight.toString());

  const handleSetCustomSpacing = () => {
    const newValue = parseFloat(customLineHeight);
    if (!isNaN(newValue) && newValue >= 1.0 && newValue <= 4.0) {
      setLineHeight(newValue);
      setShowLineHeightDropdown(false);
    } else {
      alert('Invalid input. Please enter a number between 1.0 and 4.0.');
    }
  };

  /**
   * Effect to handle clicks outside of the line-height dropdown to close it.
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowLineHeightDropdown(false);
      }
    };
    if (showLineHeightDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    if (!showLineHeightDropdown) {
      setIsCustomInputVisible(false);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLineHeightDropdown, setShowLineHeightDropdown]);

  return (
    <div id="viewer-toolbar" className="flex items-center justify-between rounded-t-lg border-b border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-2">
        <h3 className="ml-4 text-md font-bold text-cyan-900 dark:text-[#F05623]">Document Viewer</h3>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex items-center">
          <input
            type="text"
            ref={viewerSearchInputRef}
            placeholder="Search..."
            value={viewerSearchQuery}
            onChange={handleViewerSearchChange}
            className="w-64 rounded-md border border-gray-300 bg-gray-50 py-1.5 pl-8 pr-28 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:ring-[#F05623]"
          />
          <FaSearch className="absolute left-2 text-gray-400 dark:text-gray-500" />
          {viewerSearchQuery && (
            <div className="absolute right-0 flex h-full items-center gap-1 pr-4">
              <span className="whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
                {viewerSearchMatches.length > 0 ? `${currentMatchIndex + 1}/${viewerSearchMatches.length}` : '0/0'}
              </span>
              <div className="flex">
                <button
                  onClick={goToPrevMatch}
                  disabled={viewerSearchMatches.length === 0}
                  className="rounded-sm p-1 text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-600"
                  title="Previous"
                >
                  <FaChevronUp size={12} />
                </button>
                <button
                  onClick={goToNextMatch}
                  disabled={viewerSearchMatches.length === 0}
                  className="rounded-sm p-1 text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-600"
                  title="Next"
                >
                  <FaChevronDown size={12} />
                </button>
              </div>
              <button onClick={handleClearViewerSearch} className="p-1 text-gray-600 hover:text-gray-800 dark:text-gray-500 dark:hover:text-gray-300" title="Clear">
                <FaTimes />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 rounded-md border border-gray-200 p-1 shadow-sm dark:border-gray-700">
          <button onClick={() => setFontSize(size => Math.max(8, size - 1))} className="rounded-sm p-1 text-gray-700 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-600" title="Zoom Out">
            <FaSearchMinus size={14} />
          </button>
          <span onClick={() => setFontSize(14)} className="w-10 cursor-pointer select-none rounded-sm py-1 text-center text-xs font-semibold text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-600" title="Reset to Default (14px)">
            {fontSize}px
          </span>
          <button onClick={() => setFontSize(size => Math.min(32, size + 1))} className="rounded-sm p-1 text-gray-700 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-600" title="Zoom In">
            <FaSearchPlus size={14} />
          </button>
        </div>

        <div ref={dropdownRef} className="relative">
          <div className="flex items-center gap-1 rounded-md border border-gray-200 p-1 shadow-sm dark:border-gray-700">
            <button
              onClick={() => {
                setShowLineHeightDropdown(prev => !prev);
                setShowHighlightColorDropdown(false);
                setShowCodeDropdown(false);
              }}
              className="rounded-sm p-1 text-gray-700 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-600"
              title="Line Spacing"
            >
              <MdFormatLineSpacing size={14} />
            </button>
          </div>
          <AnimatePresence>
            {showLineHeightDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="color-dropdown-menu absolute right-0 z-50 mt-2 w-24 rounded-lg bg-white p-2 shadow-lg dark:bg-gray-700"
              >
                {isCustomInputVisible ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setIsCustomInputVisible(false)} className="rounded-sm p-1 text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-600" title="Back">
                        <FaArrowLeft size={12} />
                      </button>
                      <input
                        type="number"
                        step="0.05"
                        min="1.0"
                        max="4.0"
                        value={customLineHeight}
                        onChange={(e) => setCustomLineHeight(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleSetCustomSpacing()}
                        className="w-full rounded-md bg-gray-100 p-0.5 text-center text-sm focus:outline-none focus:ring-1 focus:ring-cyan-900 dark:bg-gray-800 dark:focus:ring-[#F05623]"
                      />
                    </div>
                    <button onClick={handleSetCustomSpacing} className="w-full rounded-md bg-cyan-800 py-1 text-xs font-bold text-white hover:bg-cyan-700 dark:bg-[#F05623] dark:hover:bg-orange-700">
                      Set
                    </button>
                  </div>
                ) : (
                  <>
                    {lineSpacingOptions.map((spacing) => (
                      <button
                        key={spacing}
                        onClick={() => {
                          setLineHeight(spacing);
                          setShowLineHeightDropdown(false);
                        }}
                        className="flex w-full items-center justify-between rounded-md px-2 py-1 text-sm text-gray-800 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-600"
                      >
                        <span>{spacing % 1 === 0 ? spacing.toFixed(1) : spacing}</span>
                        {lineHeight === spacing && <FaCheck size={14} className="text-cyan-900 dark:text-gray-300" />}
                      </button>
                    ))}
                    <hr className="my-1 border-gray-300 dark:border-gray-600" />
                    <button
                      onClick={() => {
                        setCustomLineHeight(lineHeight.toString());
                        setIsCustomInputVisible(true);
                      }}
                      className="w-full rounded-md px-2 py-1 text-left text-xs text-gray-800 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-600"
                    >
                      Custom
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className={`relative flex gap-2 rounded-md ${isEditing ? 'pointer-events-none opacity-50' : ''}`}>
          <div className="flex items-center gap-1 rounded-md border border-gray-200 p-1 shadow-sm dark:border-gray-700">
            <button onClick={onUndo} disabled={!canUndo} className="rounded-sm p-1 text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-600" title="Undo (Ctrl+Z)">
              <FaUndo size={14} />
            </button>
            <div className="h-4 w-px bg-gray-200 dark:bg-gray-600"></div>
            <button onClick={onRedo} disabled={!canRedo} className="rounded-sm p-1 text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-600" title="Redo (Ctrl+Y)">
              <FaRedo size={14} />
            </button>
          </div>

          <div className="relative flex rounded-md shadow-sm">
            <button onClick={() => { setActiveTool(prev => (prev === 'code' ? null : 'code')); setShowFloatingToolbar(false); setShowHighlightColorDropdown(false); setShowCodeDropdown(false); setShowMemoModal(false); setShowFloatingAssignCode(false); setShowFloatingMemoInput(false); }} className={`flex items-center rounded-l-md px-3 py-2 transition-all duration-200 ${activeTool === 'code' ? 'bg-gray-300 dark:bg-gray-700' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`} title="Code Text">
              {showCodeColors ? <MdCode className="text-lg text-gray-800 dark:text-white" /> : <MdCodeOff className="text-lg text-gray-800 dark:text-white" />}
            </button>
            <button onClick={() => { setShowCodeDropdown(prev => { const next = !prev; if (next) setShowHighlightColorDropdown(false); return next; }); }} className="rounded-r-md border-l border-gray-300 p-2 pl-1 hover:bg-gray-200 dark:border-gray-600 dark:hover:bg-gray-700" title="Code Display Options">
              <FaCaretDown className="text-gray-600 dark:text-gray-300" />
            </button>
            <AnimatePresence>
              {showCodeDropdown && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="code-dropdown-menu absolute right-0 z-50 mt-12 w-32 rounded-lg bg-white p-2 shadow-lg dark:bg-gray-700">
                  <button onClick={() => { setShowCodeColors(true); setShowCodeDropdown(false); setActiveCodedSegmentId(null); }} className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs ${showCodeColors ? 'bg-gray-200 dark:bg-gray-600' : 'hover:bg-gray-100 dark:hover:bg-gray-600'}`} title="Enable Colored Codes">
                    <MdCode size={18} /> <span className="truncate">Show Codes</span>
                  </button>
                  <button onClick={() => { setShowCodeColors(false); setShowCodeDropdown(false); setActiveCodedSegmentId(null); }} className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs ${!showCodeColors ? 'bg-gray-200 dark:bg-gray-600' : 'hover:bg-gray-100 dark:hover:bg-gray-600'}`} title="Disable Colored Codes">
                    <MdCodeOff size={18} /> <span className="truncate">Hide Codes</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative flex rounded-md shadow-sm">
            <button onClick={() => { setActiveTool(prev => (prev === 'memo' ? null : 'memo')); setShowFloatingToolbar(false); setShowHighlightColorDropdown(false); setShowCodeDropdown(false); setShowMemoModal(false); setShowFloatingAssignCode(false); setShowFloatingMemoInput(false); }} className={`flex items-center rounded-md px-3 py-2 transition-all duration-200 ${activeTool === 'memo' ? 'bg-gray-300 dark:bg-gray-700' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`} title="Create/View Memos">
              <FaStickyNote className="text-lg text-yellow-400 dark:text-yellow-300" />
            </button>
          </div>

          <div className="relative flex rounded-md shadow-sm">
            <button onClick={() => { setActiveTool(prev => (prev === 'highlight' ? null : 'highlight')); setShowFloatingToolbar(false); setShowCodeDropdown(false); setShowMemoModal(false); setShowFloatingAssignCode(false); setShowFloatingMemoInput(false); }} className={`flex items-center rounded-l-md p-2 pr-1 transition-all duration-200 ${activeTool === 'highlight' ? 'bg-gray-300 dark:bg-gray-700' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`} title="Highlight Text">
              <FaHighlighter className="mr-1 text-lg" style={{ color: selectedHighlightColor }} />
            </button>
            <button onClick={() => { setShowHighlightColorDropdown(prev => { const next = !prev; if (next) { setShowCodeDropdown(false); setShowMemoModal(false); } return next; }); }} className="rounded-r-md border-l border-gray-300 p-2 pl-1 hover:bg-gray-200 dark:border-gray-600 dark:hover:bg-gray-700" title="Select Highlight Color">
              <FaCaretDown className="text-gray-600 dark:text-gray-300" />
            </button>
            <AnimatePresence>
              {showHighlightColorDropdown && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="color-dropdown-menu absolute right-0 z-50 mt-12 w-32 rounded-lg bg-white p-2 shadow-lg dark:bg-gray-700">
                  <div className="grid grid-cols-4 gap-2">
                    {highlightColors.map((colorOption) => (
                      <button key={colorOption.name} onClick={() => { setSelectedHighlightColor(colorOption.value); setShowHighlightColorDropdown(false); }} className={`h-6 w-6 rounded-full border-2 transition-all duration-200 ease-in-out ${colorOption.cssClass} ${selectedHighlightColor === colorOption.value ? 'border-gray-800 dark:border-white' : 'border-transparent'}`} title={colorOption.name}></button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative flex rounded-md shadow-sm">
            <button onClick={() => { setActiveTool(prev => (prev === 'erase' ? null : 'erase')); setShowFloatingToolbar(false); setShowHighlightColorDropdown(false); setShowCodeDropdown(false); setShowMemoModal(false); setShowFloatingAssignCode(false); setShowFloatingMemoInput(false); }} className={`flex items-center rounded-md px-3 py-2 transition-all duration-200 ${activeTool === 'erase' ? 'bg-gray-300 dark:bg-gray-700' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`} title="Erase Highlights">
              <FaEraser className="text-lg text-gray-800 dark:text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentToolbar;