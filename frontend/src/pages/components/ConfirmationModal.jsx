/**
 * @file ConfirmationModal.jsx
 * @description A reusable modal component for prompting the user to confirm an action.
 * It is used for operations like deletion or other critical changes.
 */

import { motion, AnimatePresence } from 'framer-motion';

const ConfirmationModal = ({ show, onClose, onConfirm, title, message }) => {
  // Do not render the component if the 'show' prop is false.
  if (!show) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.8, y: -20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: -20 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-sm text-center"
          >
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
              {title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              {message}
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={onConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition"
              >
                Confirm
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 dark:text-gray-900 rounded transition"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationModal;
