import { FaSave } from 'react-icons/fa';
import { motion } from 'framer-motion';

/**
 * A toolbar component that appears when a document is in edit mode. It provides
 * a save button and a visual indicator to inform the user if there are any
 * unsaved changes.
 *
 * @param {object} props - The component props.
 * @param {() => void} props.onSave - The callback function to execute when the save button is clicked.
 * @param {boolean} props.hasUnsavedChanges - If true, displays an "unsaved changes" indicator.
 * @returns {JSX.Element} The rendered toolbar component.
 */
const EditToolbar = ({ onSave, hasUnsavedChanges }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      className="flex items-center border-b border-gray-200 bg-gray-100 p-2 dark:border-gray-600 dark:bg-gray-700"
    >
      <button
        onClick={onSave}
        className="flex items-center gap-2 rounded-md bg-cyan-800 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#F05623]"
        title="Save"
      >
        <FaSave />
        <span>Save</span>
      </button>
      {hasUnsavedChanges && (
        <span className="ml-4 animate-pulse text-xs italic text-yellow-600 dark:text-yellow-400">Unsaved changes</span>
      )}
    </motion.div>
  );
};

export default EditToolbar;