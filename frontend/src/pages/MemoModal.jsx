import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaSave, FaTrashAlt, FaEdit } from 'react-icons/fa';

const MemoModal = ({ show, onClose, onSave, initialMemo, selectionInfo, onDelete }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [backendError, setBackendError] = useState('');
  const [viewMode, setViewMode] = useState(true);

  useEffect(() => {
    if (show) {
      if (initialMemo) {
        setTitle(initialMemo.title || '');
        setContent(initialMemo.content || '');
        setViewMode(true);
      } else {
        setTitle('');
        setContent('');
        setViewMode(false);
      }
      setBackendError('');
    }
  }, [show, initialMemo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBackendError('');

    if (!title.trim() && !content.trim()) {
      setBackendError('Title or content is required for a memo.');
      return;
    }

    try {
      await onSave({
        ...initialMemo,
        title,
        content,
        author: localStorage.getItem('username'),
        authorId: localStorage.getItem('userId'),
      });
    } catch (err) {
      setBackendError(err.message || 'Failed to save memo. Please try again.');
    }
  };

  const handleDeleteClick = () => {
    if (initialMemo && initialMemo._id) {
      onDelete(initialMemo._id, initialMemo.title || 'this memo');
      onClose();
    }
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md relative memo-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-[#1D3C87] dark:text-[#F05623] mb-2">
              {initialMemo ? (viewMode ? 'Memo Details' : 'Edit Memo') : 'Create New Memo'}
            </h2>

            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <FaTimes size={20} />
            </button>

            {viewMode ? (
              <>
                <div className="flex justify-between items-start mb-4">
                  {title && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Title</h3>
                      <p className="text-lg font-bold text-gray-800 dark:text-gray-200">{title}</p>
                    </div>
                  )}
                  {initialMemo && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 text-right">
                      <p>
                        Created by <strong>{initialMemo.author}</strong><br />
                        on{' '}
                        {new Date(initialMemo.createdAt).toLocaleString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        })}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mb-4 border border-gray-300 dark:border-gray-600 rounded-md p-3 bg-gray-50 dark:bg-gray-700">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300"></h3>
                  <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{content}</p>
                </div>

                <div className="flex justify-between items-center mt-6">
                  <button
                    onClick={() => setViewMode(false)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                  >
                    <FaEdit /> Edit Memo
                  </button>
                  <button
                    onClick={handleDeleteClick}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2"
                  >
                    <FaTrashAlt /> Delete
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleSubmit}>
                {selectionInfo?.text && (
                  <div className="mb-4 p-2 bg-gray-100 dark:bg-gray-700 rounded-md text-sm text-gray-700 dark:text-gray-300">
                    <strong className="text-[#1D3C87] dark:text-[#F05623]">Selected Text:</strong>
                    <p className="max-h-20 overflow-y-auto">{selectionInfo.text}</p>
                  </div>
                )}

                <div className="mb-4">
                  <label htmlFor="memoTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    id="memoTitle"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter memo title"
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="memoContent" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Content
                  </label>
                  <textarea
                    id="memoContent"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows="5"
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter memo content"
                  ></textarea>
                </div>

                {backendError && (
                  <p className="text-red-500 text-sm mb-4">{backendError}</p>
                )}

                <div className="flex justify-between items-center mt-6">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#1D3C87] text-white rounded-md hover:bg-[#F05623] transition-colors flex items-center gap-2"
                  >
                    <FaSave /> Save Memo
                  </button>
                  {initialMemo && (
                    <button
                      type="button"
                      onClick={handleDeleteClick}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-2"
                    >
                      <FaTrashAlt /> Delete
                    </button>
                  )}
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MemoModal;
