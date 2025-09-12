import React, { useState, useEffect, useRef } from 'react';
import { FaSave, FaSearch, FaChevronUp, FaChevronDown, FaUndo, FaRedo, FaInfoCircle, FaTimes, FaLightbulb } from 'react-icons/fa';
import { MdFindReplace } from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * A toolbar for document edit mode. It provides save, find, and find-and-replace
 * functionalities, along with an indicator for unsaved changes and a formatting tip tooltip.
 *
 * @param {object} props - The component props.
 * @param {() => void} props.onSave - Callback for the save button.
 * @param {boolean} props.hasUnsavedChanges - If true, displays an "unsaved changes" indicator.
 * @param {() => void} props.onUndo - Callback to undo the last action.
 * @param {() => void} props.onRedo - Callback to redo the last action.
 * @param {boolean} props.canUndo - Determines if the undo button should be enabled.
 * @param {boolean} props.canRedo - Determines if the redo button should be enabled.
 * @param {boolean} props.showFind - If true, displays the find-only controls.
 * @param {() => void} props.onToggleFind - Callback to toggle the find-only view.
 * @param {boolean} props.showFindReplace - If true, displays the find-and-replace controls.
 * @param {() => void} props.onToggleFindReplace - Callback to toggle the find-and-replace view.
 * @param {string} props.findQuery - The current search term.
 * @param {(e: React.ChangeEvent<HTMLInputElement>) => void} props.onFindChange - Handler for find input changes.
 * @param {string} props.replaceQuery - The current replacement term.
 * @param {(e: React.ChangeEvent<HTMLInputElement>) => void} props.onReplaceChange - Handler for replace input changes.
 * @param {() => void} props.onFindNext - Callback to go to the next match.
 * @param {() => void} props.onFindPrev - Callback to go to the previous match.
 * @param {() => void} props.onReplaceOne - Callback to replace the current match.
 * @param {() => void} props.onReplaceAll - Callback to replace all matches.
 * @param {number} props.matchesCount - The total number of matches found.
 * @param {number} props.currentMatchIndex - The index of the currently highlighted match.
 * @param {boolean} props.initialShowTip - A trigger from the parent to show the tip automatically.
 * @param {() => void} props.onDismissTip - A callback to inform the parent that the tip has been dismissed.
 * @returns {JSX.Element} The rendered toolbar component.
 */
const EditToolbar = ({
  onSave,
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
}) => {
  const [isTipVisible, setIsTipVisible] = useState(false);
  const tipRef = useRef(null);

  useEffect(() => {
    if (initialShowTip) {
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tipRef.current && !tipRef.current.contains(event.target)) {
        handleCloseTip();
      }
    };

    if (isTipVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTipVisible]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      className="relative flex flex-col items-center border-b border-gray-200 bg-gray-100 p-2 dark:border-gray-600 dark:bg-gray-700"
    >
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onSave}
            className="flex items-center gap-2 rounded-md bg-cyan-800 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#F05623]"
            title="Save"
          >
            <FaSave />
            <span>Save</span>
          </button>
          
          <div className="flex items-center gap-1">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="rounded-md p-2 text-sm font-semibold transition-colors duration-200 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-gray-600"
              title="Undo (Ctrl+Z)"
            >
              <FaUndo />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="rounded-md p-2 text-sm font-semibold transition-colors duration-200 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-gray-600"
              title="Redo (Ctrl+Y)"
            >
              <FaRedo />
            </button>
          </div>

          <div className="relative">
            <button
              onClick={() => setIsTipVisible(!isTipVisible)}
              className="rounded-md p-2 text-sm font-semibold text-cyan-800 transition-colors duration-200 hover:bg-gray-200 dark:text-gray-200 dark:hover:bg-gray-600"
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
                  className="absolute top-full left-0 z-10 mt-2 w-115 rounded-lg border bg-white p-4 shadow-xl dark:border-gray-600 dark:bg-gray-800"
                >
                  <button
                    onClick={handleCloseTip}
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    title="Close"
                  >
                    <FaTimes />
                  </button>
                  <h4 className="flex items-center gap-1.5 font-semibold text-gray-800 dark:text-gray-200">
                    <FaLightbulb className="text-gray-200" size={18}/>
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {hasUnsavedChanges && (
            <span className="animate-pulse text-xs italic text-yellow-600 dark:text-yellow-400">Unsaved changes</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleFind}
            className={`rounded-md p-2 text-sm font-semibold transition-colors duration-200 ${
              showFind ? 'bg-gray-300 dark:bg-gray-600' : 'hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            title="Find"
          >
            <FaSearch />
          </button>
          <button
            onClick={onToggleFindReplace}
            className={`rounded-md p-2 text-sm font-semibold transition-colors duration-200 ${
              showFindReplace ? 'bg-gray-300 dark:bg-gray-600' : 'hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            title="Find & Replace"
          >
            <MdFindReplace size={18} />
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
              <div className="col-span-1 flex items-center gap-2">
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
              <div className="col-span-1 flex items-center justify-end gap-2">
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