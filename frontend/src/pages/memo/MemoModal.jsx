import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaSave, FaTrashAlt, FaEdit } from 'react-icons/fa';

/**
 * @component MemoModal
 * @description A modal for creating, viewing, editing, and deleting memos. It supports
 * two modes: 'view' for displaying memo details and 'edit' for modifying them.
 * @param {object} props - The component props.
 * @param {boolean} props.show - Controls the visibility of the modal.
 * @param {function} props.onClose - Callback function to close the modal.
 * @param {function} props.onSave - Async callback to save a new or updated memo.
 * @param {object} [props.initialMemo] - The memo object to be viewed or edited. If null, the modal is in create mode.
 * @param {object} [props.selectionInfo] - Information about the text selection, used when creating a new memo.
 * @param {function} props.onDelete - Callback to delete the current memo.
 * @param {Array} [props.allMemos=[]] - An array of all existing memos, for duplicate title validation.
 */
const MemoModal = ({ show, onClose, onSave, initialMemo, selectionInfo, onDelete, allMemos = [] }) => {
    // State for memo properties and UI control
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [selectedText, setSelectedText] = useState('');
    const [backendError, setBackendError] = useState('');
    const [viewMode, setViewMode] = useState(true);

    // Effect to initialize modal state when it is shown or when the memo data changes.
    useEffect(() => {
        if (show) {
            if (initialMemo) {
                // Populate fields with existing memo data for viewing/editing.
                setTitle(initialMemo.title || '');
                setContent(initialMemo.content || '');
                setSelectedText(initialMemo.text || '');
                setViewMode(true); // Start in view mode when an existing memo is loaded.
            } else {
                // Prepare for creating a new memo.
                setTitle('');
                setContent('');
                setSelectedText(selectionInfo?.text || '');
                setViewMode(false); // Start in edit mode for a new memo.
            }
            setBackendError(''); // Reset any previous errors.
        }
    }, [show, initialMemo, selectionInfo]);

    /**
     * @function handleSubmit
     * @description Handles form submission for saving or updating a memo.
     * It performs validation and calls the onSave prop.
     * @param {React.FormEvent} e - The form submission event.
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setBackendError('');

        // Basic validation for title and content.
        if (!title.trim()) {
            setBackendError('Title is required.');
            return;
        }
        if (!content.trim()) {
            setBackendError('Content is required.');
            return;
        }

        // Check for duplicate titles, excluding the current memo being edited.
        const duplicate = allMemos.find(
            (memo) =>
                memo.title.trim().toLowerCase() === title.trim().toLowerCase() &&
                memo._id !== initialMemo?._id
        );
        if (duplicate) {
            setBackendError('A memo with this title already exists. Please choose a different title.');
            return;
        }

        // Attempt to save the memo data.
        try {
            await onSave({
                ...initialMemo,
                title,
                content,
                text: selectedText,
                author: localStorage.getItem('username'),
                authorId: localStorage.getItem('userId'),
            });
        } catch (err) {
            setBackendError(err.message || 'Failed to save memo. Please try again.');
        }
    };

    /**
     * @function handleDeleteClick
     * @description Triggers the memo deletion process.
     */
    const handleDeleteClick = () => {
        if (initialMemo && initialMemo._id) {
            onDelete(initialMemo._id, initialMemo.title || 'this memo');
            onClose(); // Close the modal after initiating delete.
        }
    };

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
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -50, opacity: 0 }}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md relative max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-xl font-bold text-[#1D3C87] dark:text-[#F05623] mb-2">
                            {initialMemo ? (viewMode ? 'Memo Details' : 'Edit Memo') : 'Create New Memo'}
                        </h2>

                        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                            <FaTimes size={20} />
                        </button>

                        {/* Conditional rendering based on viewMode */}
                        {viewMode ? (
                            // View Mode: Displaying memo details
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
                                                    year: 'numeric', month: 'short', day: 'numeric',
                                                    hour: '2-digit', minute: '2-digit', hour12: false,
                                                })}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {selectedText && (
                                    <div className="mb-4 p-2 bg-gray-100 dark:bg-gray-700 rounded-md text-sm text-gray-700 dark:text-gray-300">
                                        <strong className="text-[#1D3C87] dark:text-[#F05623]">Selected Text:</strong>
                                        <p className="max-h-20 overflow-y-auto whitespace-pre-wrap break-words">{selectedText}</p>
                                    </div>
                                )}

                                <div className="mb-4 p-2 bg-gray-100 dark:bg-gray-700 rounded-md text-sm text-gray-700 dark:text-gray-300">
                                    <strong className="text-[#1D3C87] dark:text-[#F05623]">Memo:</strong>
                                    <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words overflow-y-auto max-h-52">{content}</p>
                                </div>

                                <div className="flex justify-between items-center mt-6">
                                    <button onClick={() => setViewMode(false)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2">
                                        <FaEdit /> Edit Memo
                                    </button>
                                    <button onClick={handleDeleteClick} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2">
                                        <FaTrashAlt /> Delete
                                    </button>
                                </div>
                            </>
                        ) : (
                            // Edit/Create Mode: Displaying the form
                            <form onSubmit={handleSubmit}>
                                {selectedText && (
                                    <div className="mb-4 p-2 bg-gray-100 dark:bg-gray-700 rounded-md text-sm text-gray-700 dark:text-gray-300">
                                        <strong className="text-[#1D3C87] dark:text-[#F05623]">Selected Text:</strong>
                                        <p className="max-h-20 overflow-y-auto whitespace-pre-wrap break-words">{selectedText}</p>
                                    </div>
                                )}

                                <div className="mb-4">
                                    <label htmlFor="memoTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                                    <input type="text" id="memoTitle" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Enter memo title" />
                                </div>

                                <div className="mb-4">
                                    <label htmlFor="memoContent" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content</label>
                                    <textarea id="memoContent" value={content} onChange={(e) => setContent(e.target.value)} rows="5" className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Enter memo content"></textarea>
                                </div>

                                {backendError && <p className="text-red-500 text-sm mb-4">{backendError}</p>}

                                <div className="flex justify-between items-center mt-6">
                                    <button type="submit" className="px-4 py-2 bg-[#1D3C87] text-white rounded-md hover:bg-[#F05623] transition-colors flex items-center gap-2">
                                        <FaSave /> Save Memo
                                    </button>
                                    {initialMemo && <button type="button" onClick={handleDeleteClick} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-2"><FaTrashAlt /> Delete</button>}
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
