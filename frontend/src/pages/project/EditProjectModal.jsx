import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';

/**
 * Renders a modal with a form to edit a project's name.
 * @param {object} props - The component props.
 * @param {boolean} props.show - Whether the modal is visible.
 * @param {Function} props.onClose - Function to call when the modal should be closed.
 * @param {Function} props.onConfirm - Function to call with updated data on form submission.
 * @param {object} props.project - The project object to be edited.
 * @returns {JSX.Element|null} The rendered modal component or null.
 */
const EditProjectModal = ({ show, onClose, onConfirm, project }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setError('');
      setIsSubmitting(false);
    }
  }, [project]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name cannot be empty.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await onConfirm({ name });
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update project.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800"
          >
            <div className="flex items-start justify-between">
              <h3 className="text-xl font-bold text-[#1D3C87] dark:text-[#F05623]">
                Edit Project
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                aria-label="Close modal"
              >
                <FaTimes size={20} />
              </button>
            </div>

            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Update the name for your project: <span className="font-semibold text-gray-800 dark:text-gray-200">"{project?.name}"</span>.
            </p>

            {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
            
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="projectName" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Project Name
                </label>
                <input
                  id="projectName"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1D3C87] dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-[#F05623]"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg bg-gray-200 px-5 py-2.5 font-semibold text-gray-800 shadow-sm hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`rounded-lg bg-[#d34715] px-5 py-2.5 font-semibold text-white shadow-md hover:bg-[#F05623] ${isSubmitting ? 'opacity-70 cursor-wait' : ''}`}
                >
                  {isSubmitting ? 'Updating...' : 'Update Project'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EditProjectModal;