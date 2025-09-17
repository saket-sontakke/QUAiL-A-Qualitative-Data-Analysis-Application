import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';
import { GoFile } from "react-icons/go";
import { TfiWorld } from "react-icons/tfi";

/**
 * A modal component to display detailed information about either a Code Definition
 * or a specific Coded Segment. For definitions, it calculates and shows both
 * global (project-wide) and local (current file) frequency counts.
 *
 * @param {object} props - The component props.
 * @param {boolean} props.show - Determines if the modal is visible.
 * @param {Function} props.onClose - The function to call when the modal should be closed.
 * @param {object} [props.codeDefinition=null] - The code definition object to display. Providing this enables the definition view.
 * @param {object} [props.codeSegment=null] - The coded segment object to display.
 * @param {Array<object>} props.allCodedSegments - An array of all coded segments in the project, required for frequency calculations.
 * @param {string|null} props.currentFileId - The ID of the currently viewed file, used for calculating local frequency.
 * @returns {JSX.Element|null} The rendered modal component or null if `show` is false.
 */
const CodeDetailsModal = ({
  show,
  onClose,
  codeDefinition = null,
  codeSegment = null,
  allCodedSegments = [],
  currentFileId = null,
}) => {
  if (!show) {
    return null;
  }

  const isDefinitionView = !!codeDefinition;
  const modalTitle = isDefinitionView ? 'Code Definition Details' : 'Coded Segment Details';
  const name = isDefinitionView ? codeDefinition.name : codeSegment?.codeDefinition?.name;
  const color = isDefinitionView ? codeDefinition.color : codeSegment?.codeDefinition?.color;
  const description = isDefinitionView ? codeDefinition.description : null;

  /**
   * Memoized calculation for global and local frequencies of a code definition.
   * This prevents recalculation on every render unless relevant props change.
   */
  const { globalCount, localCount } = useMemo(() => {
    if (!isDefinitionView || !codeDefinition) {
      return { globalCount: 0, localCount: 0 };
    }

    const globalSegments = allCodedSegments.filter(
      (seg) => seg.codeDefinition?._id === codeDefinition._id
    );

    const localSegments = currentFileId
      ? globalSegments.filter((seg) => seg.fileId === currentFileId)
      : [];

    return {
      globalCount: globalSegments.length,
      localCount: localSegments.length
    };
  }, [isDefinitionView, codeDefinition, allCodedSegments, currentFileId]);


  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 50 }}
            className="relative mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              title="Close"
            >
              <FaTimes size={20} />
            </button>

            <h2 className="mb-4 text-xl font-bold text-cyan-900 dark:text-[#F05623]">{modalTitle}</h2>

            <div className="space-y-3 text-gray-700 dark:text-gray-300">
              <p>
                <strong>Code Name:</strong>{' '}
                <span className="font-semibold" style={{ color: color || '#cccccc' }}>
                  {name || 'N/A'}
                </span>
              </p>

              {isDefinitionView && (
                <>
                  <p>
                    <strong>Description:</strong>{' '}
                    <span className="italic">{description || 'No description provided.'}</span>
                  </p>

                  <div className="mt-4 grid grid-cols-1 gap-4 border-t border-gray-200 pt-4 text-center dark:border-gray-700 sm:grid-cols-2">
                    <div className="rounded-lg bg-gray-100 p-3 dark:bg-gray-700">
                      <div className="mb-1 flex items-center justify-center gap-2 text-gray-600 dark:text-gray-300">
                        <TfiWorld />
                        <h4 className="font-semibold">Global Segments</h4>
                      </div>
                      <p className="text-2xl font-bold text-cyan-900 dark:text-[#F05623]">{globalCount}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">(Across all files)</p>
                    </div>

                    <div className={`rounded-lg p-3 ${currentFileId ? 'bg-gray-100 dark:bg-gray-700' : 'bg-gray-200 opacity-60 dark:bg-gray-800'}`}>
                      <div className="mb-1 flex items-center justify-center gap-2 text-gray-600 dark:text-gray-300">
                        <GoFile />
                        <h4 className="font-semibold">Local Segments</h4>
                      </div>
                      <p className="text-2xl font-bold text-cyan-900 dark:text-[#F05623]">
                        {currentFileId ? localCount : '—'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {currentFileId ? '(In current file)' : '(No file selected)'}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {!isDefinitionView && codeSegment && (
                <>
                  <p>
                    <strong>Segment:</strong>{' '}
                    <span className="italic">"{codeSegment.text || 'No segment text available.'}"</span>
                  </p>
                  <p>
                    <strong>Start Index:</strong> {codeSegment.startIndex ?? 'N/A'}
                  </p>
                  <p>
                    <strong>End Index:</strong> {codeSegment.endIndex ?? 'N/A'}
                  </p>
                  <p>
                    <strong>File Name:</strong> {codeSegment.fileName || 'N/A'}
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CodeDetailsModal;