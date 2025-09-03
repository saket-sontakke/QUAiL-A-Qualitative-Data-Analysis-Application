import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ColorPicker from '../components/ColorPicker';

/**
 * A modal component for creating a new code definition or editing an existing one.
 * It provides a form for the code's name, description, and color, and includes
 * client-side validation to prevent empty names and duplicate color usage.
 *
 * @param {object} props - The component props.
 * @param {boolean} props.show - Determines if the modal is visible.
 * @param {Function} props.onClose - The function to call when the modal should be closed.
 * @param {Function} props.onSave - The callback function to execute with the new/updated code data upon submission.
 * @param {object} [props.initialCode=null] - The code definition object to pre-populate the form for editing. If null, the modal is in "create" mode.
 * @param {Function} [props.onBackendError] - An optional callback to pass the `setBackendError` function to the parent component.
 * @param {Array<object>} [props.codeDefinitions=[]] - An array of all existing code definitions, used to validate against duplicate colors.
 * @returns {JSX.Element|null} The rendered modal component or null if `show` is false.
 */
const DefineCodeModal = ({ show, onClose, onSave, initialCode = null, onBackendError, codeDefinitions = [] }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#E57373');
  const [error, setError] = useState('');
  const [backendError, setBackendError] = useState('');

  /**
   * Memoized list of colors already in use by other code definitions.
   * This prevents selecting a color that would create a duplicate.
   */
  const usedColors = useMemo(() => {
    return codeDefinitions
      .filter(def => def._id !== initialCode?._id)
      .map(def => def.color);
  }, [codeDefinitions, initialCode]);

  /**
   * Effect to initialize or reset the form's state when the modal is opened
   * or the `initialCode` prop changes.
   */
  useEffect(() => {
    if (show) {
      if (initialCode) {
        setName(initialCode.name || '');
        setDescription(initialCode.description || '');
        setColor(initialCode.color || '#E57373');
      } else {
        setName('');
        setDescription('');
        setColor('#E57373');
      }
      setError('');
      setBackendError('');
    }
  }, [initialCode, show]);

  /**
   * Effect to pass the `setBackendError` state setter to a parent component
   * if the `onBackendError` prop is provided.
   */
  useEffect(() => {
    if (onBackendError) {
      onBackendError(setBackendError);
    }
  }, [onBackendError]);

  /**
   * Handles the form submission. It performs validation checks for the code name
   * and color, then calls the `onSave` prop with the form data.
   * @param {React.FormEvent<HTMLFormElement>} e - The form submission event.
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setBackendError('');

    if (!name.trim()) {
      setError('Code name cannot be empty.');
      return;
    }

    if (usedColors.includes(color)) {
      setError('This color is already in use by another code.');
      return;
    }

    onSave({ name, description, color, _id: initialCode?._id });
  };

  /**
   * Closes the modal if the user clicks on the backdrop overlay.
   * @param {React.MouseEvent<HTMLDivElement>} e - The mouse click event.
   */
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
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
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ scale: 0.9, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 50 }}
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-6 text-center text-2xl font-bold text-cyan-900 dark:text-[#F05623]">
              {initialCode ? 'Edit Code Definition' : 'Define New Code'}
            </h2>
            {error && <p className="mb-4 text-center text-sm text-red-500">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="codeName" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Code Name:
                </label>
                <input
                  type="text"
                  id="codeName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-white transition duration-300 focus:outline-none focus:ring-2 focus:ring-[#F05623] dark:border-gray-600 dark:bg-gray-700"
                  required
                />
                {backendError && (
                  <p className="mt-1 text-sm text-red-500">{backendError}</p>
                )}
              </div>
              <div>
                <label htmlFor="codeDescription" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Description (Optional):
                </label>
                <textarea
                  id="codeDescription"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows="3"
                  className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2 text-white transition duration-300 focus:outline-none focus:ring-2 focus:ring-[#F05623] dark:border-gray-600 dark:bg-gray-700"
                ></textarea>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Color:
                </label>
                <ColorPicker
                  color={color}
                  onChange={setColor}
                  usedColors={usedColors}
                />
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg bg-gray-300 px-5 py-2 text-gray-800 transition hover:bg-gray-400 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-green-600 px-5 py-2 text-white transition hover:bg-green-700"
                >
                  {initialCode ? 'Update Code' : 'Save Code'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DefineCodeModal;