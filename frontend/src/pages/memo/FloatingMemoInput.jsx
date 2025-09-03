import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaSave } from 'react-icons/fa';

/**
 * A floating form component that appears at a specified position on the screen
 * to allow users to create a new memo. It includes validation for required fields
 * and checks for duplicate titles before saving.
 *
 * @param {object} props - The component props.
 * @param {number} props.x - The horizontal (left) position for the component in pixels.
 * @param {number} props.y - The vertical (top) position for the component in pixels.
 * @param {() => void} props.onClose - The callback function to execute when the component should be closed.
 * @param {(memoData: {title: string, content: string}) => Promise<void>} props.onSave - An async callback function to save the new memo data.
 * @param {object} props.selectionInfo - Information about the text selection to which this memo is linked.
 * @param {Array<object>} [props.allMemos=[]] - An array of all existing memos, used for duplicate title validation.
 * @returns {JSX.Element} The rendered floating memo input component.
 */
const FloatingMemoInput = ({ x, y, onClose, onSave, selectionInfo, allMemos = [] }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [localError, setLocalError] = useState('');

  const style = {
    left: `${x}px`,
    top: `${y}px`,
    position: 'fixed',
    transform: 'none',
    opacity: 1,
  };

  /**
   * Effect to reset the form state when the component is repositioned, ensuring
   * a clean form for each new memo.
   */
  useEffect(() => {
    setTitle('');
    setContent('');
    setLocalError('');
  }, [x, y]);

  /**
   * Handles the form submission for creating a new memo. It validates that the
   * title and content are not empty, checks for duplicate titles (case-insensitive),
   * and calls the `onSave` prop if all checks pass.
   * @param {React.FormEvent<HTMLFormElement>} e - The form submission event.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!title.trim()) {
      setLocalError('Title is required.');
      return;
    }
    if (!content.trim()) {
      setLocalError('Content is required.');
      return;
    }

    const duplicate = allMemos.find(
      (memo) => memo.title.trim().toLowerCase() === title.trim().toLowerCase()
    );
    if (duplicate) {
      setLocalError('A memo with this title already exists. Please use a different title.');
      return;
    }

    try {
      await onSave({ title, content });
      onClose();
    } catch (err) {
      setLocalError(err.message || 'Failed to save memo.');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="floating-memo-input z-50 flex w-80 flex-col rounded-lg border-[1.5px] border-gray-700 bg-white p-4 shadow-xl dark:bg-gray-800"
        style={style}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-cyan-900 dark:text-[#F05623]">New Memo</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title="Close"
          >
            <FaTimes size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-grow flex-col">
          <div className="mb-3">
            <label htmlFor="memoTitle" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Title
            </label>
            <input
              type="text"
              id="memoTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-gray-50 p-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Enter memo title"
            />
          </div>

          <div className="mb-4 flex-grow">
            <label htmlFor="memoContent" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Content
            </label>
            <textarea
                id="memoContent"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows="4"
                className="custom-scrollbar w-full flex-grow resize-none rounded-md border border-gray-300 bg-gray-50 p-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="Enter memo content"
            ></textarea>
          </div>

          {localError && (
            <p className="mb-3 text-xs text-red-500">{localError}</p>
          )}

          <div className="mt-auto flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-md bg-cyan-700 hover:bg-cyan-700 dark:bg-[#d34715] dark:hover:bg-[#F05623] px-4 py-2 text-sm text-white transition-colors"

            >
              <FaSave /> Save
            </button>
          </div>
        </form>
      </motion.div>
    </AnimatePresence>
  );
};

export default FloatingMemoInput;