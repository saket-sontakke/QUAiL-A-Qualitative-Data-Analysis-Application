/**
 * @file DefineCodeModal.jsx
 * @description A modal component for creating a new code definition or editing an
 * existing one. It includes fields for name, description, and color selection,
 * and handles both client-side and server-side validation.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// A predefined color palette for quick selection.
const STANDARD_COLORS = [
  { name: 'Red', hex: '#E57373' },
  { name: 'Blue', hex: '#64B5F6' },
  { name: 'Green', hex: '#81C784' },
  { name: 'Yellow', hex: '#FFD54F' },
  { name: 'Purple', hex: '#BA68C8' },
  { name: 'Brown', hex: '#A1887F' },
];

const DefineCodeModal = ({ show, onClose, onSave, initialCode = null, onBackendError }) => {
  // State for form fields and error handling.
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(STANDARD_COLORS[0].hex);
  const [isCustomColorSelected, setIsCustomColorSelected] = useState(false);
  const [error, setError] = useState('');
  const [backendError, setBackendError] = useState('');

  /**
   * Populates the form when editing an existing code or resets it for a new one.
   * This effect runs when the modal is shown or the code to edit changes.
   */
  useEffect(() => {
    if (initialCode) {
      setName(initialCode.name || '');
      setDescription(initialCode.description || '');
      // Determine if the initial color is from the standard palette or custom.
      const foundStandardColor = STANDARD_COLORS.find(std => std.hex === initialCode.color);
      if (foundStandardColor) {
        setColor(foundStandardColor.hex);
        setIsCustomColorSelected(false);
      } else {
        setColor(initialCode.color || STANDARD_COLORS[0].hex);
        setIsCustomColorSelected(true);
      }
    } else {
      // Reset form to default values for creating a new code.
      setName('');
      setDescription('');
      setColor(STANDARD_COLORS[0].hex);
      setIsCustomColorSelected(false);
    }
    setError('');
    setBackendError('');
  }, [initialCode, show]);

  /**
   * Exposes the `setBackendError` function to the parent component. This allows
   * the parent to pass down API errors to be displayed in this modal.
   */
  useEffect(() => {
    if (onBackendError) {
      onBackendError(setBackendError);
    }
  }, [onBackendError]);

  /**
   * Handles form submission, performs validation, and calls the onSave callback.
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

    onSave({ name, description, color, _id: initialCode?._id });
  };

  /**
   * Updates the color state when a standard color is selected.
   * @param {string} selectedColorHex - The hex code of the selected color.
   */
  const handleColorSelect = (selectedColorHex) => {
    setColor(selectedColorHex);
    setIsCustomColorSelected(false);
  };

  /**
   * Activates the custom color picker.
   */
  const handleCustomColorClick = () => {
    setIsCustomColorSelected(true);
    const isCurrentColorStandard = STANDARD_COLORS.some(std => std.hex === color);
    if (isCurrentColorStandard) {
      setColor('#FFA500'); // Set a default custom color.
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
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 50 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-6 text-center text-[#1D3C87] dark:text-[#F05623]">
              {initialCode ? 'Edit Code Definition' : 'Define New Code'}
            </h2>
            {error && <p className="text-sm text-red-500 mb-4 text-center">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="codeName" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Code Name:
                </label>
                <input
                  type="text"
                  id="codeName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F05623]"
                  required
                />
                {backendError && (
                  <p className="text-sm text-red-500 mt-1">{backendError}</p>
                )}
              </div>
              <div>
                <label htmlFor="codeDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Description (Optional):
                </label>
                <textarea
                  id="codeDescription"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F05623]"
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Color:
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {STANDARD_COLORS.map((stdColor) => (
                    <button
                      key={stdColor.hex}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 ${color === stdColor.hex && !isCustomColorSelected
                          ? 'border-blue-500 ring-2 ring-blue-500'
                          : 'border-gray-300 dark:border-gray-600'
                        }`}
                      style={{ backgroundColor: stdColor.hex }}
                      onClick={() => handleColorSelect(stdColor.hex)}
                      title={stdColor.name}
                    ></button>
                  ))}
                  <button
                    type="button"
                    className={`px-3 py-1 rounded-md text-sm font-medium border ${isCustomColorSelected
                        ? 'border-blue-500 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                        : 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                      }`}
                    onClick={handleCustomColorClick}
                  >
                    Custom
                  </button>
                </div>
                {isCustomColorSelected && (
                  <input
                    type="color"
                    id="codeCustomColor"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer mt-2"
                  />
                )}
              </div>
              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 dark:text-gray-900 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
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
