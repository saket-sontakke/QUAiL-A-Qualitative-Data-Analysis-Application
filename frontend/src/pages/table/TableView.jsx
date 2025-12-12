import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes, FaSortAlphaDown, FaSortAlphaDownAlt, FaSortAmountDown, FaSortAmountDownAlt, FaCheck } from "react-icons/fa";
import { BsListNested } from "react-icons/bs";

/**
 * Sanitizes a color string, returning a default gray color if the input is in oklch format.
 * @param {string} colorString - The color string to sanitize.
 * @returns {string} The original color string or a fallback hex color.
 */
const sanitizeColor = (colorString) => {
  if (typeof colorString === "string" && colorString.startsWith("oklch(")) {
    return "#808080";
  }
  return colorString;
};

/**
 * Converts a HEX color value to an RGBA string.
 * @param {string} hex - The hex color code.
 * @param {number} alpha - The alpha transparency value (0 to 1).
 * @returns {string} The RGBA color string.
 */
const hexToRgba = (hex, alpha) => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }
  const clampedAlpha = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${clampedAlpha})`;
};


/**
 * Renders the appropriate sort icon based on the current sort configuration.
 * @param {object} props - The component props.
 * @param {object} props.sortConfig - The current sort configuration.
 * @returns {JSX.Element} The rendered sort icon.
 */
const RenderSortIcon = ({ sortConfig }) => {
  const { key, direction } = sortConfig;
  if (key === 'name' && direction === 'ascending') return <FaSortAlphaDown className="text-gray-600 dark:text-gray-300" size={20} />;
  if (key === 'name' && direction === 'descending') return <FaSortAlphaDownAlt className="text-gray-600 dark:text-gray-300" size={20} />;
  if (key === 'frequency' && direction === 'descending') return <FaSortAmountDown className="text-gray-600 dark:text-gray-300" size={20} />;
  if (key === 'frequency' && direction === 'ascending') return <FaSortAmountDownAlt className="text-gray-600 dark:text-gray-300" size={20} />;
  return <BsListNested className="text-gray-600 dark:text-gray-300" size={20} />;
};

/**
 * A component that renders the "Table View" tab content. It is a presentational component
 * that receives all data and state management functions as props.
 */
const TableView = ({ 
  tableView, setTableView, project, isProjectOverview,
  searchTerm, setSearchTerm, sortConfig, setSortConfig,
  overlapSearchTerm, setOverlapSearchTerm, totalFrequency,
  overallGroupedData, detailedDataByDocument,
  filteredOverlapsData, overlapStats
}) => {
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const sortMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target)) {
        setIsSortMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSortChange = (key, direction) => {
    setSortConfig({ key, direction });
    setIsSortMenuOpen(false);
  };

  return (
    <>
      <div className={`sticky top-[-18px] z-10 bg-white dark:bg-gray-800 py-4 flex justify-between items-center gap-4 border-b border-gray-200 dark:border-gray-700`}>
        {tableView === 'overlaps' ? (
            <div className="relative w-full">
                <input
                    type="text"
                    value={overlapSearchTerm}
                    onChange={e => setOverlapSearchTerm(e.target.value)}
                    placeholder="Search in overlaps by text or code..."
                    className="w-full px-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:border-cyan-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                />
                {overlapSearchTerm && (
                    <button
                        onClick={() => setOverlapSearchTerm('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                        title="Clear search"
                    >
                        <FaTimes />
                    </button>
                )}
            </div>
        ) : (
          <div className="grow flex items-center gap-4">
            <div className="relative grow">
            <input 
              type="text" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              placeholder="Search by code or text…" 
              className="w-full px-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-900 dark:focus:ring-[#F05623] dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" 
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                title="Clear search"
              >
                <FaTimes />
              </button>
            )}
          </div>
            <div className="relative" ref={sortMenuRef}>
              <button onClick={() => setIsSortMenuOpen(!isSortMenuOpen)} className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Sort Codes">
                <RenderSortIcon sortConfig={sortConfig} />
              </button>
              <AnimatePresence>
                {isSortMenuOpen && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 z-50">
                    <div className="p-2 text-xs text-gray-700 dark:text-gray-300">
                      <button onClick={() => handleSortChange('default', 'ascending')} className="w-full text-left px-3 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                        <span className="w-4">{sortConfig.key === 'default' && <FaCheck />}</span>
                        <span>Order of Appearance</span>
                      </button>
                      <hr className="my-1 border-gray-200 dark:border-gray-600" />
                      <button onClick={() => handleSortChange('name', 'ascending')} className="w-full text-left px-3 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                        <span className="w-4">{sortConfig.key === 'name' && sortConfig.direction === 'ascending' && <FaCheck />}</span>
                        <span>Name (A-Z)</span>
                      </button>
                      <button onClick={() => handleSortChange('name', 'descending')} className="w-full text-left px-3 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                        <span className="w-4">{sortConfig.key === 'name' && sortConfig.direction === 'descending' && <FaCheck />}</span>
                        <span>Name (Z-A)</span>
                      </button>
                      <hr className="my-1 border-gray-200 dark:border-gray-600" />
                      <button onClick={() => handleSortChange('frequency', 'descending')} className="w-full text-left px-3 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                        <span className="w-4">{sortConfig.key === 'frequency' && sortConfig.direction === 'descending' && <FaCheck />}</span>
                        <span>Frequency (High-Low)</span>
                      </button>
                      <button onClick={() => handleSortChange('frequency', 'ascending')} className="w-full text-left px-3 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                        <span className="w-4">{sortConfig.key === 'frequency' && sortConfig.direction === 'ascending' && <FaCheck />}</span>
                        <span>Frequency (Low-High)</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
        {isProjectOverview && (
          <div className="flex items-center gap-1 rounded-md bg-gray-200 dark:bg-gray-700 p-1 text-xs font-medium shrink-0">
            <button onClick={() => setTableView('overall')} className={`px-3 py-1.5 rounded-md transition-colors ${tableView === 'overall' ? 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-300/50 dark:hover:bg-white/10'}`}>
              Overall
            </button>
            <button onClick={() => setTableView('byDocument')} className={`px-3 py-1.5 rounded-md transition-colors ${tableView === 'byDocument' ? 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-300/50 dark:hover:bg-white/10'}`}>
              By Document
            </button>
            <button onClick={() => setTableView('overlaps')} className={`px-3 py-1.5 rounded-md transition-colors ${tableView === 'overlaps' ? 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-300/50 dark:hover:bg-white/10'}`}>
              Overlaps
            </button>
          </div>
        )}
      </div>
      <div className="pt-4">
        {tableView === 'overlaps' && (
          <div className="mb-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-700/50 dark:border-gray-600">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Overlap Insights</h3>
            {filteredOverlapsData.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-md shadow-sm">
                    <div className="text-2xl font-bold text-cyan-800 dark:text-orange-500">{overlapStats.totalRegions}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Total Overlap Regions</div>
                  </div>
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-md shadow-sm">
                    <div className="text-2xl font-bold text-cyan-800 dark:text-orange-500">
                      {overlapStats.docsWithOverlaps}
                      <span className="text-sm font-normal text-gray-400 dark:text-gray-500"> / {project.importedFiles.length} Docs</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Documents with Overlaps</div>
                  </div>
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-md shadow-sm">
                    {overlapStats.mostFrequentPair ? (
                      <>
                        <div className="flex justify-center items-center gap-1.5 flex-wrap">
                          {overlapStats.mostFrequentPair.codes.map(c => (
                            <span key={c._id} className="px-2 py-0.5 text-xs font-semibold text-white rounded-full shadow-sm" style={{ backgroundColor: sanitizeColor(c.color) }}>
                              {c.name}
                            </span>
                          ))}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                          Most Frequent Pair ({overlapStats.mostFrequentPair.count} times)
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-2xl font-bold text-cyan-800 dark:text-orange-500">N/A</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Most Frequent Pair</div>
                      </>
                    )}
                  </div>
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-md shadow-sm">
                    <div className="text-2xl font-bold text-cyan-800 dark:text-orange-500">{overlapStats.maxCodesInOverlap}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Most Complex Overlap</div>
                  </div>
                </div>
            ) : (
              <p className="text-sm text-center text-gray-500 dark:text-gray-400">No overlap data to analyze.</p>
            )}
          </div>
        )}
        {tableView !== 'overlaps' && totalFrequency === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 p-8">No coded segments match your search criteria.</p>
        ) : (
          tableView === 'overall' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
                <thead>
                  <tr>
                    {['Code Definition', 'Code Description', 'Coded Segment Text', 'Frequency'].map((h, i) => (
                      <th key={i} className="px-4 py-3 border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {overallGroupedData.map(group => group.segments.map((segment, idx) => {
                    const baseBgColor = hexToRgba(sanitizeColor(group.definition.color), 0.10);
                    const hoverBgColor = hexToRgba(sanitizeColor(group.definition.color), 0.25);
                    return (
                      <tr key={segment._id} className="text-gray-800 dark:text-gray-200">
                        {idx === 0 && (
                          <>
                            <td rowSpan={group.segments.length} className="px-4 py-2 border border-gray-300 dark:border-gray-600 align-middle text-center">
                              <span className="px-2 py-1 rounded-full text-xs font-semibold text-gray-700 dark:text-white whitespace-nowrap" style={{ backgroundColor: hexToRgba(sanitizeColor(group.definition.color), 0.8) }}>
                                {group.definition.name}
                              </span>
                            </td>
                            <td rowSpan={group.segments.length} className="px-4 py-2 border border-gray-300 dark:border-gray-600 align-middle text-center text-sm text-gray-700 dark:text-gray-300" style={{ backgroundColor: baseBgColor }}>
                              {group.definition.description || 'N/A'}
                            </td>
                          </>
                        )}
                        <td
                          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-left text-sm text-gray-800 dark:text-gray-200 wrap-break-word"
                          style={{ backgroundColor: baseBgColor, transition: 'background-color 0.15s ease-in-out' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBgColor}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = baseBgColor}
                        >
                          {`"${segment.text}"`}
                        </td>
                        {idx === 0 && (
                          <td rowSpan={group.segments.length} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-center align-middle text-sm" style={{ backgroundColor: baseBgColor }}>
                            {group.segments.length}
                          </td>
                        )}
                      </tr>
                    );
                  }))}
                  <tr className="bg-gray-200 dark:bg-gray-700 font-bold text-cyan-900 dark:text-[#F05623]">
                    <td colSpan={3} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-right">Total Frequency</td>
                    <td className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-center">{totalFrequency}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : tableView === 'byDocument' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
                <thead>
                  <tr>
                    {['File Name', 'Code Definition', 'Code Description', 'Coded Segment Text', 'Frequency'].map((h) => (
                      <th key={h} className="px-4 py-3 border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detailedDataByDocument.flatMap(docGroup =>
                    docGroup.codes.flatMap((codeGroup, codeIndex) =>
                      codeGroup.segments.map((segment, segmentIndex) => {
                        const isFirstSegmentOfCode = segmentIndex === 0;
                        const isFirstCodeOfDoc = codeIndex === 0;
                        const isFirstSegmentOfDoc = isFirstSegmentOfCode && isFirstCodeOfDoc;
                        const baseBgColor = hexToRgba(sanitizeColor(codeGroup.definition.color), 0.10);
                        const hoverBgColor = hexToRgba(sanitizeColor(codeGroup.definition.color), 0.25);
                        return (
                          <tr key={segment._id} className="text-gray-800 dark:text-gray-200">
                            {isFirstSegmentOfDoc && (
                              <td rowSpan={docGroup.totalSegmentsInDoc} className="px-4 py-2 border border-gray-300 dark:border-gray-600 align-middle text-center text-sm wrap-break-word">
                                {docGroup.document.name}
                              </td>
                            )}
                            {isFirstSegmentOfCode && (
                              <>
                                <td rowSpan={codeGroup.segments.length} className="px-4 py-2 border border-gray-300 dark:border-gray-600 align-middle text-center">
                                  <span className="px-2 py-1 rounded-full text-xs font-semibold text-gray-700 dark:text-white whitespace-nowrap" style={{ backgroundColor: hexToRgba(sanitizeColor(codeGroup.definition.color), 0.8) }}>
                                    {codeGroup.definition.name}
                                  </span>
                                </td>
                                <td rowSpan={codeGroup.segments.length} className="px-4 py-2 border border-gray-300 dark:border-gray-600 align-middle text-center text-sm" style={{ backgroundColor: baseBgColor }}>
                                  {codeGroup.definition.description || 'N/A'}
                                </td>
                              </>
                            )}
                            <td
                              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-left text-sm text-gray-800 dark:text-gray-200 wrap-break-word"
                              style={{ backgroundColor: baseBgColor, transition: 'background-color 0.15s ease-in-out' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBgColor}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = baseBgColor}
                            >
                              {`"${segment.text}"`}
                            </td>
                            {isFirstSegmentOfCode && (
                              <td rowSpan={codeGroup.segments.length} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-center align-middle text-sm" style={{ backgroundColor: baseBgColor }}>
                                {codeGroup.segments.length}
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )
                  )}
                  <tr className="bg-gray-200 dark:bg-gray-700 font-bold text-cyan-900 dark:text-[#F05623]">
                    <td colSpan={4} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-right">Total Frequency</td>
                    <td className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-center">{totalFrequency}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
                {filteredOverlapsData.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 p-8">
                      {overlapSearchTerm ? "No matching overlaps found." : "No overlapping codes found in the project."}
                    </p>
                ) : (
                <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
                    <thead>
                    <tr>
                        {['File Name', 'Overlapping Text', 'Applied Codes', 'Code Count'].map((h) => (
                        <th key={h} className="px-4 py-3 border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">{h}</th>
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                    {filteredOverlapsData.flatMap(fileGroup =>
                        fileGroup.overlaps.map((overlap, overlapIndex) => (
                        <tr key={`${fileGroup.document._id}-${overlap.start}`} className="text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            {overlapIndex === 0 && (
                            <td rowSpan={fileGroup.overlaps.length} className="px-4 py-2 border border-gray-300 dark:border-gray-600 align-middle text-center text-sm wrap-break-word font-medium">
                                {fileGroup.document.name}
                            </td>
                            )}
                            <td className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-left text-sm text-gray-800 dark:text-gray-200 wrap-break-word italic">
                            {`"${overlap.text}"`}
                            </td>
                            <td className="px-4 py-2 border border-gray-300 dark:border-gray-600 align-middle text-center">
                            <div className="flex flex-wrap items-center justify-center gap-2">
                                {overlap.codes.map(code => (
                                <span key={code._id} className="px-2.5 py-1 rounded-full text-xs font-semibold text-white whitespace-nowrap shadow-sm" style={{ backgroundColor: sanitizeColor(code.color) }}>
                                    {code.name}
                                </span>
                                ))}
                            </div>
                            </td>
                            <td className="px-4 py-2 border border-gray-300 dark:border-gray-600 align-middle text-center">
                                <span className="font-mono text-lg text-gray-600 dark:text-white">
                                    {overlap.codes.length}
                                </span>
                            </td>
                        </tr>
                        ))
                    )}
                    </tbody>
                </table>
                )}
            </div>
          )
        )}
      </div>
    </>
  );
};

export default TableView;
