import React, { useRef, forwardRef, useImperativeHandle, useEffect, useMemo, useState } from 'react';
import { motion } from "framer-motion";
import { FaTable, FaChartBar, FaThList, FaExclamationTriangle, FaFileAlt, FaTags, FaQuoteLeft, FaArrowRight, FaBalanceScale, FaChartPie, FaPuzzlePiece, FaLayerGroup, FaUsers } from 'react-icons/fa';
import ChiSquareTypeSelector from '../stats/chi-squared/ChiSquareTypeSelector.jsx';
import ChiSquareControlPanel from '../stats/chi-squared/ChiSquareControlPanel.jsx';
import StatsResultsPanel from '../stats/StatsResultsPanel.jsx';
import { useStatsLogic } from './hooks/useStatsLogic.js';

const ProjectStatsSummary = ({ stats, onProceed }) => {
    const summaryMetrics = [
        { icon: <FaFileAlt />, label: "Total Documents", value: stats.numDocuments },
        { icon: <FaTags />, label: "Total Codes", value: stats.numCodes },
        { icon: <FaQuoteLeft />, label: "Total Coded Segments", value: stats.numSegments },
        { icon: <FaPuzzlePiece />, label: "Avg. Segments per Document", value: stats.avgSegmentsPerDoc },
        { icon: <FaBalanceScale />, label: "Avg. Segments per Code", value: stats.avgSegmentsPerCode },
        {
            icon: <FaChartPie />,
            label: "Most Used Code",
            value: stats.mostUsedCode?.name || 'N/A',
            subValue: stats.mostUsedCode ? `(${stats.mostUsedCode.frequency} times)` : ''
        }
    ];

    const ChiSquareInfoCard = ({ title, icon, children }) => (
        <div className="bg-white dark:bg-gray-800/50 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center mb-3">
                {icon}
                <span className="ml-2">{title}</span>
            </h4>
            {children}
        </div>
    );

    return (
        <div className="p-4 motion-safe:animate-[fadeIn_0.5s_ease-in-out]">
            <div className="flex justify-between items-start mb-5">
                <div>
                    <h2 className="text-3xl -mt-6 font-bold text-gray-800 dark:text-gray-100">Project Data Summary</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-3xl">
                        Here is a high-level overview of your project's data. Review these statistics to help inform your choice of statistical analysis.
                    </p>
                </div>
                <button
                    onClick={onProceed}
                    className="bg-[#D94A1F] hover:bg-[#F05623] text-white font-bold py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 flex items-center text-base flex-shrink-0"
                >
                    Proceed to Test Selection <FaArrowRight className="ml-3" />
                </button>
            </div>
            <div className="bg-white dark:bg-gray-800/50 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 mb-4">
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {summaryMetrics.map((metric, index) => (
                         <div key={index} className="flex items-center justify-between py-3 px-2">
                            <div className="flex items-center">
                                <span className="text-lg text-cyan-800 dark:text-orange-500 w-6 text-center">{metric.icon}</span>
                                <span className="ml-4 text-sm font-medium text-gray-600 dark:text-gray-300">{metric.label}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-base font-semibold text-gray-800 dark:text-gray-100">{metric.value}</span>
                                {metric.subValue && <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">{metric.subValue}</span>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800/50 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 mb-12">
                <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Code Frequencies</h3>
                <div className="overflow-y-auto max-h-80 custom-scrollbar pr-2">
                    {stats.codeStats.length > 0 ? (
                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300 sticky top-0">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Code Name</th>
                                    <th scope="col" className="px-6 py-3 text-center">Total Segments Coded</th>
                                    <th scope="col" className="px-6 py-3 text-center">% of Total Segments</th>
                                    <th scope="col" className="px-6 py-3 text-center">Present in # Documents</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.codeStats.map(code => (
                                    <tr key={code._id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white flex items-center">
                                            <span className="w-4 h-4 rounded-full mr-3 flex-shrink-0" style={{ backgroundColor: code.color }}></span>
                                            {code.name}
                                        </td>
                                        <td className="px-6 py-4 text-center">{code.frequency}</td>
                                        <td className="px-6 py-4 text-center">{code.percentage}%</td>
                                        <td className="px-6 py-4 text-center">{code.docCount}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-4">No codes have been defined or used in this project yet.</p>
                    )}
                </div>
            </div>
            <div className="space-y-8">
                <div>
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Understanding Chi-Square Tests With Your Data</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <ChiSquareInfoCard title="Chi-Square Goodness-of-Fit" icon={<FaChartPie className="text-cyan-800 dark:text-orange-500" />}>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4"><strong>What it does:</strong> Checks if the frequency distribution of a single categorical variable in your sample matches a specific, expected distribution.</p>
                        <div className="text-sm bg-gray-100 dark:bg-gray-900/50 p-3 rounded-md">
                            <p className="font-semibold text-gray-700 dark:text-gray-200">Example with your data:</p>
                            <p className="italic text-gray-500 dark:text-gray-400 mt-1">"Based on my <b>{stats.numSegments}</b> coded segments, is there a significant difference in how often each code is used?"</p>
                        </div>
                    </ChiSquareInfoCard>
                    <ChiSquareInfoCard title="Chi-Square Test for Independence" icon={<FaUsers className="text-cyan-800 dark:text-orange-500" />}>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4"><strong>What it does:</strong> Determines if there's a significant association between two categorical variables within a single population.</p>
                        <div className="text-sm bg-gray-100 dark:bg-gray-900/50 p-3 rounded-md">
                            <p className="font-semibold text-gray-700 dark:text-gray-200">Example with your data:</p>
                            <p className="italic text-gray-500 dark:text-gray-400 mt-1">"Are instructors more likely to mention '<b>{stats.mostUsedCode?.name || '[Top Code]'}</b>' and students more likely to mention '<b>{stats.codeStats[1]?.name || '[Another Code]'}</b>'?"</p>
                        </div>
                    </ChiSquareInfoCard>
                    <ChiSquareInfoCard title="Chi-Square Test for Homogeneity" icon={<FaLayerGroup className="text-cyan-800 dark:text-orange-500" />}>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4"><strong>What it does:</strong> Compares the distribution of a single categorical variable across two or more different populations or groups.</p>
                        <div className="text-sm bg-gray-100 dark:bg-gray-900/50 p-3 rounded-md">
                            <p className="font-semibold text-gray-700 dark:text-gray-200">Example with your data:</p>
                            <p className="italic text-gray-500 dark:text-gray-400 mt-1">"Does the usage of the code '<b>{stats.mostUsedCode?.name || '[Top Code]'}</b>' differ significantly between two participant groups (e.g., Campus A vs. Campus B)?"</p>
                        </div>
                    </ChiSquareInfoCard>
                </div>
            </div>
        </div>
    );
};

const TestSelectionCard = ({ icon, title, description, onClick, disabled = false }) => {
  const baseClasses = "flex flex-col items-center justify-center p-8 text-center bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 transition-all duration-300 relative";
  const interactiveClasses = "transform hover:scale-105 hover:border-cyan-800 dark:hover:border-orange-500 hover:bg-white dark:hover:bg-gray-700 cursor-pointer shadow-sm hover:shadow-xl";
  const disabledClasses = "opacity-60 cursor-not-allowed";
  return (
    <button onClick={onClick} disabled={disabled} className={`${baseClasses} ${disabled ? disabledClasses : interactiveClasses}`} title={disabled ? "Coming Soon" : title}>
      {disabled && <span className="absolute top-2 right-2 bg-gray-400 text-white text-xs font-bold px-2 py-1 rounded-full dark:bg-gray-600 dark:text-gray-300">COMING SOON</span>}
      <div className="text-4xl text-cyan-800 dark:text-orange-500 mb-4">{icon}</div>
      <span className="font-bold text-lg text-gray-800 dark:text-gray-100">{title}</span>
      <span className="text-sm text-gray-500 dark:text-gray-400 mt-2">{description}</span>
    </button>
  );
};

const StatsView = forwardRef(function StatsView({
  project, codeDefinitions, projectId, onResultsChange,
  view, setView, selectedChiSquareType, setSelectedChiSquareType,
  loading, error, results,
  isValidationRunning, validationStatus,
  showAssumptionsConfirm, setShowAssumptionsConfirm,
  areAssumptionsAcknowledged, setAreAssumptionsAcknowledged,
  showFisherConfirm, setShowFisherConfirm,
  gofCodes, setGofCodes,
  gofDocs, setGofDocs,
  gofDistributionType, setGofDistributionType,
  gofCustomProportions, setGofCustomProportions,
  indepCodes, setIndepCodes,
  indepDocs, setIndepDocs,
  homoCodes, setHomoCodes,
  homoNumGroups, setHomoNumGroups,
  homoDocGroups, setHomoDocGroups,
  areChiSquareInputsIncomplete,
  isValidationPassed,
  handleRevalidateWithCombinations,
  handleValidateTest,
  handleConfirmAndProceedWithValidation,
  handleRunTest,
  handleConfirmFisher
}, ref) {
  const resultsPanelRef = useRef(null);

  const stats = useMemo(() => {
    if (!project || !codeDefinitions) {
        return { numDocuments: 0, numCodes: 0, numSegments: 0, codeStats: [], avgSegmentsPerDoc: 0, avgSegmentsPerCode: 0, mostUsedCode: null };
    }
    const numDocuments = project.importedFiles?.length || 0;
    const numCodes = codeDefinitions?.length || 0;
    const numSegments = project.codedSegments?.length || 0;
    const codeFrequencies = {};
    const codeDocumentPresence = {};
    for (const code of codeDefinitions) {
        codeFrequencies[code._id] = 0;
        codeDocumentPresence[code._id] = new Set();
    }
    for (const segment of project.codedSegments) {
        const codeId = segment.codeDefinition._id.toString();
        if (codeFrequencies.hasOwnProperty(codeId)) {
            codeFrequencies[codeId]++;
        }
        if (codeDocumentPresence.hasOwnProperty(codeId)) {
            codeDocumentPresence[codeId].add(segment.fileId.toString());
        }
    }
    const codeStats = codeDefinitions.map(code => ({
        ...code,
        frequency: codeFrequencies[code._id] || 0,
        docCount: codeDocumentPresence[code._id]?.size || 0,
        percentage: numSegments > 0 ? ((codeFrequencies[code._id] || 0) / numSegments * 100).toFixed(1) : 0
    })).sort((a, b) => b.frequency - a.frequency);
    const mostUsedCode = codeStats.length > 0 ? codeStats[0] : null;
    return {
        numDocuments,
        numCodes,
        numSegments,
        codeStats,
        avgSegmentsPerDoc: numDocuments > 0 ? (numSegments / numDocuments).toFixed(1) : 0,
        avgSegmentsPerCode: numCodes > 0 ? (numSegments / numCodes).toFixed(1) : 0,
        mostUsedCode: mostUsedCode
    };
  }, [project, codeDefinitions]);

  useEffect(() => {
    if (onResultsChange) {
      onResultsChange(results);
    }
  }, [results, onResultsChange]);

  const handleExportResultsAsPdf = async () => {
    if (!resultsPanelRef.current) {
      alert("The results panel is not available for export.");
      return;
    }

    try {
      const printWindow = window.open('', '_blank');
      const resultsContent = resultsPanelRef.current.innerHTML;

      const printHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Statistical Analysis Results</title>
        <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; background: white; font-size: 12pt; }
        @page {
        size: A4;
        margin: 0.75in;
        @top-center { content: "Statistical Analysis Results"; font-size: 10pt; color: #6b7280; }
        @bottom-center { content: "Page " counter(page) " of " counter(pages); font-size: 10pt; color: #6b7280; }
        }
        h1, h2, h3, h4, h5, h6 { color: #111827; margin: 16pt 0 8pt 0; page-break-after: avoid; }
        h1 { font-size: 18pt; font-weight: bold; } h2 { font-size: 16pt; font-weight: bold; } h3 { font-size: 14pt; font-weight: bold; } h4 { font-size: 12pt; font-weight: bold; }
        p { margin: 8pt 0; text-align: justify; }

        /* Fixed grid layout to prevent cut-off */
        .grid { 
          display: flex !important; 
          flex-wrap: wrap !important; 
          gap: 8pt !important; 
          margin: 12pt 0 !important;
        }
        .grid > * { 
          flex: 1 1 auto !important; 
          min-width: 120pt !important; 
          margin: 4pt !important; 
          page-break-inside: avoid !important;
          overflow: visible !important;
          height: auto !important;
        }

        table { width: 100%; border-collapse: collapse; margin: 12pt 0; page-break-inside: avoid; }
        th, td { border: 1pt solid #d1d5db; padding: 6pt 8pt; text-align: left; vertical-align: top; }
        th { background-color: #f9fafb; font-weight: bold; font-size: 10pt; }
        td { font-size: 10pt; }

        .bg-gray-50, .bg-gray-100, .bg-gray-200, .bg-green-100, .bg-yellow-100, .bg-red-100, .bg-cyan-100, .bg-orange-100 { 
          background-color: #f9fafb !important; 
          border: 1pt solid #e5e7eb; 
          padding: 8pt; 
          margin: 4pt 0; 
          border-radius: 4pt; 
          page-break-inside: avoid !important;
          overflow: visible !important;
          height: auto !important;
          min-height: 40pt !important;
        }

        .bg-green-100 { border-left: 4pt solid #10b981; } 
        .bg-yellow-100 { border-left: 4pt solid #f59e0b; } 
        .bg-red-100 { border-left: 4pt solid #ef4444; } 
        .bg-cyan-100 { border-left: 4pt solid #06b6d4; }

        .stat-container { 
          display: flex; 
          justify-content: space-between; 
          flex-wrap: wrap; 
          gap: 12pt; 
          margin: 12pt 0; 
        }

        .stat-item { 
          flex: 1; 
          min-width: 120pt; 
          text-align: center; 
          border: 1pt solid #d1d5db; 
          padding: 8pt; 
          border-radius: 4pt; 
          page-break-inside: avoid !important;
          overflow: visible !important;
          height: auto !important;
        }

        .stat-label { font-size: 9pt; color: #6b7280; display: block; margin-bottom: 4pt; }
        .stat-value { font-size: 14pt; font-weight: bold; display: block; }

        canvas, svg { max-width: 100%; height: auto; page-break-inside: avoid; }
        .page-break-before { page-break-before: always; } 
        .page-break-after { page-break-after: always; } 
        .page-break-avoid { page-break-inside: avoid; }
        .fa, .fas, .far, .fal, .fab, [class*="fa-"] { display: none; }
        button, .no-print { display: none !important; }
        .dark *, .dark { background-color: white !important; color: #1f2937 !important; border-color: #d1d5db !important; }

        @media print { 
          body { font-size: 11pt; } 
          .grid { display: flex !important; flex-wrap: wrap !important; }
          .grid > * { page-break-inside: avoid !important; }
          .hidden { display: none !important; } 
        }

        </style>
        </head>
        <body>
        <div class="print-content">
        <header class="page-break-avoid">
        <h1>Statistical Analysis Results</h1>
        <p style="color: #6b7280; font-size: 10pt;">Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        <hr style="margin: 12pt 0; border: 0.5pt solid #e5e7eb;">
        </header>
        <main>${resultsContent}</main>
        </div>
        <script>
        document.addEventListener('DOMContentLoaded', function() {
        // Remove GroupedStacked text from charts
        const textElements = document.querySelectorAll('text, span, div');
        textElements.forEach(element => {
        if (element.textContent && element.textContent.trim() === 'GroupedStacked') {
        element.style.display = 'none';
        }
        });

        const grids = document.querySelectorAll('.grid, [class*="grid-cols"]');
        grids.forEach(grid => {
        grid.classList.add('stat-container');
        const items = grid.children;
        Array.from(items).forEach(item => {
        item.classList.add('stat-item');
        const label = item.querySelector('.text-sm');
        const value = item.querySelector('.text-2xl, .font-bold');
        if (label && value) {
        label.classList.add('stat-label');
        value.classList.add('stat-value');
        }
        });
        });
        const sections = document.querySelectorAll('h4');
        sections.forEach((section, index) => { if (index > 1) { section.classList.add('page-break-before'); } });
        const tables = document.querySelectorAll('table');
        tables.forEach(table => { table.classList.add('page-break-avoid'); });
        setTimeout(() => { window.print(); }, 500);
        });
        window.addEventListener('afterprint', function() { window.close(); });
        </script>
        </body>
        </html>
        `;

      printWindow.document.write(printHTML);
      printWindow.document.close();
      printWindow.focus();
    } catch (error) {
      console.error('Error creating print preview:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  useImperativeHandle(ref, () => ({
    exportAsPdf: () => {
        handleExportResultsAsPdf();
    }
  }));

  const handleChiSquareTypeSelect = (type) => {
    setSelectedChiSquareType(type);
    setView('chi-square-config');
  };

  const renderStatsControlPanel = () => {
    if (view === 'chi-square-config') {
      return <ChiSquareControlPanel
        testType={selectedChiSquareType}
        project={project}
        codeDefinitions={codeDefinitions}
        gofCodes={gofCodes} setGofCodes={setGofCodes}
        gofDocs={gofDocs} setGofDocs={setGofDocs}
        gofDistributionType={gofDistributionType} setGofDistributionType={setGofDistributionType}
        gofCustomProportions={gofCustomProportions} setGofCustomProportions={setGofCustomProportions}
        indepCodes={indepCodes} setIndepCodes={setIndepCodes}
        indepDocs={indepDocs} setIndepDocs={setIndepDocs}
        homoCodes={homoCodes} setHomoCodes={setHomoCodes}
        homoNumGroups={homoNumGroups} setHomoNumGroups={setHomoNumGroups}
        homoDocGroups={homoDocGroups} setHomoDocGroups={setHomoDocGroups}
      />;
    }
    return null;
  };

  const renderStatsMainContent = () => {
    switch (view) {
      case 'summary':
        return (
          <ProjectStatsSummary 
            stats={stats} 
            onProceed={() => setView('test-selection')} 
          />
        );
      case 'test-selection':
        return (
          <div className="text-center h-full flex flex-col justify-center items-center p-4 motion-safe:animate-[fadeIn_0.5s_ease-in-out]">
            <h2 className="text-3xl font-bold mb-4 text-gray-800 dark:text-gray-100">Statistical Analysis</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-10 max-w-2xl mx-auto">Choose a statistical test to begin your analysis.</p>
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-8">
              <TestSelectionCard icon={<FaTable />} title="Chi-Squared Test" description="Test for associations between categories." onClick={() => setView('chi-square-type-selection')} />
              <TestSelectionCard icon={<FaChartBar />} title="T-Test" description="Compare the means of two groups." disabled={true} />
              <TestSelectionCard icon={<FaThList />} title="ANOVA" description="Compare means of three or more groups." disabled={true} />
            </div>
          </div>
        );
      case 'chi-square-type-selection':
        return <ChiSquareTypeSelector onSelect={handleChiSquareTypeSelect} stats={stats} />;
      default:
        return (
          <StatsResultsPanel
            ref={resultsPanelRef}
            results={results}
            isLoading={loading}
            error={error}
            validationStatus={validationStatus}
            isValidationRunning={isValidationRunning}
            chiSquareSubtype={selectedChiSquareType}
            onValidate={handleValidateTest}
            onRunTest={handleRunTest}
            onRevalidate={handleRevalidateWithCombinations}
            isValidateDisabled={areChiSquareInputsIncomplete}
            isValidationPassed={isValidationPassed}
          />
        );
    }
  };

  return (
    <div className="relative flex-grow flex gap-6 overflow-hidden h-full">
        {view === 'chi-square-config' && (
            <div className="w-2/5 flex-shrink-0 overflow-y-auto custom-scrollbar p-4 border-r dark:border-gray-600">
            {renderStatsControlPanel()}
            </div>
        )}
        <div className={`${view === 'chi-square-config' ? 'w-3/5' : 'w-full'} flex-grow overflow-y-auto custom-scrollbar p-4`}>
            {renderStatsMainContent()}
        </div>
        
        {showAssumptionsConfirm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 flex items-center justify-center z-[60]" onClick={() => setShowAssumptionsConfirm(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-2xl max-w-lg w-full border dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                <FaExclamationTriangle className="text-yellow-500 text-5xl mx-auto mb-6" />
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4 text-center">Acknowledge Statistical Assumptions</h3>
                <div className="space-y-4 mb-6">
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">For this test to be accurate, you must confirm that the selected documents are <strong>independent</strong> (distinct, with no content in common).</p>
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">Additionally, please consider that if your data was not <strong>randomly sampled</strong>, this may limit how the results generalize to a larger population.</p>
                </div>
                <label htmlFor="assumptions-acknowledge" className="mt-3 flex items-center justify-center space-x-3 cursor-pointer select-none text-gray-800 dark:text-gray-200">
                <input
                    id="assumptions-acknowledge"
                    type="checkbox"
                    checked={areAssumptionsAcknowledged}
                    onChange={(e) => setAreAssumptionsAcknowledged(e.target.checked)}
                    className="h-5 w-5 rounded border-gray-300 text-cyan-900 focus:ring-cyan-700 dark:bg-gray-700 dark:border-gray-600"
                />
                <span className="text-sm font-medium">I acknowledge these assumptions.</span>
                </label>
                <div className="flex justify-center gap-4 mt-8">
                <button
                    onClick={handleConfirmAndProceedWithValidation}
                    disabled={!areAssumptionsAcknowledged}
                    className="px-6 py-2 bg-cyan-900 text-white font-semibold rounded-md hover:bg-cyan-700 dark:bg-orange-600 dark:hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Acknowledge & Validate
                </button>
                <button
                    onClick={() => setShowAssumptionsConfirm(false)}
                    className="px-6 py-2 bg-gray-300 text-gray-800 font-semibold rounded-md hover:bg-gray-400 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                    Cancel
                </button>
                </div>
            </motion.div>
            </motion.div>
        )}
        {showFisherConfirm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 flex items-center justify-center z-[60]" onClick={() => setShowFisherConfirm(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-2xl max-w-md w-full border dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                <FaExclamationTriangle className="text-yellow-500 text-5xl mx-auto mb-6" />
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4 text-center">Run Alternative Test?</h3>
                <p className="text-gray-700 dark:text-gray-300 mb-6 text-sm leading-relaxed text-justify">The assumptions for the Chi-Square test were not met. <strong>Fisher's Exact Test</strong> will be run instead as it is more accurate for this data. Do you want to continue?</p>
                <div className="flex justify-center gap-4">
                <button onClick={handleConfirmFisher} className="px-6 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors">Yes, Continue</button>
                <button onClick={() => setShowFisherConfirm(false)} className="px-6 py-2 bg-gray-300 text-gray-800 font-semibold rounded-md hover:bg-gray-400 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors">Cancel</button>
                </div>
            </motion.div>
            </motion.div>
        )}
    </div>
  );
});

export default StatsView;