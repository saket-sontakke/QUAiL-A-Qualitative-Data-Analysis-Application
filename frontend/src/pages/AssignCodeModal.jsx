import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaTimes } from 'react-icons/fa'; // Import FaPlus and FaTimes

const AssignCodeModal = ({ show, onClose, onAssignCode, codeDefinitions, onDefineNewCode }) => {
  const [filterText, setFilterText] = useState('');

  if (!show) return null;

  const filteredCodes = codeDefinitions.filter(code =>
    code.name.toLowerCase().includes(filterText.toLowerCase()) ||
    (code.description && code.description.toLowerCase().includes(filterText.toLowerCase()))
  );

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={onClose} // Allows closing by clicking outside
        >
          <motion.div
            initial={{ scale: 0.9, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 50 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col assign-code-modal-content" // Added class for click handling
            onClick={(e) => e.stopPropagation()} // Prevent modal from closing when clicking inside
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-[#1D3C87] dark:text-[#F05623]">Assign Code</h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                title="Close"
              >
                <FaTimes size={20} />
              </button>
            </div>

            <input
              type="text"
              placeholder="Search codes..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-[#F05623]"
            />

            <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
              {codeDefinitions.length > 0 ? (
                <ul className="space-y-2">
                  {filteredCodes.map((code) => (
                    <li
                      key={code._id}
                      onClick={() => {
                        onAssignCode(code._id); // Assign code by ID
                      }}
                      className="p-3 rounded-lg flex flex-col cursor-pointer transition-all duration-200 ease-in-out
                                 hover:bg-gray-100 dark:hover:bg-gray-700 group"
                      style={{ backgroundColor: code.color + '33' }} // Subtle background tint
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-800 dark:text-white">
                          {code.name}
                        </span>
                        {/* Optionally show color swatch or icon */}
                        <div className="w-5 h-5 rounded-full border border-gray-400" style={{ backgroundColor: code.color }}></div>
                      </div>
                      {code.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          {code.description}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 mt-8">
                  No codes found for this document. Define one first!
                </p>
              )}
            </div>

            <div className="mt-6 flex justify-center">
              <button
                onClick={() => {
                  onDefineNewCode(); // Open DefineCodeModal
                }}
                className="px-5 py-2 bg-[#1D3C87] hover:bg-[#152e6e] text-white rounded-lg flex items-center transition"
              >
                <FaPlus className="mr-2" /> Define New Code
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AssignCodeModal;
