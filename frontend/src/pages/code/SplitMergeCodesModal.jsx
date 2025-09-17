import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FaTimes, FaPlus, FaTrashAlt, FaInfoCircle } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import ColorPicker from '../components/ColorPicker';

const STANDARD_COLORS = [
  { name: 'Red', hex: '#E57373' }, { name: 'Blue', hex: '#64B5F6' },
  { name: 'Green', hex: '#81C784' }, { name: 'Yellow', hex: '#FFD54F' },
  { name: 'Purple', hex: '#BA68C8' }, { name: 'Brown', hex: '#A1887F' },
];

/**
 * A modal component for advanced codebook management, providing two main
 * functionalities: merging multiple existing codes into a single new code, or
 * splitting a single code into several new, more specific codes.
 *
 * @param {object} props - The component props.
 * @param {boolean} props.show - Determines if the modal is visible.
 * @param {Function} props.onClose - The function to call when the modal should be closed.
 * @param {Array<object>} props.codeDefinitions - An array of all existing code definition objects.
 * @param {Function} props.onMerge - The callback to execute the merge operation, passed an object with source IDs and new code details.
 * @param {Function} props.onInitiateSplit - The callback to begin the split operation, passed the source ID and an array of new code definitions.
 * @param {Array<object>} props.allCodedSegments - An array of all coded segments in the project.
 * @returns {JSX.Element|null} The rendered modal component or null if `show` is false.
 */
const SplitMergeCodesModal = ({ show, onClose, codeDefinitions, onMerge, onInitiateSplit, allCodedSegments }) => {
  const [activeTab, setActiveTab] = useState('merge');
  const [codesToMerge, setCodesToMerge] = useState(['', '']);
  const [newMergeCodeName, setNewMergeCodeName] = useState('');
  const [newMergeCodeColor, setNewMergeCodeColor] = useState('#E57373');
  const [splitSource, setSplitSource] = useState('');
  const [newSplitCodes, setNewSplitCodes] = useState([]);
  const [activeColorPopover, setActiveColorPopover] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const errorTimeoutRef = useRef(null);
  const customColorInputRef = useRef(null);
  const [showMergeInfo, setShowMergeInfo] = useState(false);
  const [showSplitInfo, setShowSplitInfo] = useState(false);

  const usedColorsSet = useMemo(() => new Set(codeDefinitions.map(def => def.color)), [codeDefinitions]);

  /**
   * Finds an available color that is not currently in use. It prioritizes
   * standard colors before generating a random hex color as a fallback.
   * @param {Set<string>} existingColorsSet - A set of hex color strings that are already in use.
   * @returns {string} An available hex color string.
   */
  const findAvailableColor = (existingColorsSet) => {
    const availableStandardColor = STANDARD_COLORS.find(sc => !existingColorsSet.has(sc.hex));
    if (availableStandardColor) {
      return availableStandardColor.hex;
    }
    let randomColor;
    do {
      randomColor = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
    } while (existingColorsSet.has(randomColor));
    return randomColor;
  };

  /**
   * Effect to clean up the error message timeout when the component unmounts.
   */
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Effect to reset the modal's state whenever it is opened.
   */
  useEffect(() => {
    if (show) {
      setActiveTab('merge');
      setErrorMessage('');
      setActiveColorPopover(null);
      setShowMergeInfo(false);
      setShowSplitInfo(false);

      setCodesToMerge([
        codeDefinitions[0]?._id || '',
        codeDefinitions[1]?._id || ''
      ]);
      setNewMergeCodeName('');
      setSplitSource(codeDefinitions[0]?._id || '');
      const firstAvailableColor = findAvailableColor(usedColorsSet);
      setNewMergeCodeColor(firstAvailableColor);
      const tempUsedColors = new Set(usedColorsSet);
      const firstSplitColor = findAvailableColor(tempUsedColors);
      tempUsedColors.add(firstSplitColor);
      const secondSplitColor = findAvailableColor(tempUsedColors);
      setNewSplitCodes([
        { name: '', color: firstSplitColor },
        { name: '', color: secondSplitColor }
      ]);
    }
  }, [show, codeDefinitions]);

  /**
   * Effect to handle clicks outside of active popovers to close them.
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeColorPopover !== null && !event.target.closest('.color-popover-container')) {
        setActiveColorPopover(null);
      }
      if (showMergeInfo && !event.target.closest('.info-popover-container-merge')) {
        setShowMergeInfo(false);
      }
      if (showSplitInfo && !event.target.closest('.info-popover-container-split')) {
        setShowSplitInfo(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeColorPopover, showMergeInfo, showSplitInfo]);

  /**
   * Displays an error message for a 5-second duration.
   * @param {string} message - The error message to display.
   */
  const showError = (message) => {
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    setErrorMessage(message);
    errorTimeoutRef.current = setTimeout(() => setErrorMessage(''), 5000);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleAddMergeSource = () => setCodesToMerge([...codesToMerge, '']);

  const handleRemoveMergeSource = (index) => setCodesToMerge(codesToMerge.filter((_, i) => i !== index));

  const handleMergeSourceChange = (index, value) => {
    const updatedCodes = [...codesToMerge];
    updatedCodes[index] = value;
    setCodesToMerge(updatedCodes);
  };

  const handleAddNewSplitCode = () => {
    const currentModalColors = new Set(newSplitCodes.map(c => c.color));
    const allUsedColors = new Set([...usedColorsSet, ...currentModalColors]);
    const newColor = findAvailableColor(allUsedColors);
    setNewSplitCodes([...newSplitCodes, { name: '', color: newColor }]);
  };

  const handleRemoveSplitCode = (index) => setNewSplitCodes(newSplitCodes.filter((_, i) => i !== index));

  const handleSplitCodeChange = (index, field, value) => {
    const updatedCodes = [...newSplitCodes];
    updatedCodes[index][field] = value;
    setNewSplitCodes(updatedCodes);
  };

  const handleMergeSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');
    const validSourceCodes = codesToMerge.filter(id => id);
    const uniqueSourceCodes = [...new Set(validSourceCodes)];
    if (uniqueSourceCodes.length < 2) {
      showError('Please select at least two different codes to merge.');
      return;
    }
    if (!newMergeCodeName.trim()) {
      showError('Please provide a name for the new merged code.');
      return;
    }
    if (usedColorsSet.has(newMergeCodeColor)) {
      showError('The selected color for the new code is already in use.');
      return;
    }
    onMerge({
      sourceCodeIds: uniqueSourceCodes,
      newCodeName: newMergeCodeName,
      newCodeColor: newMergeCodeColor
    });
  };

  const handleSplitSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (splitSource) {
      const segmentsForSourceCode = allCodedSegments.filter(s => s.codeDefinition?._id === splitSource);
      if (segmentsForSourceCode.length === 0) {
        showError('The selected code has no coded segments in the project, so there is nothing to split.');
        return;
      }
    }
    
    const validNewCodes = newSplitCodes.filter(c => c.name.trim() !== '');
    if (!splitSource || validNewCodes.length < 2) {
      showError('Please select a code to split and define at least two new codes.');
      return;
    }
    const namesInModal = validNewCodes.map(c => c.name.trim().toLowerCase());
    if (new Set(namesInModal).size !== namesInModal.length) {
      showError('Please provide a unique name for each new code.');
      return;
    }
    const colorsInModal = validNewCodes.map(c => c.color);
    if (new Set(colorsInModal).size !== colorsInModal.length) {
      showError('Please select a unique color for each new code.');
      return;
    }
    if (colorsInModal.some(color => usedColorsSet.has(color))) {
      showError('One of the selected new colors is already in use by another code.');
      return;
    }
    onInitiateSplit(splitSource, validNewCodes);
  };

  if (!show) return null;
  const availableMergeOptions = codeDefinitions.filter(cd => !codesToMerge.includes(cd._id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={handleBackdropClick}>
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -30 }}
        className="flex w-full max-w-lg max-h-[90vh] flex-col rounded-lg bg-white shadow-2xl dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <h2 className="text-xl font-bold text-cyan-900 dark:text-[#F05623]">Split / Merge Codes</h2>
          <button onClick={onClose} className="rounded-full p-2 text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"><FaTimes /></button>
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button onClick={() => { setActiveTab('merge'); setErrorMessage(''); }} className={`flex-1 p-3 text-sm font-semibold transition-colors ${activeTab === 'merge' ? 'bg-gray-100 text-[#F05623] dark:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}>Merge Codes</button>
          <button onClick={() => { setActiveTab('split'); setErrorMessage(''); }} className={`flex-1 p-3 text-sm font-semibold transition-colors ${activeTab === 'split' ? 'bg-gray-100 text-[#F05623] dark:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}>Split Code</button>
        </div>

        <div className="custom-scrollbar overflow-y-auto px-6 pt-2 pb-6">
          <AnimatePresence mode="wait">
            {activeTab === 'merge' ? (
              <motion.form key="merge" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleMergeSubmit}>
                <div className="mb-2 flex items-center gap-2">
                  <h4 className="font-semibold">Codes to Merge</h4>
                  <div className="relative info-popover-container-merge">
                    <button type="button" onClick={() => setShowMergeInfo(!showMergeInfo)} className="mt-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      <FaInfoCircle />
                    </button>
                    <AnimatePresence>
                      {showMergeInfo && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute top-full left-0 z-20 mt-1 w-64 rounded-lg border bg-gray-100 p-3 text-sm text-gray-700 shadow-lg dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                        >
                          Combine two or more existing codes into a single new code. All coded segments will be reassigned.
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="mb-4 space-y-3">
                  {codesToMerge.map((selectedId, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <select
                        value={selectedId}
                        onChange={e => handleMergeSourceChange(index, e.target.value)}
                        className="w-full flex-grow rounded-md border p-2 dark:border-gray-600 dark:bg-gray-700"
                      >
                        <option value="">-- Select a code --</option>
                        {selectedId && !availableMergeOptions.find(opt => opt._id === selectedId) &&
                          <option value={selectedId}>{codeDefinitions.find(cd => cd._id === selectedId)?.name}</option>
                        }
                        {availableMergeOptions.map(cd => <option key={cd._id} value={cd._id}>{cd.name}</option>)}
                      </select>
                      {codesToMerge.length > 2 && (
                        <button type="button" onClick={() => handleRemoveMergeSource(index)} className="p-2 text-red-500 hover:text-red-700" title="Remove">
                          <FaTrashAlt />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={handleAddMergeSource} className="flex items-center gap-2 text-sm text-cyan-900 hover:underline dark:text-[#F05623]">
                  <FaPlus /> Add Another Code
                </button>
                <div className="my-4 border-t border-gray-200 dark:border-gray-600"></div>
                <div>
                  <label className="mb-1 block text-sm font-medium">New Merged Code Name</label>
                  <input type="text" value={newMergeCodeName} onChange={e => setNewMergeCodeName(e.target.value)} className="w-full rounded-md border p-2 dark:border-gray-600 dark:bg-gray-700" required />
                </div>
                <div className="mt-4">
                  <label className="mb-2 block text-sm font-medium">New Code Color</label>
                  <ColorPicker color={newMergeCodeColor} onChange={setNewMergeCodeColor} usedColors={codeDefinitions.map(c => c.color)} />
                </div>
                <div className="mt-4">
                  <div className="h-6">
                    <AnimatePresence>
                      {errorMessage && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-2 text-center text-sm text-red-600 dark:text-red-500">{errorMessage}</motion.p>}
                    </AnimatePresence>
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" className="rounded-md px-4 py-2 text-white bg-cyan-800 hover:bg-cyan-700 dark:bg-[#d34715] dark:hover:bg-[#F05623]">Merge Codes</button>
                  </div>
                </div>
              </motion.form>
            ) : (
              <motion.form key="split" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleSplitSubmit}>
                <div className="mb-4">
                  <div className="mb-1 flex items-center gap-2">
                    <label className="block text-sm font-medium">Code to Split</label>
                    <div className="relative info-popover-container-split">
                      <button type="button" onClick={() => setShowSplitInfo(!showSplitInfo)} className="mt-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <FaInfoCircle />
                      </button>
                      <AnimatePresence>
                        {showSplitInfo && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-0 z-20 mt-1 w-64 rounded-lg border bg-gray-100 p-3 text-sm text-gray-700 shadow-lg dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                          >
                            Break one code into multiple, more specific codes. You will then review each segment to re-categorize it.
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <select value={splitSource} onChange={e => setSplitSource(e.target.value)} className="w-full rounded-md border p-2 dark:border-gray-600 dark:bg-gray-700">
                    {codeDefinitions.map(cd => <option key={cd._id} value={cd._id}>{cd.name}</option>)}
                  </select>
                </div>

                <h4 className="mb-2 mt-4 font-semibold">Define New Codes</h4>
                <div className="space-y-3">
                  {newSplitCodes.map((code, index) => (
                    <div key={index} className="flex items-center gap-2 rounded-md border p-2 dark:border-gray-600">
                      <div className="relative color-popover-container">
                        <button type="button" className="h-8 w-8 rounded-full border-2 border-gray-300 dark:border-gray-600" style={{ backgroundColor: code.color }} onClick={() => setActiveColorPopover(activeColorPopover === index ? null : index)} />
                        <AnimatePresence>
                          {activeColorPopover === index && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="absolute top-full left-0 z-10 mt-2 flex items-center gap-2 rounded-md border bg-white p-2 shadow-lg dark:border-gray-600 dark:bg-gray-700"
                            >
                              {STANDARD_COLORS.map(sc => {
                                const isUsed = usedColorsSet.has(sc.hex);
                                return (
                                  <button
                                    key={sc.hex}
                                    type="button"
                                    disabled={isUsed}
                                    className={`relative h-6 w-6 rounded-full border border-gray-300 dark:border-gray-500 ${isUsed ? 'cursor-not-allowed opacity-40' : ''}`}
                                    style={{ backgroundColor: sc.hex }}
                                    onClick={() => { handleSplitCodeChange(index, 'color', sc.hex); setActiveColorPopover(null); }}
                                    title={isUsed ? `${sc.name} (In Use)` : sc.name}
                                  >
                                    {isUsed && <div className="absolute top-1/2 left-0 h-0.5 w-full transform -rotate-45 bg-gray-700 dark:bg-gray-200" />}
                                  </button>
                                );
                              })}
                              <button type="button" onClick={() => customColorInputRef.current?.click()} className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 bg-gray-100 dark:border-gray-500 dark:bg-gray-600" title="Custom Color">
                                <div className="h-4 w-4 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500" />
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <input type="color" ref={customColorInputRef} value={code.color} onChange={(e) => { handleSplitCodeChange(index, 'color', e.target.value); }} className="pointer-events-none absolute -z-10 opacity-0" />
                      </div>
                      <input type="text" placeholder={`New Code Name ${index + 1}`} value={code.name} onChange={e => handleSplitCodeChange(index, 'name', e.target.value)} className="flex-grow rounded-md border p-2 dark:border-gray-600 dark:bg-gamma-700" />
                      {newSplitCodes.length > 2 && (
                        <button type="button" onClick={() => handleRemoveSplitCode(index)} className="p-2 text-red-500 hover:text-red-700" title="Remove">
                          <FaTrashAlt />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={handleAddNewSplitCode} className="mt-3 flex items-center gap-2 text-sm text-cyan-900 hover:underline dark:text-[#F05623]"><FaPlus /> Add Another Code</button>
                <div className="mt-1">
                  <div className="h-6">
                    <AnimatePresence>
                      {errorMessage && (<motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-2 text-left text-sm text-red-600 dark:text-red-500">{errorMessage}</motion.p>)}
                    </AnimatePresence>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button type="submit" className="rounded-md px-4 py-2 text-white bg-cyan-800 hover:bg-cyan-700 dark:bg-[#d34715] dark:hover:bg-[#F05623]">Start Splitting Review</button>
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default SplitMergeCodesModal;