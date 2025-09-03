import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * A styled tooltip component that appears in a fixed position (bottom-right)
 * to display information about one or more code definitions. It shows a list
 * of codes, each with a name and a corresponding color swatch.
 *
 * @param {object} props - The component props.
 * @param {Array<object>} props.codes - An array of code objects to display in the tooltip. Each object should contain a `codeDefinition` property.
 * @param {boolean} props.visible - A boolean that controls the visibility and enter/exit animations of the tooltip.
 * @returns {JSX.Element|null} The rendered tooltip component or null if it should not be visible.
 */
const CustomTooltip = ({ codes, visible }) => {
  if (!visible || !codes || codes.length === 0) {
    return null;
  }

  const title = codes.length > 1 ? "Overlapping Codes" : "Code";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          transition={{ duration: 0.15 }}
          className="pointer-events-none fixed bottom-5 right-5 z-[100] max-w-xs rounded-lg border border-gray-300 bg-white p-3 shadow-xl dark:border-gray-600 dark:bg-gray-800"
        >
          <h4 className="mb-2 text-sm font-bold text-cyan-900 dark:text-[#F05623]">{title}</h4>
          <ul className="space-y-1.5">
            {codes.map((ann) => (
              <li key={ann._id} className="flex items-center text-xs">
                <span
                  className="mr-2 h-3 w-3 flex-shrink-0 rounded-full border border-gray-400 dark:border-gray-500"
                  style={{ backgroundColor: ann.codeDefinition?.color || '#ccc' }}
                ></span>
                <span className="text-gray-800 dark:text-gray-200">
                  {ann.codeDefinition?.name || 'Unnamed Code'}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-2 border-t border-gray-200 pt-1.5 dark:border-gray-700">
            <p className="text-[11px] italic text-gray-500 dark:text-gray-400">
              You can disable this in Preferences.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CustomTooltip;