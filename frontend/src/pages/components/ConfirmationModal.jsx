import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { FaCircleInfo } from 'react-icons/fa6';

const ConfirmationModal = ({
  show,
  onClose,
  onConfirm,
  onCancel,
  title,
  shortMessage,
  detailedMessage,
  showInput = false,
  promptText = "I understand",
  confirmText = 'Confirm',
  showCancelButton = true,
  customButtons = [],
  showCheckbox = false,
  checkboxLabel = 'I confirm and agree to proceed.',
  isCheckboxRequired = false,
  isCheckboxDisabled = false,
  showConfirmButton = true,
  defaultChecked = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [isChecked, setIsChecked] = useState(defaultChecked);

  useEffect(() => {
    if (show) {
      setInputValue('');
      setShowDetails(false);
      setIsChecked(defaultChecked);
    }
  }, [show, defaultChecked]);

  const handleConfirm = () => {
    if (typeof onConfirm === 'function') {
      onConfirm(isChecked);
    } else {
      if (typeof onClose === 'function') onClose();
    }
  };

  const handleCancel = (e) => {
    // Safety check: Prevent this button click from triggering anything else
    if (e) {
      e.preventDefault();
      e.stopPropagation(); 
    }

    if (typeof onCancel === 'function') {
      onCancel();
    } else if (typeof onClose === 'function') {
      onClose();
    }
  };

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
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={onClose}
          // -----------------------------------------------------------
          // CRITICAL FIX: Stop MouseDown/PointerDown from bubbling up
          // This prevents global listeners from thinking you clicked "outside" the memo
          // -----------------------------------------------------------
          onMouseDown={(e) => e.stopPropagation()} 
          onPointerDown={(e) => e.stopPropagation()}
        >
          <motion.div
            initial={{ scale: 0.8, y: -20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: -20 }}
            className="w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-xl dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
            // Optional: Double safety on the card itself
            onMouseDown={(e) => e.stopPropagation()} 
          >
            <h2 className="mb-4 text-xl font-bold text-gray-800 dark:text-white">
              {title}
            </h2>

            <div className="mb-6 wrap-break-word whitespace-normal text-sm text-gray-600 dark:text-gray-400">
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
                    className="overflow-hidden rounded-md bg-gray-100 p-3 text-justify text-xs dark:bg-gray-700"
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
                    disabled={isCheckboxDisabled}
                    onChange={() => setIsChecked(!isChecked)}
                    className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="select-none text-sm">{checkboxLabel}</span>
                </label>
              </div>
            )}

            <div className="flex justify-center gap-4">
              {customButtons.map((button, index) => (
                <button
                  key={index}
                  onClick={button.onClick}
                  className={`rounded-lg px-4 py-2 font-semibold text-white transition-all duration-200 ease-in-out hover:scale-105 ${button.className || 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {button.text}
                </button>
              ))}
              {showConfirmButton && confirmText && (
                <button
                  onClick={handleConfirm}
                  disabled={isConfirmDisabled}
                  className={`
                    rounded-lg px-4 py-2 font-semibold text-white transition-all duration-200 ease-in-out
                    ${isConfirmDisabled ? 'cursor-not-allowed bg-gray-400 dark:bg-gray-600' : 'transform bg-red-600 hover:scale-105 hover:bg-red-700'}
                  `}
                >
                  {confirmText}
                </button>
              )}
              {showCancelButton && (
                <button
                  onClick={handleCancel}
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

// Default props
ConfirmationModal.defaultProps = {
  onClose: () => {},
  onConfirm: () => {},
  onCancel: null,
  customButtons: [],
  detailedMessage: '',
  showInput: false,
  promptText: "I understand",
  confirmText: 'Confirm',
  showCancelButton: true,
  showCheckbox: false,
  checkboxLabel: 'I confirm and agree to proceed.',
  isCheckboxRequired: false,
  isCheckboxDisabled: false,
  showConfirmButton: true,
  defaultChecked: false,
};

export default ConfirmationModal;