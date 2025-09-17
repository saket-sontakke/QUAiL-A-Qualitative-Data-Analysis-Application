import React, { useState, useMemo, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import { motion } from 'framer-motion';

/**
 * A modal that guides the user through the process of re-categorizing coded
 * segments after a "split" operation. It presents each segment from the original
 * source code one by one, allowing the user to assign it to one of the newly
 * defined codes or to un-code it entirely. The split is finalized only after
 * the last segment has been reviewed.
 *
 * @param {object} props - The component props.
 * @param {boolean} props.show - Determines if the modal is visible.
 * @param {Function} props.onClose - The callback function to cancel the split process and close the modal.
 * @param {object} props.sourceCode - The original code definition that is being split.
 * @param {Array<object>} props.segmentsToReview - An array of all segments associated with the source code that need re-categorization.
 * @param {Array<object>} props.newCodes - An array containing the new code definitions that segments can be assigned to.
 * @param {Function} props.onCompleteSplit - The callback function executed with the final assignment data once all segments have been reviewed.
 * @returns {JSX.Element|null} The rendered modal component or null if `show` is false.
 */
const SplitReviewModal = ({ show, onClose, sourceCode, segmentsToReview, newCodes, onCompleteSplit }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [assignments, setAssignments] = useState({});

  /**
   * Effect to reset the component's internal state whenever the modal is
   * displayed, ensuring a fresh review session each time.
   */
  useEffect(() => {
    if (show) {
      setCurrentIndex(0);
      setAssignments({});
    }
  }, [show]);

  const currentSegment = useMemo(() => segmentsToReview[currentIndex], [segmentsToReview, currentIndex]);

  if (!show) return null;

  /**
   * Handles the assignment of the current segment to a new code. It updates
   * the assignment state and advances to the next segment. If the current
   * segment is the last one, it finalizes the process by calling `onCompleteSplit`.
   * @param {string|null} newCodeName - The name of the new code to assign, or null to un-code the segment.
   */
  const handleAssign = (newCodeName) => {
    const newAssignments = { ...assignments, [currentSegment._id]: newCodeName };
    setAssignments(newAssignments);

    if (currentIndex >= segmentsToReview.length - 1) {
      onCompleteSplit(newAssignments);
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex w-full max-w-2xl max-h-[90vh] flex-col rounded-lg bg-white shadow-2xl dark:bg-gray-800"
      >
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <h2 className="text-xl font-bold text-cyan-900 dark:text-[#F05623]">
            Splitting Code: "{sourceCode?.name}"
          </h2>
          <button onClick={onClose} className="rounded-full p-2 text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700">
            <FaTimes />
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden p-6">
          <div className="mb-4 flex items-baseline justify-between">
            <h4 className="font-semibold">Reviewing Segment {currentIndex + 1} of {segmentsToReview.length}</h4>
            <div className="h-2.5 w-1/2 rounded-full bg-gray-200 dark:bg-gray-700">
              <div className="h-2.5 rounded-full bg-[#F05623]" style={{ width: `${((currentIndex + 1) / segmentsToReview.length) * 100}%` }}></div>
            </div>
          </div>

          <div className="custom-scrollbar mb-4 flex-1 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
            <p className="whitespace-pre-wrap leading-relaxed text-gray-700 dark:text-gray-300">
              "{currentSegment?.text}"
            </p>
          </div>

          <div>
            <p className="mb-3 text-center text-sm font-medium">Assign this segment to:</p>
            <div className="grid grid-cols-2 gap-3">
              {newCodes.map(code => (
                <button
                  key={code.name}
                  onClick={() => handleAssign(code.name)}
                  className="transform rounded-md p-3 font-semibold text-white transition-transform hover:scale-105"
                  style={{ backgroundColor: code.color }}
                >
                  {code.name}
                </button>
              ))}
              <button
                onClick={() => handleAssign(null)}
                className="col-span-2 transform rounded-md bg-gray-200 p-3 font-semibold text-gray-800 transition-transform hover:scale-105 dark:bg-gray-500 dark:text-white"
              >
                Un-code Segment
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-start border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="rounded-md border px-4 py-2 dark:border-gray-600 disabled:opacity-50"
          >
            Previous
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default SplitReviewModal;