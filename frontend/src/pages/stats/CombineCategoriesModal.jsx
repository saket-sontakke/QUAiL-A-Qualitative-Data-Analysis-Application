import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaTrash, FaTimes } from 'react-icons/fa';

/**
 * A modal that allows users to combine multiple categories (e.g., codes) into
 * larger groups. This is typically used to resolve statistical assumption
 * violations, such as low expected frequencies in a Chi-Square test.
 *
 * @param {object} props - The component props.
 * @param {boolean} props.show - Controls the visibility of the modal.
 * @param {() => void} props.onClose - The callback function to close the modal.
 * @param {object} props.details - An object containing the original category data from the validation step.
 * @param {(groups: Array<object>) => void} props.onApply - The callback function executed with the newly defined groups to trigger re-validation.
 * @returns {JSX.Element|null} The rendered modal component or null if not shown.
 */
const CombineCategoriesModal = ({ show, onClose, details, onApply }) => {
  const originalCodes = details.originalRowLabels.map((label, i) => ({
    id: details.originalCodeIds[i],
    name: label
  }));

  const [groups, setGroups] = useState([]);
  const [availableCodes, setAvailableCodes] = useState(originalCodes);
  const [groupName, setGroupName] = useState("");
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupNameError, setGroupNameError] = useState(null);

  /**
   * Effect to reset the modal's internal state whenever it is opened.
   */
  useEffect(() => {
    if (show) {
      setGroups([]);
      setAvailableCodes(originalCodes);
      setGroupName("");
      setSelectedCodes([]);
      setShowCreateGroup(false);
      setGroupNameError(null);
    }
  }, [show, details]);

  /**
   * Effect for real-time validation to ensure new group names are unique.
   */
  useEffect(() => {
    if (groupName.trim() && groups.some(g => g.newName.trim().toLowerCase() === groupName.trim().toLowerCase())) {
      setGroupNameError("This group name is already in use.");
    } else {
      setGroupNameError(null);
    }
  }, [groupName, groups]);

  const handleCreateGroup = () => {
    if (!groupName || selectedCodes.length < 2 || groupNameError) return;

    const newGroup = {
      newName: groupName.trim(),
      originalCodeIds: selectedCodes,
      originalNames: selectedCodes.map(id => originalCodes.find(c => c.id === id)?.name)
    };
    setGroups(prev => [...prev, newGroup]);
    setAvailableCodes(prev => prev.filter(code => !selectedCodes.includes(code.id)));
    setGroupName("");
    setSelectedCodes([]);
    setShowCreateGroup(false);
    setGroupNameError(null);
  };

  const handleDeleteGroup = (groupNameToDelete) => {
    const groupToDelete = groups.find(g => g.newName === groupNameToDelete);
    if (!groupToDelete) return;

    const codesToRestore = originalCodes.filter(c => groupToDelete.originalCodeIds.includes(c.id));
    setAvailableCodes(prev => [...prev, ...codesToRestore].sort((a, b) => a.name.localeCompare(b.name)));
    setGroups(prev => prev.filter(g => g.newName !== groupNameToDelete));
  };

  const handleApplyAndRevalidate = () => {
    onApply(groups);
    onClose();
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="flex w-full max-w-2xl flex-col rounded-lg border bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b p-4 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Combine Categories</h3>
              <button onClick={onClose} className="text-gray-500 transition-colors hover:text-gray-800 dark:hover:text-white">
                <FaTimes size={20} />
              </button>
            </div>

            <div className="max-h-[60vh] space-y-4 overflow-y-auto p-6">
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                The test assumptions are not met. Group categories together to increase expected frequencies, then re-validate your data.
              </p>

              {groups.length > 0 && (
                <div className="space-y-2">
                  {groups.map(group => (
                    <div key={group.newName} className="flex items-center justify-between rounded-md border bg-gray-100 p-2 dark:border-gray-700 dark:bg-gray-900/50">
                      <div>
                        <span className="text-sm font-bold">{group.newName}</span>
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({group.originalNames.join(', ')})</span>
                      </div>
                      <button onClick={() => handleDeleteGroup(group.newName)} className="p-1 text-red-500 hover:text-red-700"><FaTrash /></button>
                    </div>
                  ))}
                </div>
              )}

              {showCreateGroup ? (
                <div className="space-y-3 rounded-lg border bg-white p-3 dark:border-gray-700 dark:bg-gray-800/50">
                  <div>
                    <input
                      type="text"
                      value={groupName}
                      onChange={e => setGroupName(e.target.value)}
                      placeholder="New Group Name"
                      className={`w-full rounded border p-2 dark:bg-gray-900 ${groupNameError ? 'border-red-500' : 'dark:border-gray-500'}`}
                    />
                    {groupNameError && <p className="mt-1 text-xs text-red-600">{groupNameError}</p>}
                  </div>
                  <div className="max-h-32 space-y-1 overflow-y-auto rounded border bg-gray-50 p-2 custom-scrollbar dark:border-gray-600 dark:bg-gray-900/50">
                    {availableCodes.map(code => (
                      <label key={code.id} className="flex cursor-pointer items-center gap-2 rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <input type="checkbox" value={code.id} checked={selectedCodes.includes(code.id)} onChange={e => {
                          if (e.target.checked) setSelectedCodes(prev => [...prev, code.id]);
                          else setSelectedCodes(prev => prev.filter(id => id !== code.id));
                        }} />
                        <span className="text-sm">{code.name}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowCreateGroup(false)} className="rounded bg-gray-200 px-3 py-1 text-xs dark:bg-gray-600">Cancel</button>
                    <button onClick={handleCreateGroup} disabled={!groupName || selectedCodes.length < 2 || !!groupNameError} className="rounded bg-cyan-800 px-3 py-1 text-xs text-white hover:bg-cyan-700 disabled:opacity-50 dark:bg-orange-700 dark:hover:bg-orange-600">Create</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowCreateGroup(true)} disabled={availableCodes.length < 2} className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed py-2 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700/50">
                  <FaPlus /> Create New Group
                </button>
              )}
            </div>

            <div className="flex justify-end gap-4 border-t bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
              <button onClick={onClose} className="rounded-md bg-gray-300 px-6 py-2 font-semibold text-gray-800 transition-colors hover:bg-gray-400 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
                Cancel
              </button>
              <button onClick={handleApplyAndRevalidate} disabled={groups.length === 0} className="rounded-md bg-cyan-900 px-6 py-2 font-bold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:hover:bg-gray-400 dark:bg-orange-700 dark:hover:bg-orange-600">
                Apply & Re-Validate
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CombineCategoriesModal;