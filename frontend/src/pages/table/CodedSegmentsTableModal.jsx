import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes, FaArrowLeft } from "react-icons/fa";
import { CgImport } from "react-icons/cg";
import { PiExportBold } from "react-icons/pi";
import { useTheme } from '../theme/ThemeContext.jsx';
import TableView from './TableView.jsx';
import VisualizationsView from './VisualizationsView.jsx';
import StatsView from './StatsView.jsx';
import { useStatsLogic } from './hooks/useStatsLogic.js';
import { useTableData } from "./hooks/useTableData.js";

const CodedSegmentsTableModal = ({
  show,
  onClose,
  codedSegments,
  codeDefinitions,
  projectName,
  handleExportToExcel,
  handleExportOverlaps,
  isProjectOverview = false,
  project,
  projectId,
  baseNameForDownload,
}) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState("table");
  const [tableView, setTableView] = useState(isProjectOverview ? 'overall' : 'byDocument');
  const [showQualityPopup, setShowQualityPopup] = useState(false);
  const [statsResults, setStatsResults] = useState(null);

  const visualizationsViewRef = useRef(null);
  const statsViewRef = useRef(null);
  const dropdownRef = useRef(null);

  const statsLogic = useStatsLogic({ projectId });
  const { view: statsView, handleStatsBack, resetChiSquareState } = statsLogic;
  
  useEffect(() => {
    if (show) {
      setActiveTab("table");
      setTableView(isProjectOverview ? 'overall' : 'byDocument');
      resetChiSquareState();
      setStatsResults(null);
      tableData.setSearchTerm("");
      tableData.setOverlapSearchTerm("");
    }
  }, [show, isProjectOverview]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowQualityPopup(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const tableData = useTableData({ codedSegments, codeDefinitions, project });

  const handleDownloadChart = (pixelRatio) => {
    visualizationsViewRef.current?.downloadChart(pixelRatio);
    setShowQualityPopup(false);
  };

  const handleExportPdf = () => {
    statsViewRef.current?.exportAsPdf();
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case "visualizations":
        return <VisualizationsView
                  ref={visualizationsViewRef}
                  codedSegments={tableData.filteredSegments}
                  codeDefinitions={codeDefinitions}
                  baseNameForDownload={baseNameForDownload}
                  isDarkMode={theme === 'dark'}
                />;
      case "stats":
        return isProjectOverview ?
          <StatsView
            ref={statsViewRef}
            project={project}
            codeDefinitions={codeDefinitions}
            projectId={projectId}
            onResultsChange={setStatsResults}
            {...statsLogic} 
          /> : null;
      case "table":
      default:
        return <TableView
                  {...tableData}
                  tableView={tableView}
                  setTableView={setTableView}
                  project={project}
                  isProjectOverview={isProjectOverview}
                />;
    }
  };

  const isChartAnimating = visualizationsViewRef.current?.getIsChartAnimating() ?? false;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ y: "-100vh", opacity: 0 }}
            animate={{ y: "0", opacity: 1 }}
            exit={{ y: "100vh", opacity: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-7xl h-[95vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 relative">
              {/* --- MODIFICATION 3: Make the back button's visibility conditional and its action simpler. --- */}
              {isProjectOverview && activeTab === 'stats' && statsView !== 'summary' && (
                <button
                  onClick={handleStatsBack}
                  className="absolute left-6 top-1/2 -translate-y-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors"
                  title="Back"
                >
                  <FaArrowLeft size={20} />
                </button>
              )}
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 text-center w-full">
                {isProjectOverview ? 'Project Overview' : 'Coded Segments Overview'}
              </h2>
              <div className="flex items-center space-x-4 absolute right-6 top-1/2 -translate-y-1/2">
                {activeTab === "table" && (tableView === 'overlaps' ? tableData.filteredOverlapsData.length > 0 : tableData.totalFrequency > 0) && (
                  <button
                    onClick={() => tableView === 'overlaps' ? handleExportOverlaps() : handleExportToExcel(tableView)}
                    className="bg-[#D94A1F] hover:bg-[#F05623] text-white font-bold py-2 px-4 rounded-md shadow-sm hover:shadow-md transition-all duration-200 flex items-center"
                  >
                    <PiExportBold className="mr-2" size={20} />
                    {tableView === 'overlaps' ? 'Export Overlaps' : 'Export Table'}
                  </button>
                )}
                {activeTab === "table" && isProjectOverview && (
                  <button
                    onClick={() => handleExportToExcel('matrix')}
                    className="bg-teal-700 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-md shadow-sm hover:shadow-md transition-all duration-200 flex items-center"
                    title="Export a matrix of segments and codes"
                  >
                    <PiExportBold className="mr-2" size={20} />
                    Export Code Matrix
                  </button>
                )}
                {activeTab === "visualizations" && tableData.totalFrequency > 0 && (
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setShowQualityPopup((prev) => !prev)}
                      disabled={isChartAnimating}
                      className="bg-[#D94A1F] hover:bg-[#F05623] text-white font-bold py-2 px-4 rounded-md shadow-sm hover:shadow-md transition-all duration-200 flex items-center disabled:bg-gray-500 disabled:cursor-not-allowed"
                    >
                      <CgImport className="mr-2" size={20} />
                      {isChartAnimating ? "Rendering..." : "Download as PNG"}
                    </button>
                    {showQualityPopup && !isChartAnimating && (
                      <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-300 dark:border-gray-600 z-50">
                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600">Download Quality</div>
                        <button className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => handleDownloadChart(2)}>Normal (x2)</button>
                        <button className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => handleDownloadChart(4)}>High (x4)</button>
                        <button className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => handleDownloadChart(6)}>Very High (x6)</button>
                      </div>
                    )}
                  </div>
                )}
                {activeTab === 'stats' && statsResults && (
                  <button
                    onClick={handleExportPdf}
                    className="bg-[#D94A1F] hover:bg-[#F05623] text-white font-bold py-2 px-4 rounded-md shadow-sm hover:shadow-md transition-all duration-200 flex items-center"
                    title="Export results as a PDF file"
                  >
                    <PiExportBold className="mr-2" size={20} /> Export as PDF
                  </button>
                )}
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                  <FaTimes size={20} />
                </button>
              </div>
            </div>

            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button onClick={() => setActiveTab("table")} className={`py-2 px-4 text-sm font-medium ${activeTab === "table" ? "border-b-2 border-[#F05623] text-[#F05623]" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}>Table View</button>
              <button onClick={() => setActiveTab("visualizations")} className={`py-2 px-4 text-sm font-medium ${activeTab === "visualizations" ? "border-b-2 border-[#F05623] text-[#F05623]" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}>Visualizations</button>
              {isProjectOverview && (<button onClick={() => setActiveTab("stats")} className={`py-2 px-4 text-sm font-medium ${activeTab === "stats" ? "border-b-2 border-[#F05623] text-[#F05623]" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}>Statistical Analysis</button>)}
            </div>

            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
              {renderActiveTab()}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CodedSegmentsTableModal;