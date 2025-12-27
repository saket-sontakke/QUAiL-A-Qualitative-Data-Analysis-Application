import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaSave, FaTrashAlt } from 'react-icons/fa';

/**
 * A floating form component that appears at a specified position.
 * Supports both CREATING new memos and EDITING existing memos.
 * Features:
 * - Draggable (constrained to viewport) - Cursor works everywhere
 * - Visual Backdrop (Glassmorphism)
 * - Unsaved Changes Protection
 */
const FloatingMemoInput = ({ 
  x, 
  y, 
  onClose, 
  onSave, 
  onDelete,
  initialMemo = null, 
  selectionInfo, 
  allMemos = [],
  // Props for handling the confirmation modal
  setShowConfirmModal,
  setConfirmModalData
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [localError, setLocalError] = useState('');
  
  // Reference for the boundary constraints
  const constraintsRef = useRef(null);

  // Determine if we are editing or creating
  const isEditing = !!initialMemo;

  const style = {
    left: `${x}px`,
    top: `${y}px`,
    position: 'fixed',
    transform: 'none', 
    opacity: 1,
  };

  /**
   * Reset or Pre-fill form based on mode
   */
  useEffect(() => {
    if (isEditing && initialMemo) {
      setTitle(initialMemo.title || '');
      setContent(initialMemo.content || '');
    } else {
      setTitle('');
      setContent('');
    }
    setLocalError('');
  }, [x, y, initialMemo, isEditing]);

  /**
   * Handles the close attempt.
   * Checks if there are unsaved changes before closing.
   */
  const handleCloseAttempt = () => {
    // 1. Determine original values
    const originalTitle = isEditing && initialMemo ? (initialMemo.title || '') : '';
    const originalContent = isEditing && initialMemo ? (initialMemo.content || '') : '';

    // 2. Check if dirty
    const hasChanges = title.trim() !== originalTitle.trim() || content.trim() !== originalContent.trim();

    // 3. If changes exist and fields aren't empty (or were previously filled), ask for confirmation
    if (hasChanges && (title || content || originalTitle || originalContent)) {
        setConfirmModalData({
            title: 'Unsaved Changes',
            shortMessage: 'You have unsaved changes in your memo. Are you sure you want to close it? Your changes will be lost.',
            confirmText: 'Discard Changes',
            showCancelButton: true,
            // When user confirms discard, we close the modal AND the memo
            onConfirm: () => {
                setShowConfirmModal(false);
                onClose(); 
            },
            // ADD THIS: When user cancels, just close the confirmation modal
            onCancel: () => {
                setShowConfirmModal(false);
                // Don't call onClose() - keep the memo open
            }
        });
        setShowConfirmModal(true);
    } else {
        // No changes, just close immediately
        onClose();
    }
};

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

    // Check for duplicates
    const duplicate = allMemos.find(
      (memo) => 
        memo.title.trim().toLowerCase() === title.trim().toLowerCase() &&
        (isEditing ? memo._id !== initialMemo._id : true)
    );

    if (duplicate) {
      setLocalError('A memo with this title already exists.');
      return;
    }

    try {
      const payload = isEditing ? { ...initialMemo, title, content } : { title, content };
      await onSave(payload);
      onClose();
    } catch (err) {
      setLocalError(err.message || 'Failed to save memo.');
    }
  };

  const handleDelete = () => {
    if (onDelete && initialMemo) {
        setConfirmModalData({
            title: 'Delete Memo?',
            shortMessage: 'Are you sure you want to delete this memo? This action cannot be undone.',
            confirmText: 'Delete',
            showCancelButton: true,
            onConfirm: () => {
                setShowConfirmModal(false);
                onDelete(initialMemo._id);
                onClose();
            },
            // ADD THIS: When user cancels delete, just close the confirmation modal
            onCancel: () => {
                setShowConfirmModal(false);
                // Keep the memo open
            }
        });
        setShowConfirmModal(true);
    }
};

  return (
    <>
      <div 
        ref={constraintsRef}
        className="fixed inset-0 z-50 bg-black/7 dark:bg-black/20" 
        onClick={(e) => e.stopPropagation()} 
        onMouseDown={(e) => e.stopPropagation()} 
        onPointerDown={(e) => e.stopPropagation()} 
      />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        
        drag 
        dragMomentum={false} 
        dragElastic={0} 
        dragConstraints={constraintsRef}

        // 2. UPDATED CONTAINER
        // - Added 'cursor-move' here so the whole card shows the draggable cursor
        className="floating-memo-input cursor-move z-50 flex w-80 flex-col rounded-lg border-[1.5px] border-gray-300 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-800"
        style={style}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-3 flex items-center justify-between select-none">
          <h3 className="text-lg font-bold text-cyan-900 dark:text-[#F05623]">
            {isEditing ? 'Edit Memo' : 'New Memo'}
          </h3>
          <div className="flex items-center gap-2" onPointerDown={(e) => e.stopPropagation()}> 
            {isEditing && (
                <button
                    onClick={handleDelete}
                    className="cursor-pointer text-gray-400 hover:text-red-500 transition-colors"
                    title="Delete Memo"
                    type="button"
                >
                    <FaTrashAlt size={14} />
                </button>
            )}
            <button
                onClick={handleCloseAttempt} 
                className="cursor-pointer text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                title="Close"
                type="button"
            >
                <FaTimes size={16} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-grow flex-col">
          {isEditing && initialMemo.text && (
            <div className="mb-3 rounded bg-gray-100 p-2 text-xs italic text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                "{initialMemo.text.length > 60 ? initialMemo.text.substring(0, 60) + '...' : initialMemo.text}"
            </div>
          )}

          <div className="mb-3">
            <label htmlFor="memoTitle" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Title
            </label>
            <input
              type="text"
              id="memoTitle"
              value={title}
              // Stop propagation so typing doesn't trigger drag
              onPointerDown={(e) => e.stopPropagation()}
              onChange={(e) => setTitle(e.target.value)}
              // Added 'cursor-text' so the mouse looks correct over the input
              className="cursor-text w-full rounded-md border border-gray-300 bg-gray-50 p-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Enter memo title"
              autoFocus={!isEditing} 
            />
          </div>

          <div className="mb-4 flex-grow">
            <label htmlFor="memoContent" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Content
            </label>
            <textarea
                id="memoContent"
                value={content}
                // Stop propagation so typing doesn't trigger drag
                onPointerDown={(e) => e.stopPropagation()} 
                onChange={(e) => setContent(e.target.value)}
                rows="4"
                // Added 'cursor-text' so the mouse looks correct over the textarea
                className="cursor-text custom-scrollbar w-full flex-grow resize-none rounded-md border border-gray-300 bg-gray-50 p-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="Enter memo content"
            ></textarea>
          </div>

          {localError && (
            <p className="mb-3 text-xs text-red-500">{localError}</p>
          )}

          <div className="mt-auto flex justify-end">
            <button
              type="submit"
              onPointerDown={(e) => e.stopPropagation()}
              className="cursor-pointer flex items-center gap-2 rounded-md bg-cyan-800 hover:bg-cyan-700 dark:bg-[#d34715] dark:hover:bg-[#F05623] px-4 py-2 text-sm text-white transition-colors"
            >
              <FaSave /> {isEditing ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
};

export default FloatingMemoInput;