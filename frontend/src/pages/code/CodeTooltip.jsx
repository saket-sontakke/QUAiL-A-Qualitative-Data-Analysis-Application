import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Helper to truncate text to show start and end.
 */
const formatExtent = (text, maxLength = 40) => {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  
  const keepLength = Math.floor((maxLength - 3) / 2);
  return `${text.substring(0, keepLength)}...${text.substring(text.length - keepLength)}`;
};

const CodeTooltip = ({ codes, visible }) => {
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
          <h4 className="mb-3 text-sm font-bold text-cyan-900 dark:text-[#F05623]">
            {title}
          </h4>
          
          {/* Loop through ALL codes */}
          <ul className="space-y-3">
            {codes.map((ann) => {
              const color = ann.codeDefinition?.color || '#ccc';
              const name = ann.codeDefinition?.name || 'Unnamed Code';
              // Handle potential differences in property names
              const textContent = ann.text || ann.selectedText || ""; 

              return (
                <li key={ann._id} className="flex flex-col">
                  {/* Header: Dot + Name */}
                  <div className="flex items-center text-xs">
                    <span
                      className="mr-2 h-3 w-3 shrink-0 rounded-full border border-gray-400 dark:border-gray-500"
                      style={{ backgroundColor: color }}
                    ></span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {name}
                    </span>
                  </div>

                  {/* Snippet: Colored Text */}
                  {textContent && (
                    <p 
                      className="mt-1 ml-5 text-[12px] italic opacity-90"
                      // 1. Applies specific code color
                      style={{ color: color }} 
                    >
                      "{formatExtent(textContent)}"
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CodeTooltip;