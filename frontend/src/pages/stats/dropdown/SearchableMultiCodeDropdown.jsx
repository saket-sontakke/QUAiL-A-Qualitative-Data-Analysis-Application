import React, { useState, useEffect, useRef } from 'react';
import { FaChevronDown } from 'react-icons/fa';

/**
 * A reusable dropdown component for selecting multiple "codes" from a list.
 * It features a search input to filter the options and a "Select All" function
 * that applies to the currently filtered items.
 *
 * @param {object} props - The component props.
 * @param {Array<object>} [props.codes=[]] - The array of available code objects to display. Each object should have `_id`, `name`, and `color`.
 * @param {Array<string>} [props.selectedCodeIds=[]] - An array of `_id`s for the currently selected codes.
 * @param {(selectedIds: string[]) => void} props.onSelectionChange - The callback function invoked with the new array of selected IDs when the selection changes.
 * @param {string} [props.placeholder="Select codes..."] - The placeholder text to display when no codes are selected.
 * @returns {JSX.Element} The rendered searchable multi-select dropdown component.
 */
const SearchableMultiCodeDropdown = ({
  codes = [],
  selectedCodeIds = [],
  onSelectionChange,
  placeholder = "Select codes..."
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  /**
   * Effect to handle clicks outside of the dropdown to close it.
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const filteredCodes = codes.filter(code =>
    code.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCodeIds = filteredCodes.map(code => code._id);
  const areAllFilteredSelected = filteredCodeIds.length > 0 && filteredCodeIds.every(id => selectedCodeIds.includes(id));

  const handleToggleSelectAll = () => {
    const selectedIdsSet = new Set(selectedCodeIds);
    if (areAllFilteredSelected) {
      filteredCodeIds.forEach(id => selectedIdsSet.delete(id));
    } else {
      filteredCodeIds.forEach(id => selectedIdsSet.add(id));
    }
    onSelectionChange(Array.from(selectedIdsSet));
  };

  const handleToggleCode = (codeId) => {
    const newSelection = selectedCodeIds.includes(codeId) ?
      selectedCodeIds.filter(id => id !== codeId) :
      [...selectedCodeIds, codeId];
    onSelectionChange(newSelection);
  };

  const selectionText = selectedCodeIds.length > 0 ?
    `${selectedCodeIds.length} code(s) selected` :
    placeholder;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-md border p-2 text-left focus:outline-none focus:ring-2 focus:ring-cyan-700 dark:border-gray-600 dark:bg-gray-700"
      >
        <span className="truncate pr-2 text-gray-800 dark:text-gray-200">{selectionText}</span>
        <FaChevronDown className={`flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 flex max-h-60 w-full flex-col rounded-md border bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800">
          <div className="sticky top-0 z-10 bg-white dark:bg-gray-800">
            <div className="border-b p-2 dark:border-gray-700">
              <input
                type="text"
                placeholder="Search codes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-md border p-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700"
                autoFocus
              />
            </div>
            {filteredCodes.length > 0 && (
              <div
                onClick={handleToggleSelectAll}
                className="flex cursor-pointer items-center gap-3 border-b p-2 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700"
              >
                <input
                  type="checkbox"
                  checked={areAllFilteredSelected}
                  readOnly
                  className="pointer-events-none h-4 w-4 rounded border-gray-300 text-cyan-900 focus:ring-cyan-700"
                />
                <span className="overflow-hidden text-ellipsis whitespace-nowrap font-semibold text-gray-800 dark:text-gray-200">
                  Select All
                </span>
              </div>
            )}
          </div>

          <ul className="flex-grow overflow-y-auto p-1 custom-scrollbar">
            {filteredCodes.length > 0 ? filteredCodes.map(code => {
              const isSelected = selectedCodeIds.includes(code._id);
              return (
                <li
                  key={code._id}
                  onClick={() => handleToggleCode(code._id)}
                  className="flex cursor-pointer items-center gap-3 rounded-md p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    className="pointer-events-none h-4 w-4 rounded border-gray-300 text-cyan-900 focus:ring-cyan-700"
                  />
                  <span
                    className="h-3 w-3 flex-shrink-0 rounded-full border dark:border-gray-600"
                    style={{ backgroundColor: code.color || '#cccccc' }}
                  ></span>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap text-gray-800 dark:text-gray-200" title={code.name}>
                    {code.name}
                  </span>
                </li>
              );
            }) : (
              <li className="p-2 text-center text-gray-500">No codes found.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchableMultiCodeDropdown;