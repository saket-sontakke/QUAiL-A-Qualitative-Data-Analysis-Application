// AddMemoModal.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AddMemoModal = ({ show, onClose, onSaveMemo, initialMemoContent = '', selectionText = '' }) => {
  const [memoContent, setMemoContent] = useState(initialMemoContent);
  const [error, setError] = useState('');

  useEffect(() => {
    if (show) {
      setMemoContent(initialMemoContent);
      setError('');
    }
  }, [show, initialMemoContent]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!memoContent.trim()) {
      setError('Memo content cannot be empty.');
      return;
    }
    setError('');
    onSaveMemo(memoContent);
    onClose();
  };

  const handleCloseModal = () => {
    setError('');
    onClose();
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50"
          onClick={handleCloseModal}
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md memo-modal-content"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
          >
            <h2 className="text-xl font-semibold mb-4 text-[#1D3C87] dark:text-[#F05623]">Add Memo</h2>
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                Selected Text:
              </label>
              <p className="bg-gray-100 dark:bg-gray-700 p-2 rounded border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 text-sm italic max-h-24 overflow-y-auto">
                "{selectionText}"
              </p>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="memoContent" className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                  Memo Content:
                </label>
                <textarea
                  id="memoContent"
                  value={memoContent}
                  onChange={(e) => setMemoContent(e.target.value)}
                  rows="5"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                  placeholder="Enter your memo here..."
                  required
                ></textarea>
                {error && <p className="text-red-500 text-xs italic mt-2">{error}</p>}
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#1D3C87] hover:bg-[#152e69] text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline dark:bg-[#F05623] dark:hover:bg-[#d4481d]"
                >
                  Save Memo
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddMemoModal;