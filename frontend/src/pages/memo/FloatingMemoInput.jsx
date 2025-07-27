import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaSave } from 'react-icons/fa';

/**
 * @component FloatingMemoInput
 * @description A floating form component that appears at a specific position on the screen
 * to allow users to create a new memo. It includes validation for required fields
 * and checks for duplicate titles.
 * @param {object} props - The component props.
 * @param {number} props.x - The horizontal (left) position for the component.
 * @param {number} props.y - The vertical (top) position for the component.
 * @param {function} props.onClose - Callback function to close the component.
 * @param {function} props.onSave - Async callback function to save the new memo data.
 * @param {object} props.selectionInfo - Information about the text selection this memo is tied to.
 * @param {Array} [props.allMemos=[]] - An array of all existing memos, used for duplicate title validation.
 */
const FloatingMemoInput = ({ x, y, onClose, onSave, selectionInfo, allMemos = [] }) => {
    // State for the memo's title, content, and any local form errors.
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [localError, setLocalError] = useState('');

    // Style object to position the component absolutely based on props.
    const style = {
        left: `${x}px`,
        top: `${y}px`,
        position: 'fixed',
        transform: 'none',
        opacity: 1,
    };

    // Effect to reset the form state when the component is repositioned (i.e., shown for a new memo).
    useEffect(() => {
        setTitle('');
        setContent('');
        setLocalError('');
    }, [x, y]);

    /**
     * @function handleSubmit
     * @description Handles the form submission. It validates the input, checks for
     * duplicate titles, and calls the onSave prop if validation passes.
     * @param {React.FormEvent} e - The form submission event.
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');

        // Validate that title and content are not empty.
        if (!title.trim()) {
            setLocalError('Title is required.');
            return;
        }
        if (!content.trim()) {
            setLocalError('Content is required.');
            return;
        }

        // Check for duplicate memo titles (case-insensitive).
        const duplicate = allMemos.find(
            (memo) => memo.title.trim().toLowerCase() === title.trim().toLowerCase()
        );
        if (duplicate) {
            setLocalError('A memo with this title already exists. Please use a different title.');
            return;
        }

        // Attempt to save the memo and handle potential errors.
        try {
            await onSave({ title, content });
            onClose(); // Close the form on successful save.
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
                className="floating-memo-input bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl z-50 w-80 flex flex-col"
                style={style}
                onClick={(e) => e.stopPropagation()} // Prevent clicks inside from closing it via outside-click listeners.
            >
                {/* Header Section */}
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-bold text-[#1D3C87] dark:text-[#F05623]">New Memo</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        title="Close"
                    >
                        <FaTimes size={16} />
                    </button>
                </div>

                {/* This section is commented out in the original code, preserving its state. */}
                {/* {selectionInfo?.text && (
                    <div className="mb-3 p-2 bg-gray-100 dark:bg-gray-700 rounded-md text-xs text-gray-700 dark:text-gray-300 max-h-16 overflow-y-auto">
                        <strong className="text-[#1D3C87] dark:text-[#F05623]">Selected:</strong> {selectionInfo.text}
                    </div>
                )} */}

                {/* Memo Creation Form */}
                <form onSubmit={handleSubmit} className="flex flex-col flex-grow">
                    <div className="mb-3">
                        <label htmlFor="memoTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Title
                        </label>
                        <input
                            type="text"
                            id="memoTitle"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            placeholder="Enter memo title"
                        />
                    </div>

                    <div className="mb-4 flex-grow">
                        <label htmlFor="memoContent" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Content
                        </label>
                        <textarea
                            id="memoContent"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows="4"
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-y min-h-[60px]"
                            placeholder="Enter memo content"
                        ></textarea>
                    </div>

                    {/* Error Display */}
                    {localError && (
                        <p className="text-red-500 text-xs mb-3">{localError}</p>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end mt-auto">
                        <button
                            type="submit"
                            className="px-4 py-2 bg-[#1D3C87] text-white rounded-md hover:bg-[#F05623] transition-colors flex items-center gap-2 text-sm"
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
