/**
 * @file CodeDetailsModal.jsx
 * @description A modal component that displays detailed information about a specific
 * coded text segment. It uses framer-motion for entry and exit animations.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';

const CodeDetailsModal = ({ show, onClose, codeSegment }) => {
  // Do not render the component if the 'show' prop is false.
  if (!show) {
    return null;
  }

  // Provide fallback values to prevent errors if codeSegment data is incomplete.
  const codeName = codeSegment?.codeDefinition?.name || 'N/A';
  const codeColor = codeSegment?.codeDefinition?.color || '#cccccc';
  const segmentText = codeSegment?.text || 'No segment text available.';
  const startIndex = codeSegment?.startIndex ?? 'N/A';
  const endIndex = codeSegment?.endIndex ?? 'N/A';
  const fileId = codeSegment?.fileId || 'N/A';
  const fileName = codeSegment?.fileName || 'N/A';

  return (
    // AnimatePresence handles the mounting and unmounting animations.
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-[1000]"
          onClick={onClose} // Close the modal when the backdrop is clicked.
        >
          <motion.div
            initial={{ scale: 0.9, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 50 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4 relative"
            onClick={(e) => e.stopPropagation()} // Prevent clicks inside the modal from closing it.
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              title="Close"
            >
              <FaTimes size={20} />
            </button>

            <h2 className="text-xl font-bold text-[#1D3C87] dark:text-[#F05623] mb-4">Code Details</h2>

            <div className="space-y-3 text-gray-700 dark:text-gray-300">
              <p>
                <strong>Code Name:</strong>{' '}
                <span className="font-semibold" style={{ color: codeColor }}>
                  {codeName}
                </span>
              </p>
              <p>
                <strong>Segment:</strong>{' '}
                <span className="italic">"{segmentText}"</span>
              </p>
              <p>
                <strong>Start Index:</strong> {startIndex}
              </p>
              <p>
                <strong>End Index:</strong> {endIndex}
              </p>
              <p>
                <strong>File Name:</strong> {fileName}
              </p>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CodeDetailsModal;
