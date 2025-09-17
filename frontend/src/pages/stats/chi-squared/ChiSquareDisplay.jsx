import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * A utility function to truncate long string labels for display on chart axes.
 * @param {string} label - The label string to truncate.
 * @returns {string} The truncated label, with an ellipsis if shortened.
 */
const truncateLabel = (label) => {
  if (label.length > 15) {
    return `${label.substring(0, 15)}...`;
  }
  return label;
};

/**
 * Renders a bar chart to visualize the results of a Goodness-of-Fit test,
 * comparing the observed frequencies against the expected frequencies for each category.
 *
 * @param {object} props - The component props.
 * @param {object} props.results - The results object from the statistical test.
 * @param {number[]} props.results.observedCounts - An array of observed frequency counts.
 * @param {number[]} props.results.expectedCounts - An array of expected frequency counts.
 * @param {string[]} props.results.categoryLabels - An array of labels for each category.
 * @returns {JSX.Element} The rendered bar chart component.
 */
const GoodnessOfFitChart = ({ results }) => {
  const { observedCounts, expectedCounts, categoryLabels } = results;
  const chartData = categoryLabels.map((label, index) => ({
    name: label,
    Observed: observedCounts[index],
    Expected: parseFloat(expectedCounts[index].toFixed(2)),
  }));

  return (
    <div>
      <h5 className="no-export mb-2 text-center font-semibold">Observed vs. Expected Frequencies</h5>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="Observed" fill="#3b82f6" />
          <Bar dataKey="Expected" fill="#f97316" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * Renders a bar chart for visualizing a contingency table, typically for
 * Independence or Homogeneity tests. It includes a toggle to switch between
 * a grouped and a stacked bar chart view.
 *
 * @param {object} props - The component props.
 * @param {object} props.results - The results object from the statistical test.
 * @param {number[][]} props.results.observedTable - A 2D array representing the contingency table.
 * @param {string[]} props.results.rowLabels - An array of labels for the chart's bars (e.g., codes).
 * @param {string[]} props.results.colLabels - An array of labels for the chart's x-axis (e.g., documents).
 * @returns {JSX.Element} The rendered contingency table chart component.
 */
const ContingencyChart = ({ results }) => {
  const [isStacked, setIsStacked] = useState(false);
  const { observedTable, rowLabels, colLabels } = results;

  const chartData = colLabels.map((colName, colIndex) => {
    const entry = { name: colName };
    rowLabels.forEach((rowName, rowIndex) => {
      entry[rowName] = observedTable[rowIndex][colIndex];
    });
    return entry;
  });

  const colors = ['#3b82f6', '#f97316', '#10b981', '#ef4444', '#8b5cf6', '#eab308'];

  return (
    <div>
      <div className="no-export mb-2">
        <h5 className="text-left font-semibold">Observed Frequencies by Group/Document</h5>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tickFormatter={truncateLabel} />
          <YAxis />
          <Tooltip />
          <Legend />
          {rowLabels.map((rowName, index) => (
            <Bar
              key={rowName}
              dataKey={rowName}
              stackId={isStacked ? "a" : undefined}
              fill={colors[index % colors.length]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      <div className="no-export mt-2 flex justify-end">
        <div className="flex items-center gap-2 text-xs">
          <span>Grouped</span>
          <button
            onClick={() => setIsStacked(!isStacked)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isStacked ? 'bg-gray-600' : 'bg-gray-400'}`}
            title={`Switch to ${isStacked ? 'Grouped' : 'Stacked'} View`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isStacked ? 'translate-x-5' : 'translate-x-1'}`}
            />
          </button>
          <span>Stacked</span>
        </div>
      </div>
    </div>
  );
};

/**
 * A wrapper component that conditionally renders the appropriate chart based on
 * the Chi-Square test subtype provided in the results.
 *
 * @param {object} props - The component props.
 * @param {object} props.results - The results object from any Chi-Square test, containing a `subtype` property.
 * @returns {JSX.Element|null} The corresponding chart component for the test results, or null if no results are provided.
 */
const ChiSquareDisplay = ({ results }) => {
  if (!results) return null;

  if (results.subtype === 'Goodness-of-Fit') {
    return <GoodnessOfFitChart results={results} />;
  }

  if (results.subtype === 'Independence' || results.subtype === 'Homogeneity') {
    return <ContingencyChart results={results} />;
  }

  return null;
};

export default ChiSquareDisplay;