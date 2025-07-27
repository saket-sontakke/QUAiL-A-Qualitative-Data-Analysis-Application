import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes } from "react-icons/fa";
import { CgExport, CgImport } from "react-icons/cg";
import * as htmlToImage from "html-to-image";
import Visualization from "./Visualization.jsx";
import { useTheme } from "../theme/ThemeContext.jsx";

// --- Helper Functions ---

/**
 * @function sanitizeColor
 * @description A helper function to fall back to a default color if the input is an unsupported format like 'oklch'.
 * @param {string} colorString - The color string to sanitize.
 * @returns {string} The original color or a fallback hex color.
 */
const sanitizeColor = (colorString) => {
    if (typeof colorString === "string" && colorString.startsWith("oklch(")) {
        return "#808080"; // Fallback color
    }
    return colorString;
};

/**
 * @function hexToRgba
 * @description Converts a hex color string to an RGBA string with a given alpha value.
 * @param {string} hex - The hex color code (e.g., '#RRGGBB' or '#RGB').
 * @param {number} alpha - The alpha transparency value (0 to 1).
 * @returns {string} The resulting RGBA color string.
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
 * @component CodedSegmentsTableModal
 * @description A modal that displays coded segments in both a filterable table and various chart visualizations.
 * It allows exporting the table to Excel and downloading charts as PNG images.
 */
const CodedSegmentsTableModal = ({
    show,
    onClose,
    codedSegments,
    codeDefinitions,
    projectName,
    handleExportToExcel,
}) => {
    // --- State and Refs ---
    const { theme } = useTheme();
    const isDarkMode = theme === "dark";

    const [activeTab, setActiveTab] = useState("table");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedChart, setSelectedChart] = useState("bar");
    const [showQualityPopup, setShowQualityPopup] = useState(false);
    const [isChartAnimating, setIsChartAnimating] = useState(false);

    const chartContainerRef = useRef(null);
    const dropdownRef = useRef(null);

    // --- Effects ---

    /**
     * @effect
     * @description Adds a mousedown event listener to handle clicks outside the download quality dropdown.
     */
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowQualityPopup(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- Memoized Data Processing ---

    /**
     * @memo filteredSegments
     * @description Filters the coded segments based on the search term.
     */
    const filteredSegments = useMemo(() => {
        if (!searchTerm.trim()) return codedSegments;
        const term = searchTerm.toLowerCase();
        return codedSegments.filter((seg) => {
            const textMatch = seg.text.toLowerCase().includes(term);
            const nameMatch = seg.codeDefinition?.name?.toLowerCase().includes(term);
            return textMatch || nameMatch;
        });
    }, [searchTerm, codedSegments]);

    /**
     * @memo groupedData
     * @description Groups the filtered segments by their code definition for table display.
     */
    const groupedData = useMemo(() => {
        const groups = {};
        filteredSegments.forEach((segment) => {
            const def = segment.codeDefinition || { _id: "uncategorized", name: "N/A", description: "", color: "#808080" };
            const key = def._id;
            if (!groups[key]) groups[key] = { definition: def, segments: [] };
            groups[key].segments.push(segment);
        });
        return Object.values(groups);
    }, [filteredSegments]);

    /**
     * @memo chartData
     * @description Processes filtered segments into a format suitable for charting, calculating frequencies for each code.
     */
    const chartData = useMemo(() => {
        const frequencies = {};
        filteredSegments.forEach((segment) => {
            const codeName = segment.codeDefinition?.name || "N/A";
            frequencies[codeName] = (frequencies[codeName] || 0) + 1;
        });
        return Object.keys(frequencies)
            .map((name) => {
                const correspondingDef = codeDefinitions.find((def) => def.name === name);
                return {
                    name,
                    count: frequencies[name],
                    fill: correspondingDef?.color || "#CCCCCC",
                };
            })
            .sort((a, b) => b.count - a.count);
    }, [filteredSegments, codeDefinitions]);

    const totalFrequency = filteredSegments.length;

    // --- Event Handlers ---

    /**
     * @function handleDownloadChart
     * @description Exports the chart visualization as a PNG image using the html-to-image library.
     * @param {number} pixelRatio - The multiplier for the image resolution.
     */
    const handleDownloadChart = async (pixelRatio) => {
        if (isChartAnimating || !chartContainerRef.current) {
            alert(isChartAnimating ? "Please wait for the chart to finish rendering." : "Chart container not found.");
            return;
        }
        try {
            const dataUrl = await htmlToImage.toPng(chartContainerRef.current, {
                cacheBust: true,
                backgroundColor: isDarkMode ? "#111827" : "#ffffff",
                pixelRatio,
            });
            const link = document.createElement("a");
            link.download = `${projectName || "Export"}_${selectedChart}_chart.png`;
            link.href = dataUrl;
            link.click();
            setShowQualityPopup(false);
        } catch (err) {
            console.error("Error exporting chart:", err);
            alert("Failed to export chart.");
        }
    };
    
    // --- Render Logic ---

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
                >
                    <motion.div
                        initial={{ y: "-100vh", opacity: 0 }}
                        animate={{ y: "0", opacity: 1 }}
                        exit={{ y: "100vh", opacity: 0 }}
                        transition={{ type: "spring", stiffness: 100, damping: 20 }}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Coded Segments Overview</h2>
                            <div className="flex items-center space-x-4">
                                {activeTab === "table" && codedSegments.length > 0 && (
                                    <button onClick={handleExportToExcel} className="bg-[#F05623] hover:bg-opacity-90 text-white font-bold py-2 px-4 rounded-md shadow-sm flex items-center">
                                        <CgExport className="mr-2" size={20} /> Export Table
                                    </button>
                                )}
                                {activeTab === "visualizations" && totalFrequency > 0 && (
                                    <div className="relative" ref={dropdownRef}>
                                        <button onClick={() => setShowQualityPopup((prev) => !prev)} disabled={isChartAnimating} className="bg-[#F05623] hover:bg-opacity-90 text-white font-bold py-2 px-4 rounded-md shadow-sm flex items-center disabled:bg-gray-500 disabled:cursor-not-allowed">
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
                                <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"><FaTimes size={20} /></button>
                            </div>
                        </div>

                        {/* Tab Navigation */}
                        <div className="flex border-b border-gray-200 dark:border-gray-700">
                            <button onClick={() => setActiveTab("table")} className={`py-2 px-4 text-sm font-medium ${activeTab === "table" ? "border-b-2 border-[#F05623] text-[#F05623]" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}>Table View</button>
                            <button onClick={() => setActiveTab("visualizations")} className={`py-2 px-4 text-sm font-medium ${activeTab === "visualizations" ? "border-b-2 border-[#F05623] text-[#F05623]" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}>Visualizations</button>
                        </div>
                        
                        {/* Tab Content */}
                        <div className="flex-1 p-4 overflow-y-auto">
                            {activeTab === 'table' ? (
                                <>
                                    <div className="mb-4">
                                        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search by code or text…" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:border-blue-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />
                                    </div>
                                    {totalFrequency === 0 ? (
                                        <p className="text-gray-700 dark:text-gray-300">No coded segments match your search.</p>
                                    ) : (
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
                                                    {groupedData.map(group =>
                                                        group.segments.map((segment, idx) => {
                                                            const baseBgColor = hexToRgba(sanitizeColor(group.definition.color), 0.10);
                                                            const hoverBgColor = hexToRgba(sanitizeColor(group.definition.color), 0.25);
                                                            return (
                                                                <tr key={segment._id} className="text-gray-800 dark:text-gray-200">
                                                                    {idx === 0 && (
                                                                        <>
                                                                            <td rowSpan={group.segments.length} className="px-4 py-2 border border-gray-300 dark:border-gray-600 align-middle text-center">
                                                                                <span className="px-2 py-1 rounded-full text-xs font-semibold text-gray-700 whitespace-nowrap" style={{ backgroundColor: hexToRgba(sanitizeColor(group.definition.color), 0.8) }}>
                                                                                    {group.definition.name}
                                                                                </span>
                                                                            </td>
                                                                            <td rowSpan={group.segments.length} className="px-4 py-2 border border-gray-300 dark:border-gray-600 align-middle text-center text-sm text-gray-700 dark:text-gray-300" style={{ backgroundColor: baseBgColor }}>
                                                                                {group.definition.description || 'N/A'}
                                                                            </td>
                                                                        </>
                                                                    )}
                                                                    <td className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-left text-sm text-gray-800 dark:text-gray-200 break-words" style={{ backgroundColor: baseBgColor, transition: 'background-color 0.15s ease-in-out' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBgColor} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = baseBgColor}>
                                                                        {`"${segment.text}"`}
                                                                    </td>
                                                                    {idx === 0 && (
                                                                        <td rowSpan={group.segments.length} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-center align-middle text-sm" style={{ backgroundColor: baseBgColor }}>
                                                                            {group.segments.length}
                                                                        </td>
                                                                    )}
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                    <tr className="bg-gray-200 dark:bg-gray-700 font-bold text-[#1D3C87] dark:text-[#F05623]">
                                                        <td colSpan={3} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-right">Total Frequency</td>
                                                        <td className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-center">{totalFrequency}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div style={{ width: '100%', height: 'calc(100% - 40px)' }}>
                                    <Visualization
                                        chartData={chartData}
                                        totalFrequency={totalFrequency}
                                        selectedChart={selectedChart}
                                        setSelectedChart={setSelectedChart}
                                        setIsChartAnimating={setIsChartAnimating}
                                        ref={chartContainerRef}
                                    />
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CodedSegmentsTableModal;
