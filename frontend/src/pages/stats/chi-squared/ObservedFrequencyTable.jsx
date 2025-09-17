import React from 'react';

/**
 * Renders a simple frequency table for the results of a Goodness-of-Fit test,
 * displaying categories and their observed frequencies.
 *
 * @param {object} props - The component props.
 * @param {object} props.results - The results object from the statistical test.
 * @param {number[]} props.results.observedCounts - An array of observed frequency counts.
 * @param {string[]} props.results.categoryLabels - An array of labels for each category.
 * @returns {JSX.Element} The rendered frequency table.
 */
const GoodnessOfFitTable = ({ results }) => {
  const { observedCounts, categoryLabels } = results;
  const total = observedCounts.reduce((sum, val) => sum + val, 0);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full rounded-lg border text-left text-sm dark:border-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700/50">
          <tr>
            <th className="p-3 font-semibold">Category</th>
            <th className="p-3 text-center font-semibold">Observed Frequency</th>
          </tr>
        </thead>
        <tbody>
          {categoryLabels.map((label, i) => (
            <tr key={label} className="border-b last:border-b-0 dark:border-gray-700">
              <td className="p-3">{label}</td>
              <td className="p-3 text-center text-lg font-bold">{observedCounts[i]}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 bg-gray-100 dark:border-gray-600 dark:bg-gray-900/50">
            <td className="p-3 font-bold">Total</td>
            <td className="p-3 text-center text-lg font-bold">{total}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

/**
 * Renders a contingency table for the results of an Independence or Homogeneity
 * test, displaying observed frequencies for two variables, including row and column totals.
 *
 * @param {object} props - The component props.
 * @param {object} props.results - The results object from the statistical test.
 * @param {number[][]} props.results.observedTable - A 2D array representing the contingency table.
 * @param {string[]} props.results.rowLabels - An array of labels for the table rows.
 * @param {string[]} props.results.colLabels - An array of labels for the table columns.
 * @returns {JSX.Element} The rendered contingency table.
 */
const ContingencyTable = ({ results }) => {
  const { observedTable, rowLabels, colLabels } = results;

  const rowTotals = observedTable.map(row => row.reduce((sum, val) => sum + val, 0));
  const colTotals = colLabels.map((_, colIndex) => observedTable.reduce((sum, row) => sum + row[colIndex], 0));
  const grandTotal = rowTotals.reduce((sum, val) => sum + val, 0);

  return (
    <table className="w-full table-fixed rounded-lg border text-left text-sm dark:border-gray-700">
      <thead className="bg-gray-50 dark:bg-gray-700/50">
        <tr className="border-b dark:border-gray-600">
          <th className="w-1/4 p-3 font-semibold"></th>
          {colLabels.map(label => (
            <th key={label} className="break-words p-3 text-center align-middle font-semibold">
              {label}
            </th>
          ))}
          <th className="w-24 border-l p-3 text-center font-bold dark:border-gray-600">Row Total</th>
        </tr>
      </thead>
      <tbody>
        {rowLabels.map((label, i) => (
          <tr key={label} className="border-b last:border-b-0 dark:border-gray-700">
            <td className="break-words p-3 align-middle font-semibold">{label}</td>
            {observedTable[i].map((val, j) => (
              <td key={`${i}-${j}`} className="p-3 text-center align-middle text-lg font-bold">{val}</td>
            ))}
            <td className="border-l bg-gray-50 p-3 text-center align-middle font-bold dark:border-gray-600 dark:bg-gray-700/50">{rowTotals[i]}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t-2 bg-gray-100 dark:border-gray-600 dark:bg-gray-900/50">
          <td className="p-3 font-bold">Column Total</td>
          {colTotals.map((total, i) => (
            <td key={i} className="p-3 text-center font-bold">{total}</td>
          ))}
          <td className="border-l bg-gray-200 p-3 text-center font-bold dark:border-gray-600 dark:bg-gray-900/50">{grandTotal}</td>
        </tr>
      </tfoot>
    </table>
  );
};

/**
 * A wrapper component that conditionally renders the correct observed frequency
 * table (`GoodnessOfFitTable` or `ContingencyTable`) based on the test subtype.
 *
 * @param {object} props - The component props.
 * @param {object} props.results - The results object from a Chi-Square test, containing a `subtype` property.
 * @returns {JSX.Element|null} The corresponding table component for the test results, or null if no results are provided.
 */
const ObservedFrequencyTable = ({ results }) => {
  if (!results) return null;

  switch (results.subtype) {
    case 'Goodness-of-Fit':
      return <GoodnessOfFitTable results={results} />;
    case 'Independence':
    case 'Homogeneity':
      return <ContingencyTable results={results} />;
    default:
      return null;
  }
};

export default ObservedFrequencyTable;