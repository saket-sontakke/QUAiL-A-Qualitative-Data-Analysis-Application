import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaSave, FaTrashAlt, FaEdit } from 'react-icons/fa';
import { useAuth } from '../auth/AuthContext.jsx';

/**
 * A modal for creating, viewing, editing, and deleting memos. It can be
 * initialized with an existing memo for viewing/editing or with text selection
 * info for creating a new memo. It records authorship using the authenticated user's data.
 *
 * @param {object} props - The component props.
 * @param {boolean} props.show - Controls the visibility of the modal.
 * @param {() => void} props.onClose - The callback function to close the modal.
 * @param {(memoData: object) => Promise<void>} props.onSave - An async callback to save a new or updated memo.
 * @param {object|null} props.initialMemo - The memo object to be viewed or edited. If null, the modal operates in "create" mode.
 * @param {object|null} props.selectionInfo - Information about a text selection, used when creating a new memo linked to text.
 * @param {(memoId: string, memoTitle: string) => void} props.onDelete - The callback to trigger the deletion of the memo.
 * @param {Array<object>} [props.allMemos=[]] - An array of all existing memos, used for duplicate title validation.
 * @returns {JSX.Element|null} The rendered memo modal or null if not visible.
 */
const MemoModal = ({ show, onClose, onSave, initialMemo, selectionInfo, onDelete, allMemos = [] }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [backendError, setBackendError] = useState('');
  const [viewMode, setViewMode] = useState(true);

  /**
   * Effect to initialize the modal's state. It populates fields based on
   * `initialMemo` for editing/viewing or `selectionInfo` for creation.
   */
  useEffect(() => {
    if (show) {
      if (initialMemo) {
        setTitle(initialMemo.title || '');
        setContent(initialMemo.content || '');
        setSelectedText(initialMemo.text || '');
        setViewMode(true);
      } else {
        setTitle('');
        setContent('');
        setSelectedText(selectionInfo?.text || '');
        setViewMode(false);
      }
      setBackendError('');
    }
  }, [show, initialMemo, selectionInfo]);

  /**
   * Handles the form submission for saving a memo. It validates input,
   * checks for duplicate titles, and calls the onSave prop.
   * @param {React.FormEvent<HTMLFormElement>} e - The form submission event.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setBackendError('');

    if (!title.trim()) {
      setBackendError('Title is required.');
      return;
    }
    if (!content.trim()) {
      setBackendError('Content is required.');
      return;
    }

    const duplicate = allMemos.find(
      (memo) =>
      memo.title.trim().toLowerCase() === title.trim().toLowerCase() &&
      memo._id !== initialMemo?._id
    );
    if (duplicate) {
      setBackendError('A memo with this title already exists. Please choose a different title.');
      return;
    }

    try {
      await onSave({
        ...initialMemo,
        title,
        content,
        text: selectedText,
        author: user?.name || 'Anonymous',
        authorId: user?._id,
      });
    } catch (err) {
      setBackendError(err.message || 'Failed to save memo. Please try again.');
    }
  };

  /**
   * Triggers the memo deletion process and closes the modal.
   */
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="custom-scrollbar relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-2 text-xl font-bold text-cyan-900 dark:text-[#F05623]">
              {initialMemo ? (viewMode ? 'Memo Details' : 'Edit Memo') : 'Create New Memo'}
            </h2>
            <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <FaTimes size={20} />
            </button>

            {viewMode ? (
              <>
                <div className="mb-4 flex items-start justify-between">
                  {title && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Title</h3>
                      <p className="text-lg font-bold text-gray-800 dark:text-gray-200">{title}</p>
                    </div>
                  )}
                  {initialMemo && (
                    <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                      <p>
                        Created by <strong>{initialMemo.author}</strong><br />
                        on{' '}
                        {new Date(initialMemo.createdAt).toLocaleString(undefined, {
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit', hour12: false,
                        })}
                      </p>
                    </div>
                  )}
                </div>
                {selectedText && (
                  <div className="mb-4 rounded-md bg-gray-100 p-2 text-sm text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                    <strong className="text-cyan-900 dark:text-[#F05623]">Selected Text:</strong>
                    <p className="custom-scrollbar text-justify max-h-20 overflow-y-auto whitespace-pre-wrap break-words pr-3">{selectedText}</p>
                  </div>
                )}
                <div className="mb-4 rounded-md bg-gray-100 p-2 text-sm text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                  <strong className="text-cyan-900 dark:text-[#F05623]">Memo:</strong>
                  <p className="custom-scrollbar text-justify max-h-52 overflow-y-auto whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200 pr-3">{content}</p>
                </div>
                <div className="mt-6 flex items-center justify-between">
                  <button onClick={() => setViewMode(false)} className="flex items-center gap-2 rounded-md bg-cyan-900 px-4 py-2 text-white hover:bg-cyan-700">
                    <FaEdit /> Edit Memo
                  </button>
                  <button onClick={handleDeleteClick} className="flex items-center gap-2 rounded-md bg-red-700 px-4 py-2 text-white hover:bg-red-600">
                    <FaTrashAlt /> Delete
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleSubmit}>
                {selectedText && (
                  <div className="mb-4 rounded-md bg-gray-100 p-2 text-sm text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                    <strong className="text-cyan-900 dark:text-[#F05623]">Selected Text:</strong>
                    <p className="custom-scrollbar max-h-20 overflow-y-auto whitespace-pre-wrap break-words pr-3">{selectedText}</p>
                  </div>
                )}
                <div className="mb-4">
                  <label htmlFor="memoTitle" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                  <input type="text" id="memoTitle" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-md border border-gray-300 bg-gray-50 p-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white" placeholder="Enter memo title" />
                </div>
                <div className="mb-4">
                  <label htmlFor="memoContent" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Content</label>
                  <textarea id="memoContent" value={content} onChange={(e) => setContent(e.target.value)} rows="5" className="custom-scrollbar w-full resize-none rounded-md border border-gray-300 bg-gray-50 p-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white" placeholder="Enter memo content"></textarea>
                </div>
                {backendError && <p className="mb-4 text-sm text-red-500">{backendError}</p>}
                <div className="mt-6 flex items-center justify-between">
                  <button type="submit" className="flex items-center gap-2 rounded-md bg-cyan-900 px-4 py-2 text-white transition-colors hover:bg-[#F05623]">
                    <FaSave /> Save Memo
                  </button>
                  {initialMemo && <button type="button" onClick={handleDeleteClick} className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"><FaTrashAlt /> Delete</button>}
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
