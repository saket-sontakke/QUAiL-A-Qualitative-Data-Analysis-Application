import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';

/**
 * Renders a modal with a form to create a new project.
 * @param {object} props - The component props.
 * @param {boolean} props.show - Whether the modal is visible.
 * @param {Function} props.onClose - Function to call when the modal should be closed.
 * @param {Function} props.onConfirm - Function to call with the new project data on form submission.
 * @returns {JSX.Element|null} The rendered modal component or null.
 */
const CreateProjectModal = ({ show, onClose, onConfirm }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name cannot be empty.');
      return;
    }
    
    setError('');
    setIsSubmitting(true);

    try {
      await onConfirm({ name, description }); 
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create project.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setError('');
    setIsSubmitting(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800"
          >
            <div className="flex items-start justify-between">
              <h3 className="text-xl font-bold text-[#1D3C87] dark:text-[#F05623]">
                Create New Project
              </h3>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                aria-label="Close modal"
              >
                <FaTimes size={20} />
              </button>
            </div>
            
            {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
            
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="projectName" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="projectName"
                  type="text"
                  placeholder="Project Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1D3C87] dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-[#F05623]"
                />
              </div>
               <div>
                <label htmlFor="projectDescription" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description (Optional)
                </label>
                <textarea
                  id="projectDescription"
                  placeholder="A short description of the project."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows="3"
                  className="w-full resize-none custom-scrollbar rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1D3C87] dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-[#F05623]"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg bg-gray-200 px-5 py-2.5 font-semibold text-gray-800 shadow-sm hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`rounded-lg bg-[#d34715] px-5 py-2.5 font-semibold text-white shadow-md hover:bg-[#F05623] ${isSubmitting ? 'opacity-70 cursor-wait' : ''}`}
                >
                  {isSubmitting ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CreateProjectModal;