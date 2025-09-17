import React from 'react';

/**
 * Renders a detailed contingency table showing both observed and expected
 * frequencies for each cell, along with row, column, and grand totals. It also
 * provides a breakdown of the expected frequency calculation.
 *
 * @param {object} props - The component props.
 * @param {object} props.details - An object containing all the necessary data for the table.
 * @param {number[][]} props.details.observed - A 2D array of observed frequency counts.
 * @param {number[][]} props.details.expected - A 2D array of calculated expected frequency counts.
 * @param {string[]} props.details.rowLabels - An array of labels for the table rows.
 * @param {string[]} props.details.colLabels - An array of labels for the table columns.
 * @param {number[]} props.details.rowTotals - An array of the totals for each row.
 * @param {number[]} props.details.colTotals - An array of the totals for each column.
 * @param {number} props.details.grandTotal - The grand total of all observations.
 * @param {string} props.subtype - The type of statistical test being displayed.
 * @returns {JSX.Element} The rendered component with detailed calculations.
 */
const ContingencyTableDetails = ({ details, subtype }) => {
  const { observed, expected, rowLabels, colLabels, rowTotals, colTotals, grandTotal } = details || {};

  if (!observed || !expected || !colLabels || !rowTotals || !colTotals) {
    return <p>Detailed calculations are not available.</p>;
  }

  const firstCellCalc = `(${rowTotals[0]} × ${colTotals[0]}) / ${grandTotal} = ${expected[0][0].toFixed(2)}`;

  return (
    <div className="mt-3 space-y-6 text-sm">
      <div>
        <p className="font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">1. Contingency Table (Observed vs. Expected)</p>
        <div className="mt-1 overflow-x-auto rounded-lg border dark:border-gray-700">
          <table className="w-full table-fixed bg-white text-left text-xs dark:bg-gray-800 md:text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr className="border-b dark:border-gray-600">
                <th className="w-1/4 p-2 font-semibold"></th>
                {colLabels.map((label, i) => (
                  <th key={i} className="break-words p-2 text-center font-semibold" title={label}>{label}</th>
                ))}
                <th className="w-24 border-l p-2 text-center font-bold dark:border-gray-600">Row Total</th>
              </tr>
            </thead>
            <tbody>
              {rowLabels.map((label, i) => (
                <tr key={i} className="border-b last:border-b-0 dark:border-gray-700">
                  <td className="break-words p-2 font-semibold" title={label}>{label}</td>
                  {observed[i].map((obsVal, j) => {
                    const expectedValue = expected[i][j];
                    const expectedCalc = `(${rowTotals[i]}×${colTotals[j]})/${grandTotal}`;
                    const expectedResult = expectedValue.toFixed(2);
                    const colorClass = expectedValue < 5 ? 'text-red-600 dark:text-red-500' : 'text-green-600 dark:text-green-500';

                    return (
                      <td key={j} className="p-2 text-center align-top">
                        <div className="font-bold md:text-base">{obsVal}</div>
                        <div
                          className={`break-all font-mono text-[10px] md:text-xs ${colorClass}`}
                          title={`Expected Value: ${expectedValue.toFixed(4)}`}
                        >
                          {`${expectedCalc}=${expectedResult}`}
                        </div>
                      </td>
                    );
                  })}
                  <td className="border-l bg-gray-50 p-2 text-center font-bold dark:border-gray-600 dark:bg-gray-700/50">{rowTotals[i]}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 bg-gray-50 dark:border-gray-600 dark:bg-gray-700/50">
                <td className="p-2 font-bold">Col Total</td>
                {colTotals.map((total, i) => (
                  <td key={i} className="p-2 text-center font-bold">{total}</td>
                ))}
                <td className="border-l bg-gray-100 p-2 text-center font-bold dark:border-gray-600 dark:bg-gray-900/50">{grandTotal}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div>
        <p className="font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">2. Expected Frequency Formula</p>
        <div className="mt-1 rounded-md border bg-gray-100 p-3 text-center dark:border-gray-700 dark:bg-gray-900/50">
          <code className="font-mono text-base">(Row Total × Column Total) / Grand Total</code>
        </div>
      </div>

      <div>
        <p className="font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">3. Example Calculation (Top-Left Cell)</p>
        <div className="mt-1 rounded-md border bg-gray-100 p-3 text-center dark:border-gray-700 dark:bg-gray-900/50">
          <code className="font-mono text-base">{firstCellCalc}</code>
        </div>
      </div>
    </div>
  );
};

/**
 * Renders a detailed frequency table for a Goodness-of-Fit test, showing
 * categories, expected proportions (if applicable), observed counts, and
 * expected counts with their calculation formulas.
 *
 * @param {object} props - The component props.
 * @param {object} props.details - An object containing all the necessary data for the table.
 * @param {number[]} props.details.observedCounts - An array of observed frequency counts.
 * @param {string[]} props.details.categoryLabels - An array of labels for each category.
 * @param {number} props.details.totalObservations - The total number of observations.
 * @param {number} props.details.numCategories - The number of categories.
 * @param {number[]} props.details.expectedCounts - An array of calculated expected counts.
 * @param {number[]} [props.details.expectedProportions] - An optional array of expected proportions for custom distributions.
 * @returns {JSX.Element} The rendered component with detailed calculations.
 */
const GoodnessOfFitDetails = ({ details }) => {
  const { observedCounts, categoryLabels, totalObservations, numCategories, expectedCounts, expectedProportions } = details || {};
  const isCustom = !!expectedProportions;

  if (observedCounts == null || categoryLabels == null || totalObservations == null || numCategories == null || expectedCounts == null) {
    return <div className="text-sm text-gray-500 dark:text-gray-400"><p>Detailed calculations are not available.</p></div>;
  }

  return (
    <div className="mt-3 space-y-6 text-sm">
      <div>
        <p className="font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">1. Frequency Table</p>
        <div className="mt-1 rounded-lg border dark:border-gray-700">
          <table className="w-full bg-white text-left text-xs dark:bg-gray-800 md:text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr className="border-b dark:border-gray-600">
                <th className="w-1/3 p-2 font-semibold">Category</th>
                {isCustom && <th className="p-2 text-center font-semibold">Exp. Prop.</th>}
                <th className="p-2 text-center font-semibold">Observed (O)</th>
                <th className="p-2 text-center font-semibold">Expected (E)</th>
              </tr>
            </thead>
            <tbody>
              {categoryLabels.map((label, i) => {
                const expectedValue = expectedCounts[i];
                const colorClass = expectedValue < 5 ? 'text-red-600 dark:text-red-500' : 'text-green-600 dark:text-green-500';
                const expectedCalcString = isCustom ?
                  `(${totalObservations}×${expectedProportions[i]})=${expectedValue.toFixed(2)}` :
                  `(${totalObservations}/${numCategories})=${expectedValue.toFixed(2)}`;

                return (
                  <tr key={i} className="border-b last:border-b-0 dark:border-gray-700">
                    <td className="break-words p-2" title={label}>{label}</td>
                    {isCustom && <td className="p-2 text-center">{(expectedProportions[i] * 100).toFixed(1)}%</td>}
                    <td className="p-2 text-center font-bold md:text-base">{observedCounts[i]}</td>
                    <td className="p-2 text-center align-top">
                      <div className="font-bold md:text-base">{expectedValue.toFixed(2)}</div>
                      <div
                        className={`break-all font-mono text-[10px] md:text-xs ${colorClass}`}
                        title={`Expected Value: ${expectedValue.toFixed(4)}`}
                      >
                        {expectedCalcString}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 bg-gray-50 dark:border-gray-600 dark:bg-gray-700/50">
                <td className="p-2 font-bold">Total</td>
                {isCustom && <td className="p-2 text-center font-bold">100%</td>}
                <td className="p-2 text-center font-bold">{totalObservations}</td>
                <td className="p-2 text-center font-bold">{totalObservations.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <div>
        <p className="font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">2. Expected Frequency Formula</p>
        <div className="mt-1 rounded-md border bg-gray-100 p-3 text-center dark:border-gray-700 dark:bg-gray-900/50">
          {isCustom ? (
            <code className="font-mono text-base">Total Observations × Expected Proportion</code>
          ) : (
            <code className="font-mono text-base">Total Observations / Number of Categories</code>
          )}
        </div>
      </div>
      <div>
        <p className="font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">3. Example Calculation (First Category)</p>
        <div className="mt-1 rounded-md border bg-gray-100 p-3 text-center dark:border-gray-700 dark:bg-gray-900/50">
          {isCustom ? (
            <code className="font-mono text-base">{totalObservations} × {expectedProportions[0].toFixed(2)} = {expectedCounts[0].toFixed(2)}</code>
          ) : (
            <code className="font-mono text-base">{totalObservations} / {numCategories} = {expectedCounts[0].toFixed(2)}</code>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * A wrapper component that selects and renders the appropriate detailed
 * calculation view based on the Chi-Square test subtype.
 *
 * @param {object} props - The component props.
 * @param {object} props.details - The detailed results object from the statistical test.
 * @param {string} props.subtype - The subtype of the test ('goodness-of-fit', 'independence', 'homogeneity').
 * @returns {JSX.Element} The corresponding details component for the test type.
 */
const ExpectedFrequencyDetails = ({ details, subtype }) => {
  if (subtype === 'goodness-of-fit') {
    return <GoodnessOfFitDetails details={details} />;
  }
  if (subtype === 'independence' || subtype === 'homogeneity') {
    return <ContingencyTableDetails details={details} subtype={subtype} />;
  }
  return <p>Detailed calculations are not available for this test type.</p>;
};

export default ExpectedFrequencyDetails;