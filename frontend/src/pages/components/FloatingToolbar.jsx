/**
 * @file FloatingToolbar.jsx
 * @description A floating toolbar that appears next to a user's text selection,
 * offering actions like coding, highlighting, or creating a memo. It is positioned
 * dynamically on the screen based on the selection coordinates.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaStickyNote, FaHighlighter } from 'react-icons/fa';
import { MdCode } from "react-icons/md";

const FloatingToolbar = ({ x, y, onCode, onMemo, onHighlight, onCancel }) => {
  // Dynamically positions the component based on the provided x and y coordinates.
  const style = {
    left: `${x}px`,
    top: `${y}px`,
    position: 'fixed',
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="floating-toolbar bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-white p-2 rounded-lg shadow-lg flex items-center space-x-2 z-50"
        style={style}
        onClick={(e) => e.stopPropagation()} // Prevents clicks on the toolbar from dismissing it.
      >
        {/* Action buttons for coding, memoing, and highlighting */}
        <button
          onClick={onCode}
          title='Code Selected Text'
          className="px-3 py-1 bg-white hover:bg-gray-100 text-gray-800 dark:bg-[#1D3C87] dark:hover:bg-[#F05623] dark:text-white rounded-md text-sm flex items-center gap-1 transition"
        >
          <MdCode />
        </button>
        <button
          onClick={onMemo}
          title='Add Memo'
          className="px-3 py-1 bg-white hover:bg-gray-100 text-gray-800 dark:bg-[#1D3C87] dark:hover:bg-[#F05623] dark:text-white rounded-md text-sm flex items-center gap-1 transition"
        >
          <FaStickyNote />
        </button>
        <button
          onClick={onHighlight}
          title='Highlight Selected Text'
          className="px-3 py-1 bg-white hover:bg-gray-100 text-gray-800 dark:bg-[#1D3C87] dark:hover:bg-[#F05623] dark:text-white rounded-md text-sm flex items-center gap-1 transition"
        >
          <FaHighlighter />
        </button>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white ml-2"
          title="Close toolbar"
        >
          <FaTimes />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

export default FloatingToolbar;
