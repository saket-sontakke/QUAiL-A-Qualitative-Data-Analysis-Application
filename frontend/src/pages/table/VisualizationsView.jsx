import React, { useState, useMemo, useRef, forwardRef, useImperativeHandle, memo } from 'react';
import * as htmlToImage from "html-to-image";
import { useTheme } from '../theme/ThemeContext.jsx';
import ChartRenderer from './ChartRenderer';
import { FaChartBar, FaChartPie, FaCloud } from 'react-icons/fa';
import { TbChartRadar } from "react-icons/tb";
import { BsKanban } from "react-icons/bs";

/**
 * A self-contained component that handles all logic and presentation for the "Visualizations" tab.
 * It prepares the data, manages the selected chart state, renders the chart layout with a
 * selector sidebar, and exposes a handle to trigger downloads from a parent component.
 *
 * @param {object} props - The component props.
 * @param {Array<object>} props.codedSegments - The array of coded segments to visualize.
 * @param {Array<object>} props.codeDefinitions - The array of code definitions for color mapping.
 * @param {string} props.baseNameForDownload - The base name for downloaded files.
 * @param {boolean} props.isDarkMode - Flag indicating if dark mode is active.
 * @param {React.Ref} ref - The ref forwarded from the parent component.
 * @returns {JSX.Element} The rendered visualizations view component.
 */
const VisualizationsView = memo(forwardRef(function VisualizationsView({ codedSegments, codeDefinitions, baseNameForDownload, isDarkMode }, ref) {
  const [selectedChart, setSelectedChart] = useState("bar");
  const [isChartAnimating, setIsChartAnimating] = useState(false);
  const chartContainerRef = useRef(null);

  const chartData = useMemo(() => {
    const frequencies = {};
    codedSegments.forEach((segment) => {
      const codeName = segment.codeDefinition?.name || "N/A";
      frequencies[codeName] = (frequencies[codeName] || 0) + 1;
    });
    return Object.keys(frequencies)
      .map((name) => ({ name, count: frequencies[name], fill: codeDefinitions.find((def) => def.name === name)?.color || "#CCCCCC" }))
      .sort((a, b) => b.count - a.count);
  }, [codedSegments, codeDefinitions]);

  const totalFrequency = codedSegments.length;

  const handleDownloadChart = async (pixelRatio) => {
    if (isChartAnimating || !chartContainerRef.current) {
      alert(isChartAnimating ? "Please wait for the chart to finish rendering." : "Chart container not found.");
      return;
    }
    try {
      const filter = (node) => !node.classList?.contains('no-export');
      const dataUrl = await htmlToImage.toPng(chartContainerRef.current, {
        backgroundColor: isDarkMode ? "#111827" : "#ffffff",
        pixelRatio,
        filter: filter
      });
      const link = document.createElement("a");
      link.download = `${baseNameForDownload || "Export"}_${selectedChart}_chart.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Error exporting chart:", err);
      alert("Failed to export chart.");
    }
  };
  
  useImperativeHandle(ref, () => ({
    downloadChart: (pixelRatio) => {
      handleDownloadChart(pixelRatio);
    },
    getIsChartAnimating: () => isChartAnimating,
  }));

  const chartTypes = [
    { id: 'bar', title: 'Bar Chart', icon: FaChartBar },
    { id: 'pie', title: 'Pie Chart', icon: FaChartPie },
    { id: 'radar', title: 'Radar Chart', icon: TbChartRadar },
    { id: 'wordcloud', title: 'Word Cloud', icon: FaCloud },
    { id: 'treemap', title: 'Treemap', icon: BsKanban }
  ];

  if (totalFrequency === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-center text-gray-500 dark:text-gray-400">
          No data to visualize.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="flex-grow rounded-lg pr-6">
        <ChartRenderer
          ref={chartContainerRef}
          chartData={chartData}
          selectedChart={selectedChart}
          isDarkMode={isDarkMode}
          setIsChartAnimating={setIsChartAnimating}
        />
      </div>
      <div className="custom-scrollbar w-32 flex-col space-y-4 overflow-y-auto">
        {chartTypes.map(chart => {
          const IconComponent = chart.icon;
          const isSelected = selectedChart === chart.id;
          return (
            <button
              key={chart.id}
              onClick={() => setSelectedChart(chart.id)}
              className={`
                w-full flex flex-col items-center rounded-lg p-2 focus:outline-none transition-colors duration-200
                ${isSelected ? 'text-[#F05623]' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}
              `}
            >
              <IconComponent size={24} />
              <span className="mt-1 text-center text-xs">{chart.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}));

export default VisualizationsView;