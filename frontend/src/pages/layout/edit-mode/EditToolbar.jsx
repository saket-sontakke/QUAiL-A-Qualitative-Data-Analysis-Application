import React, { useState, useEffect, useRef } from 'react';
import { FaSave, FaSearch, FaChevronUp, FaChevronDown, FaUndo, FaRedo, FaInfoCircle, FaTimes, FaLightbulb, FaSearchPlus, FaSearchMinus, FaCheck, FaArrowLeft, FaLock } from 'react-icons/fa';
import { MdFindReplace, MdFormatLineSpacing } from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';

const EditToolbar = ({
  onSave,
  onLock,
  onCancel, // <--- New Prop
  hasUnsavedChanges,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  showFind,
  onToggleFind,
  showFindReplace,
  onToggleFindReplace,
  findQuery,
  onFindChange,
  replaceQuery,
  onReplaceChange,
  onFindNext,
  onFindPrev,
  onReplaceOne,
  onReplaceAll,
  matchesCount,
  currentMatchIndex,
  initialShowTip,
  onDismissTip,
  fontSize,
  setFontSize,
  lineHeight,
  setLineHeight,
  showLineHeightDropdown,
  setShowLineHeightDropdown,
}) => {
  const [isTipVisible, setIsTipVisible] = useState(false);
  const tipRef = useRef(null);
  const dropdownRef = useRef(null);

  const lineSpacingOptions = [1.5, 2, 2.5, 3];
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

  // Logic to handle auto-showing the tip based on LocalStorage preference
  useEffect(() => {
    // Check if user has previously opted to hide the tip
    const shouldHide = localStorage.getItem('hideFormattingTip') === 'true';

    if (initialShowTip && !shouldHide) {
      setIsTipVisible(true);
      const timer = setTimeout(() => {
        setIsTipVisible(false);
        onDismissTip();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [initialShowTip, onDismissTip]);
  
  const handleCloseTip = () => {
    setIsTipVisible(false);
    onDismissTip();
  };

  // Handler for the "Never show again" checkbox
  const handleNeverShowChange = (e) => {
    if (e.target.checked) {
      localStorage.setItem('hideFormattingTip', 'true');
    } else {
      localStorage.removeItem('hideFormattingTip');
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tipRef.current && !tipRef.current.contains(event.target)) {
        handleCloseTip();
      }
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowLineHeightDropdown(false);
      }
    };

    if (isTipVisible || showLineHeightDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    if (!showLineHeightDropdown) {
      setIsCustomInputVisible(false);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTipVisible, showLineHeightDropdown, setShowLineHeightDropdown]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      className="relative flex flex-col items-center rounded-lg border-b border-gray-200 bg-gray-100 p-2 dark:border-gray-600 dark:bg-gray-700"
    >
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="ml-4 text-lg font-bold text-cyan-900 dark:text-[#F05623]">EDIT MODE</h3>
          {hasUnsavedChanges && (
            <span className="animate-pulse text-xs italic text-yellow-600 dark:text-yellow-400">Unsaved changes</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setIsTipVisible(!isTipVisible)}
              className="rounded-md p-2 text-sm font-semibold text-gray-500 transition-colors duration-200 hover:bg-gray-200 dark:text-gray-200 dark:hover:bg-gray-600"
              title="Formatting Tip"
            >
              <FaInfoCircle size={16} />
            </button>
            <AnimatePresence>
              {isTipVisible && (
                <motion.div
                  ref={tipRef}
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full right-0 z-10 mt-0 w-115 rounded-lg border bg-white p-4 shadow-xl dark:border-gray-600 dark:bg-gray-800"
                >
                  <button
                    onClick={handleCloseTip}
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    title="Close"
                  >
                    <FaTimes />
                  </button>
                  <h4 className="flex items-center gap-1.5 font-semibold text-gray-800 dark:text-gray-200">
                    <FaLightbulb className="text-yellow-400" size={18}/>
                    <span>Formatting Tip</span>
                  </h4>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    For consistent Code Matrix exports, we recommend this format for transcript lines:
                  </p>
                  <pre className="mt-2 rounded-md bg-gray-100 p-2 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                    <code>[HH:MM:SS] Speaker X: Text...</code>
                  </pre>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Example:</p>
                  <pre className="mt-1 rounded-md bg-gray-100 p-2 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                    <code>[00:00:09] Speaker A: The impact of technology on education...</code>
                  </pre>
                  
                  {/* NEVER SHOW AGAIN CHECKBOX */}
                  <div className="mt-3 flex items-center border-t border-gray-100 pt-2 dark:border-gray-700">
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-cyan-800 focus:ring-cyan-800 dark:border-gray-600 dark:bg-gray-700"
                        defaultChecked={localStorage.getItem('hideFormattingTip') === 'true'}
                        onChange={handleNeverShowChange}
                      />
                      Don't show again
                    </label>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-1 rounded-md border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-600 dark:bg-gray-800">
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
            <div className="flex items-center gap-1 rounded-md border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-600 dark:bg-gray-800">
              <button
                onClick={() => setShowLineHeightDropdown(prev => !prev)}
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
                  className="absolute right-0 z-50 mt-2 w-28 rounded-lg bg-white p-2 shadow-lg dark:bg-gray-700"
                >
                  {isCustomInputVisible ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setIsCustomInputVisible(false)} className="rounded-sm p-1 text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-600" title="Back">
                          <FaArrowLeft size={12} />
                        </button>
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            step="0.05"
                            min="1.0"
                            max="4.0"
                            value={customLineHeight}
                            onChange={(e) => setCustomLineHeight(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleSetCustomSpacing()}
                            className="w-full rounded-md bg-gray-100 p-0.5 pr-4 text-center text-sm focus:outline-none focus:ring-1 focus:ring-cyan-900 dark:bg-gray-800 dark:text-gray-200 dark:focus:ring-[#F05623] hide-number-arrows"
                          />
                          <div className="absolute right-0 mr-1 flex h-full flex-col items-center justify-center">
                            <button
                              onClick={() => setCustomLineHeight(lh => (Math.min(4.0, parseFloat(lh) + 0.05)).toFixed(2))}
                              className="h-1/2 rounded-tr-sm px-1 text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" fill="currentColor" viewBox="0 0 16 16"><path d="M7.247 4.86l-4.796 5.481c-.566.647-.106 1.659.753 1.659h9.592a1 1 0 0 0 .753-1.659l-4.796-5.48a1 1 0 0 0-1.506 0z"/></svg>
                            </button>
                            <button
                              onClick={() => setCustomLineHeight(lh => (Math.max(1.0, parseFloat(lh) - 0.05)).toFixed(2))}
                              className="h-1/2 rounded-br-sm px-1 text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" fill="currentColor" viewBox="0 0 16 16"><path d="M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/></svg>
                            </button>
                          </div>
                        </div>
                      </div>
                      <button onClick={handleSetCustomSpacing} className="w-full rounded-md py-1 text-xs font-bold text-white bg-cyan-800 hover:bg-cyan-700 dark:bg-[#d34715] dark:hover:bg-[#F05623]">
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
          
          <div className="flex items-center gap-1 rounded-md border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-600 dark:bg-gray-800">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="rounded-sm p-1 text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-600"
              title="Undo (Ctrl+Z)"
            >
              <FaUndo size={14} />
            </button>
             <div className="h-4 w-px bg-gray-200 dark:bg-gray-600"></div>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="rounded-sm p-1 text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-600"
              title="Redo (Ctrl+Y)"
            >
              <FaRedo size={14} />
            </button>
          </div>
          
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={onToggleFind}
              className={`flex items-center rounded-l-md p-2 text-sm font-semibold transition-colors duration-200 ${
                showFind ? 'bg-gray-300 dark:bg-gray-600' : 'bg-white hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'
              }`}
              title="Find"
            >
              <FaSearch />
            </button>
            <button
              onClick={onToggleFindReplace}
              className={`flex items-center rounded-r-md border-l border-gray-300 p-2 text-sm font-semibold transition-colors duration-200 dark:border-gray-600 ${
                showFindReplace ? 'bg-gray-300 dark:bg-gray-600' : 'bg-white hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'
              }`}
              title="Find & Replace"
            >
              <MdFindReplace size={18} />
            </button>
          </div>

          {/* Cancel Button */}
          <button
            onClick={onCancel}
            className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            title="Close edit mode and return to viewer"
          >
            <FaTimes />
            <span>Close</span>
          </button>

          {/* SEPARATE SAVE AND LOCK BUTTONS */}
          <button
            onClick={onSave}
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 bg-cyan-800 hover:bg-cyan-700"
            title="Save (keeps file in edit mode)"
          >
            <FaSave />
            <span>Save</span>
          </button>

          <button
            onClick={onLock}
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 bg-[#d34715] hover:bg-[#F05623]"
            title="Lock file (finalizes and exits edit mode)"
          >
            <FaLock />
            <span>Lock</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showFind && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-2 w-full overflow-hidden"
          >
            <div className="flex items-center gap-x-4 rounded-md border border-gray-300 bg-white p-2 dark:border-gray-500 dark:bg-gray-800">
              <input
                type="text"
                placeholder="Find"
                value={findQuery}
                onChange={onFindChange}
                className="flex-grow rounded-md border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:border-cyan-800 focus:ring-cyan-800 dark:border-gray-600 dark:bg-gray-700 dark:focus:border-[#F05623] dark:focus:ring-[#F05623]"
              />
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {matchesCount > 0 ? `${currentMatchIndex + 1} of ${matchesCount}` : 'No results'}
                </span>
                <button onClick={onFindPrev} disabled={matchesCount === 0} className="rounded p-1 hover:bg-gray-200 disabled:opacity-50 dark:hover:bg-gray-600">
                  <FaChevronUp size={12} />
                </button>
                <button onClick={onFindNext} disabled={matchesCount === 0} className="rounded p-1 hover:bg-gray-200 disabled:opacity-50 dark:hover:bg-gray-600">
                  <FaChevronDown size={12} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {showFindReplace && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-2 w-full overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border border-gray-300 bg-white p-2 dark:border-gray-800 dark:bg-gray-800">
              <input
                type="text"
                placeholder="Find"
                value={findQuery}
                onChange={onFindChange}
                className="col-span-1 rounded-md border-gray-300 bg-gray-100 px-3 py-2 text-sm focus:border-cyan-800 focus:ring-cyan-800 dark:border-gray-600 dark:bg-gray-700 dark:focus:border-[#F05623] dark:focus:ring-[#F05623]"
              />
              <input
                type="text"
                placeholder="Replace"
                value={replaceQuery}
                onChange={onReplaceChange}
                className="col-span-1 rounded-md border-gray-300 bg-gray-100 px-3 py-2 text-sm focus:border-cyan-800 focus:ring-cyan-800 dark:border-gray-600 dark:bg-gray-700 dark:focus:border-[#F05623] dark:focus:ring-[#F05623]"
              />
              
              <div className="col-span-2 flex items-center justify-end gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {matchesCount > 0 ? `${currentMatchIndex + 1} of ${matchesCount}` : 'No results'}
                </span>
                <button onClick={onFindPrev} disabled={matchesCount === 0} className="rounded p-1 hover:bg-gray-200 disabled:opacity-50 dark:hover:bg-gray-600">
                  <FaChevronUp size={12} />
                </button>
                <button onClick={onFindNext} disabled={matchesCount === 0} className="rounded p-1 hover:bg-gray-200 disabled:opacity-50 dark:hover:bg-gray-600">
                  <FaChevronDown size={12} />
                </button>
                
                <div className="mx-2 h-4 w-px bg-gray-300 dark:bg-gray-600"></div>

                <button
                  onClick={onReplaceOne}
                  disabled={matchesCount === 0}
                  className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100 disabled:opacity-50 dark:border-gray-500 dark:hover:bg-gray-700"
                >
                  Replace
                </button>
                <button
                  onClick={onReplaceAll}
                  disabled={matchesCount === 0}
                  className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100 disabled:opacity-50 dark:border-gray-500 dark:hover:bg-gray-700"
                >
                  Replace All
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default EditToolbar;