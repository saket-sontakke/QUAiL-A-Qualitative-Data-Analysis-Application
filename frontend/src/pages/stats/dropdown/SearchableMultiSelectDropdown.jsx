import React, { useState, useEffect, useRef } from 'react';
import { AiFillAudio } from "react-icons/ai";
import { IoDocumentTextOutline } from "react-icons/io5";
import { FaChevronDown } from 'react-icons/fa';

/**
 * A reusable dropdown component for selecting multiple files from a list.
 * It features a search input to filter the options, a "Select All" function
 * for the currently filtered items, and the ability to disable specific files
 * from being selected.
 *
 * @param {object} props - The component props.
 * @param {Array<object>} props.files - The array of available file objects to display.
 * @param {Array<string>} props.selectedFileIds - An array of `_id`s for the currently selected files.
 * @param {(selectedIds: string[]) => void} props.onSelectionChange - The callback function invoked with the new array of selected IDs when the selection changes.
 * @param {Array<string>} [props.disabledFileIds=[]] - An array of file `_id`s that should be disabled and unselectable.
 * @param {string} [props.placeholder="Select files..."] - The placeholder text to display when no files are selected.
 * @returns {JSX.Element} The rendered searchable multi-select dropdown component.
 */
const SearchableMultiSelectDropdown = ({
  files,
  selectedFileIds,
  onSelectionChange,
  disabledFileIds = [],
  placeholder = "Select files..."
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

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAndEnabledIds = filteredFiles
    .filter(file => !disabledFileIds.includes(file._id))
    .map(file => file._id);

  const areAllFilteredSelected = filteredAndEnabledIds.length > 0 && filteredAndEnabledIds.every(id => selectedFileIds.includes(id));

  const handleToggleSelectAll = () => {
    const selectedIdsSet = new Set(selectedFileIds);

    if (areAllFilteredSelected) {
      filteredAndEnabledIds.forEach(id => selectedIdsSet.delete(id));
    } else {
      filteredAndEnabledIds.forEach(id => selectedIdsSet.add(id));
    }
    onSelectionChange(Array.from(selectedIdsSet));
  };

  const handleToggleFile = (fileId) => {
    const newSelection = selectedFileIds.includes(fileId) ?
      selectedFileIds.filter(id => id !== fileId) :
      [...selectedFileIds, fileId];
    onSelectionChange(newSelection);
  };

  const selectionText = selectedFileIds.length > 0 ?
    `${selectedFileIds.length} file(s) selected` :
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
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-md border p-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700"
                autoFocus
              />
            </div>
            {filteredFiles.length > 0 && (
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
            {filteredFiles.length > 0 ? filteredFiles.map(file => {
              const isSelected = selectedFileIds.includes(file._id);
              const isDisabled = disabledFileIds.includes(file._id);

              return (
                <li
                  key={file._id}
                  onClick={() => !isDisabled && handleToggleFile(file._id)}
                  className={`flex items-center gap-3 rounded-md p-2 transition-colors ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isDisabled}
                    readOnly
                    className="pointer-events-none h-4 w-4 rounded border-gray-300 text-cyan-900 focus:ring-cyan-700"
                  />
                  {file.sourceType === 'audio' ? <AiFillAudio className="flex-shrink-0 text-[#F05623]" /> : <IoDocumentTextOutline className="flex-shrink-0 text-[#1D3C87] dark:text-blue-500" />}
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap text-gray-800 dark:text-gray-200" title={file.name}>
                    {file.name}
                  </span>
                </li>
              );
            }) : (
              <li className="p-2 text-center text-gray-500">No files found.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchableMultiSelectDropdown;