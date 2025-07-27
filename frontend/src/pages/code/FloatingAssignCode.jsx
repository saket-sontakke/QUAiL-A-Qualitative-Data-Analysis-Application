/**
 * @file FloatingAssignCode.jsx
 * @description A floating UI component that appears next to a user's text selection,
 * allowing them to assign a predefined code. It includes functionality to search
 * for codes and to trigger the creation of a new code definition.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaPlus, FaSearch } from 'react-icons/fa';

const FloatingAssignCode = ({ x, y, onClose, onAssignCode, codeDefinitions, onDefineNewCode }) => {
  // State for the search input to filter code definitions.
  const [filterText, setFilterText] = useState('');

  // Dynamically positions the component based on the provided x and y coordinates.
  const style = {
    left: `${x}px`,
    top: `${y}px`,
    position: 'fixed',
  };

  // Filters the list of codes based on the user's search text.
  const filteredCodes = codeDefinitions.filter(code =>
    code.name.toLowerCase().includes(filterText.toLowerCase()) ||
    (code.description && code.description.toLowerCase().includes(filterText.toLowerCase()))
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="floating-assign-code bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl z-50 w-60 flex flex-col"
        style={style}
        onClick={(e) => e.stopPropagation()} // Prevents clicks inside from closing the component.
      >
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-[#1D3C87] dark:text-[#F05623]">
            Assign Code
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title="Close"
          >
            <FaTimes size={16} />
          </button>
        </div>

        {/* Search input for filtering codes */}
        <div className="relative mb-3">
          <input
            type="text"
            placeholder="Search codes..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full pl-8 pr-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-[#F05623] text-sm"
          />
          <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm" />
        </div>

        {/* Scrollable list of available codes */}
        <div className="flex-grow overflow-y-auto pr-1 custom-scrollbar max-h-48">
          <div className="grid grid-cols-2 gap-1">
            {filteredCodes.map((code) => (
              <div
                key={code._id}
                onClick={() => onAssignCode(code._id)}
                className="cursor-pointer bg-opacity-20 rounded-md transition-all duration-200 ease-in-out hover:bg-gray-100 dark:hover:bg-gray-700 flex flex-col justify-center p-1"
                style={{
                  backgroundColor: code.color + '33', // Use the code's color with transparency.
                  height: '30px',
                }}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] text-gray-800 dark:text-white font-medium truncate w-[80%]">
                    {code.name}
                  </span>
                  <div
                    className="w-2 h-2 rounded-full border border-gray-400"
                    style={{ backgroundColor: code.color }}
                  ></div>
                </div>
              </div>
            ))}

            {/* Button to open the 'Define New Code' modal */}
            <div
              onClick={onDefineNewCode}
              className="cursor-pointer bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-all duration-200 ease-in-out flex items-center justify-center p-1"
              style={{ height: '30px' }}
              title="Define New Code"
            >
              <FaPlus className="text-[10px] mr-1" />
              <span className="text-[10px] font-medium">Define New</span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FloatingAssignCode;
