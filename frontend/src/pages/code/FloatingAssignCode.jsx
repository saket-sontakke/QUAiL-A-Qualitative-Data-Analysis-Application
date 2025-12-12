import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaPlus, FaSearch } from 'react-icons/fa';

/**
 * Renders a floating UI component that appears at a specified coordinate,
 * typically next to a user's text selection. It allows the user to assign a
 * predefined code to the selection. The component includes a search filter
 * for the code list and an option to trigger the creation of a new code.
 *
 * @param {object} props - The component props.
 * @param {number} props.x - The horizontal (left) position for the component in pixels.
 * @param {number} props.y - The vertical (top) position for the component in pixels.
 * @param {Function} props.onClose - The callback function to execute when the component should be closed.
 * @param {Function} props.onAssignCode - The callback function to execute when a code is selected, passed the code's ID.
 * @param {Array<object>} props.codeDefinitions - The array of available code definition objects to display.
 * @param {Function} props.onDefineNewCode - The callback function to trigger the UI for defining a new code.
 * @returns {JSX.Element} The rendered floating code assignment component.
 */
const FloatingAssignCode = ({ x, y, onClose, onAssignCode, codeDefinitions, onDefineNewCode }) => {
  const [filterText, setFilterText] = useState('');

  const style = {
    left: `${x}px`,
    top: `${y}px`,
    position: 'fixed',
  };

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
        className="floating-assign-code z-50 flex w-60 flex-col rounded-lg border-[1.5px] border-gray-700 bg-white p-4 shadow-xl dark:bg-gray-800"
        style={style}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-cyan-900 dark:text-[#F05623]">
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

        <div className="relative mb-3">
          <input
            type="text"
            placeholder="Search codes..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F05623] dark:border-gray-600 dark:bg-gray-700"
          />
          <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-gray-500" />
        </div>

        <div className="custom-scrollbar max-h-27 grow overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-1">
            {filteredCodes.map((code) => (
              <div
                key={code._id}
                onClick={() => onAssignCode(code._id)}
                className="flex cursor-pointer flex-col justify-center rounded-md bg-opacity-20 p-1 transition-all duration-200 ease-in-out hover:bg-gray-100 dark:hover:bg-gray-700"
                style={{
                  backgroundColor: code.color + '33',
                  height: '30px',
                }}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="w-[80%] truncate text-[10px] font-medium text-gray-800 dark:text-white">
                    {code.name}
                  </span>
                  <div
                    className="h-2 w-2 rounded-full border border-gray-400"
                    style={{ backgroundColor: code.color }}
                  ></div>
                </div>
              </div>
            ))}

            <div
              onClick={onDefineNewCode}
              className="group flex cursor-pointer items-center justify-start rounded-md bg-transparent pl-2 text-gray-900 transition-colors duration-200 ease-in-out dark:text-white"
              style={{ height: '30px' }}
              title="Define New Code"
            >
              <FaPlus className="mr-1 text-[10px] transition-colors duration-200 group-hover:text-gray-700 dark:group-hover:text-gray-300" />
              <span className="text-[10px] font-medium transition-colors duration-200 group-hover:text-gray-700 dark:group-hover:text-gray-300">Define New</span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FloatingAssignCode;