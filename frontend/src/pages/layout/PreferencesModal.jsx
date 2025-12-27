import React from 'react';
import { FaTimes, FaInfoCircle } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Renders a modal for managing user-specific application preferences.
 */
const PreferencesModal = ({ 
  show, 
  onClose, 
  onResetWarnings, 
  showTooltip, 
  onToggleTooltip, 
  onRestoreDefaults,
  // New Props
  smartSelectionEnabled,
  onToggleSmartSelection
}) => {
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
            initial={{ scale: 0.9, y: -20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: -20 }}
            transition={{ duration: 0.2 }}
            className="mx-4 w-full max-w-md rounded-lg bg-white shadow-2xl dark:bg-gray-800"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 p-5 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                User Preferences
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
                title="Close"
              >
                <FaTimes size={20} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              
              {/* --- Option 1: Tooltip --- */}
              <div className="flex items-start justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                <div className="pr-4">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                    Show Code Tooltip on Hover
                  </h4>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Display a pop-up with code details when hovering over coded text.
                  </p>
                </div>
                <div className="mt-1 flex-shrink-0">
                  <label htmlFor="tooltip-toggle" className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      id="tooltip-toggle"
                      className="peer sr-only"
                      checked={showTooltip}
                      onChange={onToggleTooltip}
                    />
                    <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-cyan-800 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-800 dark:border-gray-600 dark:bg-gray-700 dark:peer-checked:bg-[#F05623] dark:peer-focus:ring-[#F05623]"></div>
                  </label>
                </div>
              </div>

              {/* --- Option 2: Smart Selection (New) --- */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                <div className="flex items-start justify-between">
                    <div className="pr-4">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                        Smart Text Selection
                    </h4>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Automatically snaps your selection to complete words and sentences for faster coding.
                    </p>
                    </div>
                    <div className="mt-1 flex-shrink-0">
                    <label htmlFor="smart-select-toggle" className="relative inline-flex cursor-pointer items-center">
                        <input
                        type="checkbox"
                        id="smart-select-toggle"
                        className="peer sr-only"
                        checked={smartSelectionEnabled}
                        onChange={onToggleSmartSelection}
                        />
                        <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-cyan-800 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-800 dark:border-gray-600 dark:bg-gray-700 dark:peer-checked:bg-[#F05623] dark:peer-focus:ring-[#F05623]"></div>
                    </label>
                    </div>
                </div>

                {/* Professional Tip Section */}
                <div className="mt-3 flex gap-2 rounded-md bg-blue-50 p-3 text-xs text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                    <FaInfoCircle className="mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                    <span>
                        <span className="font-bold">Precision Mode:</span> To temporarily disable smart selection and select specific characters, hold <kbd className="rounded border border-blue-200 bg-white px-1 font-sans font-semibold text-gray-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">Ctrl</kbd> (Windows) or <kbd className="rounded border border-blue-200 bg-white px-1 font-sans font-semibold text-gray-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">Cmd</kbd> (Mac) while dragging.
                    </span>
                </div>
              </div>

            </div>

            <div className="flex items-center justify-between rounded-b-lg border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
              <button
                onClick={onRestoreDefaults}
                className="rounded-md border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-500 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Restore Defaults
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PreferencesModal;