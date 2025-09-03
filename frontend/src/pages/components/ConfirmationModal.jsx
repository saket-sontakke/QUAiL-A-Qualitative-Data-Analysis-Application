import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { FaCircleInfo } from 'react-icons/fa6';

/**
 * A highly configurable and reusable modal component for handling various user
 * confirmation scenarios. It can be adapted for simple confirmations, or for more
 * critical actions requiring additional user input, such as typing a specific
 * phrase or checking a confirmation box.
 *
 * @param {object} props - The component props.
 * @param {boolean} props.show - Determines if the modal is visible.
 * @param {Function} props.onClose - The callback function to execute when the modal is closed or cancelled.
 * @param {Function} props.onConfirm - The callback function to execute when the confirm button is clicked. It receives the checkbox state as an argument.
 * @param {string} props.title - The title text displayed at the top of the modal.
 * @param {string} props.shortMessage - The primary message or question displayed to the user.
 * @param {string} [props.detailedMessage] - Optional secondary text that can be revealed by the user for more context.
 * @param {boolean} [props.showInput=false] - If true, displays a text input field for validation.
 * @param {string} [props.promptText="I understand"] - The exact string the user must type into the input field to enable confirmation.
 * @param {string} [props.confirmText='Confirm'] - The text displayed on the confirmation button.
 * @param {boolean} [props.showCancelButton=true] - If true, displays the "Cancel" button.
 * @param {boolean} [props.showCheckbox=false] - If true, displays a checkbox.
 * @param {string} [props.checkboxLabel='I confirm and agree to proceed.'] - The label for the checkbox.
 * @param {boolean} [props.isCheckboxRequired=false] - If true, the checkbox must be checked to enable confirmation.
 * @returns {JSX.Element|null} The rendered modal component or null if `show` is false.
 */
const ConfirmationModal = ({
  show,
  onClose,
  onConfirm,
  title,
  shortMessage,
  detailedMessage,
  showInput = false,
  promptText = "I understand",
  confirmText = 'Confirm',
  showCancelButton = true,
  showCheckbox = false,
  checkboxLabel = 'I confirm and agree to proceed.',
  isCheckboxRequired = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  /**
   * Effect to reset the modal's internal state whenever it becomes visible.
   */
  useEffect(() => {
    if (show) {
      setInputValue('');
      setShowDetails(false);
      setIsChecked(false);
    }
  }, [show]);

  const isConfirmDisabled =
    (showInput && inputValue !== promptText) ||
    (showCheckbox && isCheckboxRequired && !isChecked);

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
            initial={{ scale: 0.8, y: -20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: -20 }}
            className="w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-xl dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-xl font-bold text-gray-800 dark:text-white">
              {title}
            </h2>

            <div className="mb-6 break-words whitespace-normal text-sm text-gray-600 dark:text-gray-400">
              <div className='flex items-center justify-center'>
                {shortMessage}
                {detailedMessage && (
                  <button onClick={() => setShowDetails(!showDetails)} className="ml-2 text-gray-400 hover:text-gray-300">
                    <FaCircleInfo size={16} />
                  </button>
                )}
              </div>
              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: '16px' }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="overflow-hidden rounded-md bg-gray-100 p-3 text-left text-xs dark:bg-gray-700"
                  >
                    {detailedMessage}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {showInput && (
              <div className="mb-6">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={`Type "${promptText}" to proceed`}
                  className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  autoFocus
                />
              </div>
            )}

            {showCheckbox && (
              <div className="mb-6 text-left">
                <label className="flex cursor-pointer items-center justify-center gap-2 text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => setIsChecked(!isChecked)}
                    className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="select-none text-sm">{checkboxLabel}</span>
                </label>
              </div>
            )}

            <div className="flex justify-center gap-4">
              <button
                onClick={() => onConfirm(isChecked)}
                disabled={isConfirmDisabled}
                className={`
                  rounded-lg px-4 py-2 font-semibold text-white transition-all duration-200 ease-in-out
                  ${isConfirmDisabled ? 'cursor-not-allowed bg-gray-400 dark:bg-gray-600' : 'transform bg-red-600 hover:scale-105 hover:bg-red-700'}
                `}
              >
                {confirmText}
              </button>
              {showCancelButton && (
                <button
                  onClick={onClose}
                  className="rounded-lg bg-gray-200 px-4 py-2 font-semibold text-gray-800 transition-all duration-200 ease-in-out hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationModal;