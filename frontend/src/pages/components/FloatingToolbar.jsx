import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaStickyNote, FaHighlighter } from 'react-icons/fa';
import { MdCode } from "react-icons/md";

/**
 * Renders a compact, floating toolbar that appears at a specified coordinate.
 * It provides users with contextual actions for a text selection, such as
 * coding, adding a memo, or highlighting.
 *
 * @param {object} props - The component props.
 * @param {number} props.x - The horizontal (left) position for the toolbar in pixels.
 * @param {number} props.y - The vertical (top) position for the toolbar in pixels.
 * @param {() => void} props.onCode - The callback function to execute when the "Code" button is clicked.
 * @param {() => void} props.onMemo - The callback function to execute when the "Add Memo" button is clicked.
 * @param {() => void} props.onHighlight - The callback function to execute when the "Highlight" button is clicked.
 * @param {() => void} props.onCancel - The callback function to execute when the toolbar is closed.
 * @returns {JSX.Element} The rendered floating toolbar component.
 */
const FloatingToolbar = ({ x, y, onCode, onMemo, onHighlight, onCancel }) => {
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
        className="floating-toolbar z-50 flex items-center space-x-1 rounded-lg border-[1.5px] border-gray-200 bg-white p-0.5 text-gray-800 shadow-xl dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        style={style}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onCode}
          title='Code Selected Text'
          className="rounded-md px-2 py-1 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <MdCode size={16} />
        </button>
        <button
          onClick={onMemo}
          title='Add Memo'
          className="rounded-md px-2 py-1 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <FaStickyNote size={14} />
        </button>
        <button
          onClick={onHighlight}
          title='Highlight Selected Text'
          className="rounded-md px-2 py-1 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <FaHighlighter size={14} />
        </button>
        <div className="mx-1 h-3.5 w-px bg-gray-200 dark:bg-gray-600"></div>
        <button
          onClick={onCancel}
          className="rounded-md px-2 py-1 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          title="Close toolbar"
        >
          <FaTimes size={14} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

export default FloatingToolbar;