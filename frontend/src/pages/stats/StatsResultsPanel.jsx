import React, { useState } from 'react';
import { forwardRef } from 'react';
import ChiSquareDisplay from './chi-squared/ChiSquareDisplay.jsx';
import ExpectedFrequencyDetails from './ExpectedFrequencyDetails.jsx';
import ObservedFrequencyTable from './chi-squared/ObservedFrequencyTable.jsx';
import ChiSquareDistributionChart from './chi-squared/ChiSquareDistributionChart.jsx';
import CombineCategoriesModal from './CombineCategoriesModal.jsx';
import { FaExclamationTriangle, FaCheckCircle, FaHourglassHalf, FaInfoCircle, FaTimesCircle } from 'react-icons/fa';

/**
 * A simple presentational component for displaying a single statistic with a label.
 * @param {object} props - The component props.
 * @param {string} props.label - The label for the statistic.
 * @param {string|number} props.value - The value of the statistic.
 * @returns {JSX.Element} The rendered statistic display component.
 */
const StatDisplay = ({ label, value }) => (
  <div className="rounded-lg bg-gray-100 p-3 dark:bg-gray-700">
    <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
    <div className="text-2xl font-bold">{value}</div>
  </div>
);

/**
 * A presentational component for displaying Cramér's V with an info tooltip.
 * @param {object} props - The component props.
 * @param {string|number} props.value - The value of the statistic.
 * @returns {JSX.Element} The rendered statistic display component with a tooltip.
 */
const CramersVStatDisplay = ({ value }) => (
  <div className="rounded-lg bg-gray-100 p-3 dark:bg-gray-700">
    <div className="group relative flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
      Cramér's V
      <FaInfoCircle className="ml-2 text-gray-400" />
      <div className="pointer-events-none absolute bottom-full z-10 mb-2 w-64 rounded-md bg-gray-800 p-2 text-center text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
        Measures the strength of association. 0 indicates no association, and 1 indicates a perfect association.
      </div>
    </div>
    <div className="text-2xl font-bold">{value}</div>
  </div>
);

/**
 * Renders an icon corresponding to the status of a statistical assumption.
 * @param {object} props - The component props.
 * @param {'processing'|'passed'|'warning'|'pending'} props.status - The status of the assumption.
 * @returns {JSX.Element} The rendered status icon.
 */
const AssumptionStatusIcon = ({ status }) => {
  switch (status) {
    case 'processing': return <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-t-2 border-cyan-700" title="Processing..."></div>;
    case 'passed': return <FaCheckCircle className="text-xl text-green-500" title="Passed" />;
    case 'warning': return <FaExclamationTriangle className="text-xl text-yellow-500" title="Warning" />;
    case 'pending': default: return <FaHourglassHalf className="text-xl text-gray-400" title="Pending" />;
  }
};

/**
 * Displays a checklist of statistical assumptions and their validation status.
 * @param {object} props - The component props.
 * @param {object} props.validationStatus - An object containing the status and messages for each assumption.
 * @param {string} props.chiSquareSubtype - The specific subtype of the Chi-Square test being performed.
 * @returns {JSX.Element} The rendered assumptions checklist.
 */
const AssumptionChecklist = ({ validationStatus, chiSquareSubtype }) => {
  const [openTooltipKey, setOpenTooltipKey] = React.useState(null);

  const assumptions = [
    { key: 'independence', title: 'Independence of Observations', description: 'Observations must be independent (i.e., no common/overlapping content).' },
    { key: 'categorical', title: 'Categorical Data', description: 'Data must consist of categorical variables presented as observed counts or frequencies.' },
    { key: 'expectedFrequency', title: 'Expected Cell Frequency', description: 'Each expected count should generally be ≥ 5. A warning is shown if any are below this threshold.' },
    { key: 'randomSampling', title: 'Random Sampling', description: 'For results to be generalizable, data should come from a random sample.' },
  ];

  return (
    <div className="-mt-5 w-full max-w-2xl space-y-4">
      <h3 className="text-center text-lg font-bold text-gray-800 dark:text-gray-200">Chi-Square Underlying Assumptions</h3>
      <div className="rounded-lg border bg-white dark:border-gray-700 dark:bg-gray-800">
        {assumptions.map((assumption, index) => {
          const statusResult = validationStatus?.[assumption.key];
          const status = statusResult?.status;
          const message = statusResult?.message;
          const details = statusResult?.details;
          const isTooltipOpen = openTooltipKey === assumption.key;
          const tooltipColorClasses = {
            passed: { container: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800', text: 'text-green-900 dark:text-green-200' },
            warning: { container: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700', text: 'text-yellow-900 dark:text-yellow-200' }
          };
          const currentTooltipClasses = tooltipColorClasses[status] || tooltipColorClasses.warning;

          return (
            <div key={assumption.key} className={`${index < assumptions.length - 1 ? 'border-b dark:border-gray-700' : ''}`}>
              <div className="flex items-start space-x-4 p-4">
                <div className="pt-1"><AssumptionStatusIcon status={status} /></div>
                <div className="flex-grow text-left">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200">{assumption.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{assumption.description}</p>
                </div>
                <div className="pt-1">
                  {status && status !== 'pending' && status !== 'processing' && message && (
                    <button onClick={() => setOpenTooltipKey(isTooltipOpen ? null : assumption.key)} title={isTooltipOpen ? "Hide Info" : "Show Info"} className="transition-colors duration-200">
                      <FaInfoCircle className={`text-xl ${isTooltipOpen ? 'text-gray-400 dark:text-gray-200' : 'text-gray-400 hover:text-gray-200 dark:hover:text-gray-200'}`} />
                    </button>
                  )}
                </div>
              </div>
              {isTooltipOpen && message && (
                <div className="-mt-2 animate-fade-in-up px-6 pb-4">
                  <div className={`rounded-lg border p-4 shadow-inner ${currentTooltipClasses.container}`}>
                    <p className={`text-sm ${currentTooltipClasses.text}`}>{message}</p>
                    {assumption.key === 'expectedFrequency' && details && (
                      <ExpectedFrequencyDetails details={details} subtype={chiSquareSubtype} />
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Conditionally renders action buttons based on the validation and loading state.
 * @param {object} props - The component props.
 * @returns {JSX.Element} The appropriate action button(s).
 */
const ActionButtons = ({ validationStatus, isValidateDisabled, isValidationRunning, isLoading, onValidate, onRunTest, chiSquareSubtype, onOpenCombineModal }) => {
  const isPassed = validationStatus && Object.values(validationStatus).every(v => v.status === 'passed');
  const suggestion = validationStatus?.expectedFrequency?.details?.suggestion;

  if (isPassed) {
    return (
      <button onClick={() => onRunTest(chiSquareSubtype)} disabled={isLoading} className="w-full rounded-md bg-green-600 py-2 px-4 font-bold text-white hover:bg-green-700 disabled:bg-gray-400">
        {isLoading ? 'Running...' : 'Run Chi-Square Test'}
      </button>
    );
  }

  if (suggestion === 'fishers') {
    return (
      <button onClick={() => onRunTest('fishers-exact')} disabled={isLoading} className="w-full rounded-md bg-yellow-500 py-2 px-4 font-bold text-white hover:bg-yellow-600 disabled:bg-gray-400">
        {isLoading ? 'Running...' : "Run Fisher's Exact Test"}
      </button>
    );
  }

  if (suggestion === 'combine') {
    return (
      <div className="flex w-full gap-4">
        <button
          onClick={onOpenCombineModal}
          className="flex-1 rounded-md bg-yellow-500 py-2 px-4 font-bold text-white transition-colors hover:bg-yellow-600"
        >
          Combine Categories
        </button>
        <button disabled={true} className="flex-1 cursor-not-allowed rounded-md bg-gray-400 py-2 px-4 font-bold text-white">
          Run Test
        </button>
      </div>
    );
  }

  return (
    <button onClick={onValidate} disabled={isValidateDisabled || isValidationRunning} className="w-full rounded-md bg-cyan-900 py-2 px-4 font-bold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-gray-400 dark:bg-orange-600 dark:hover:bg-orange-700">
      {isValidationRunning ? 'Validating...' : 'Validate Data'}
    </button>
  );
};

/**
 * The main panel for displaying the state of a statistical analysis. It shows
 * the assumption checklist before a test is run, and displays the full results,
 * tables, and charts after the test is complete.
 *
 * @param {object} props - The component props.
 * @param {object|null} props.results - The final results from the statistical test.
 * @param {boolean} props.isLoading - A flag indicating if the test is currently running.
 * @param {string|null} props.error - An error message if the test failed.
 * @param {object|null} props.validationStatus - The results from the assumption validation check.
 * @param {boolean} props.isValidationRunning - A flag indicating if validation is in progress.
 * @param {() => void} props.onValidate - The callback to start the validation process.
 * @param {() => void} props.onRunTest - The callback to run the final statistical test.
 * @param {boolean} props.isValidateDisabled - A flag to disable the validation button.
 * @param {string} props.chiSquareSubtype - The specific subtype of the Chi-Square test.
 * @param {(groups: Array<object>) => void} props.onRevalidate - The callback to re-run validation after combining categories.
 * @param {React.Ref} ref - The ref passed by `forwardRef`.
 * @returns {JSX.Element} The rendered results panel.
 */
const StatsResultsPanel = forwardRef(({
  results, isLoading, error,
  validationStatus, isValidationRunning,
  onValidate, onRunTest, isValidateDisabled,
  chiSquareSubtype, onRevalidate
}, ref) => {
  const [showCombineModal, setShowCombineModal] = useState(false);

  if (isLoading && !results) {
    return <div className="flex h-full items-center justify-center"><div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-cyan-700"></div></div>;
  }
  if (error) {
    return <div className="rounded-lg bg-red-100 p-4 text-center text-red-700">{error}</div>;
  }
  if (!results) {
    const suggestion = validationStatus?.expectedFrequency?.details?.suggestion;
    const details = validationStatus?.expectedFrequency?.details;
    return (
      <>
        <div className="flex h-full flex-col items-center justify-center p-4">
          <div className="flex h-full w-full flex-col items-center justify-between">
            <AssumptionChecklist validationStatus={validationStatus} chiSquareSubtype={chiSquareSubtype} />
            <div className="w-full max-w-sm pt-4">
              <ActionButtons
                validationStatus={validationStatus}
                isValidateDisabled={isValidateDisabled}
                isValidationRunning={isValidationRunning}
                isLoading={isLoading}
                onValidate={onValidate}
                onRunTest={onRunTest}
                chiSquareSubtype={chiSquareSubtype}
                onOpenCombineModal={() => setShowCombineModal(true)}
              />
            </div>
          </div>
        </div>
        {suggestion === 'combine' && details?.originalCodeIds && (
          <CombineCategoriesModal
            show={showCombineModal}
            onClose={() => setShowCombineModal(false)}
            details={details}
            onApply={onRevalidate}
          />
        )}
      </>
    );
  }

  const isSignificant = results.pValue < 0.05;
  const isFisherTest = results.test === "Fisher's Exact Test";
  let frequencyHeading = "Observed Frequencies";
  if (results.subtype === 'Independence' || results.subtype === 'Homogeneity' || isFisherTest) {
    frequencyHeading = "Contingency Table";
  }

  const keyStatsForTable = [
    { label: isFisherTest ? "Odds Ratio" : "χ² Statistic", value: results.statistic?.toFixed(2) ?? 'N/A' },
    { label: "p-value", value: results.pValue.toFixed(4) },
  ];

  if (!isFisherTest) {
    keyStatsForTable.push({ label: "Degrees of Freedom", value: results.df.toFixed(0) });
  }

  if (results.cramersV !== undefined && results.cramersV !== null) {
    keyStatsForTable.push({ label: "Cramér's V", value: results.cramersV.toFixed(4) });
  }

  keyStatsForTable.push({ label: "Sample Size (N)", value: results.sampleSize });


  return (
    <div ref={ref} className="space-y-6 p-4">
      <h3 className="text-center text-xl font-bold">{results.test} Results</h3>
      {isFisherTest && (
        <div className="rounded-lg bg-yellow-50 p-3 text-center text-sm text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
          <FaInfoCircle className="mr-2 inline" />
          Fisher's Exact Test was used because the data did not meet the assumptions for a Chi-Square test.
        </div>
      )}
      <div className="space-y-2 rounded-lg border bg-gray-50 p-4 text-justify text-sm dark:border-gray-700 dark:bg-gray-900/50">
        <div className="flex items-start gap-2">
          {isSignificant ? <FaTimesCircle className="mt-0.5 flex-shrink-0 text-lg text-red-500" title="Rejected" /> : <FaCheckCircle className="mt-0.5 flex-shrink-0 text-lg text-green-500" title="Supported" />}
          <p><strong>Null Hypothesis (H₀):</strong> {results.nullHypothesis}</p>
        </div>
        <div className="flex items-start gap-2">
          {isSignificant ? <FaCheckCircle className="mt-0.5 flex-shrink-0 text-lg text-green-500" title="Supported" /> : <FaTimesCircle className="mt-0.5 flex-shrink-0 text-lg text-red-500" title="Rejected" />}
          <p><strong>Alternative Hypothesis (Hₐ):</strong> {results.alternativeHypothesis}</p>
        </div>
      </div>
      <div className={`rounded-lg p-4 text-center font-semibold ${isSignificant ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'}`}>
        {isSignificant ? `The analysis shows a statistically significant result (p < 0.05).` : `The analysis does not show a statistically significant result (p >= 0.05).`}
      </div>
      <h4 className="border-b-2 border-gray-200 pb-2 font-bold text-lg text-gray-700 dark:border-gray-700 dark:text-gray-300">Key Statistics</h4>

      {/* --- MODIFIED SECTION --- */}
      {/* This is the on-screen view, which we will hide during print/export */}
      <div className="hide-on-print">
        <div className={`grid grid-cols-2 gap-4 text-center ${isFisherTest ? 'md:grid-cols-3' : 'md:grid-cols-5'}`}>
          <StatDisplay label={isFisherTest ? "Odds Ratio" : "χ² Statistic"} value={results.statistic.toFixed(2)} />
          <StatDisplay label="p-value" value={results.pValue.toFixed(4)} />
          {!isFisherTest && <StatDisplay label="Degrees of Freedom" value={results.df.toFixed(0)} />}
          {results.cramersV !== undefined && results.cramersV !== null && (
            <CramersVStatDisplay value={results.cramersV.toFixed(4)} />
          )}
          <StatDisplay label="Sample Size (N)" value={results.sampleSize} />
        </div>
      </div>

      {/* This is the new, simplified table for print/export only. It's hidden on screen by default. */}
      <div className="show-on-print hidden">
        <table className="print-stats-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {keyStatsForTable.map(stat => (
              <tr key={stat.label}>
                <td>{stat.label}</td>
                <td>{stat.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* --- END MODIFIED SECTION --- */}

      <h4 className="border-b-2 border-gray-200 pb-2 font-bold text-lg text-gray-700 dark:border-gray-700 dark:text-gray-300">{frequencyHeading}</h4>
      <ObservedFrequencyTable results={results} />
      <h4 className="border-b-2 border-gray-200 pb-2 font-bold text-lg text-gray-700 dark:border-gray-700 dark:text-gray-300">Visualizations</h4>
      <ChiSquareDisplay results={results} />
      {!isFisherTest && (
        <div className="pt-4">
          <ChiSquareDistributionChart df={results.df} statistic={results.statistic} pValue={results.pValue} />
        </div>
      )}
      <div className="rounded-lg bg-cyan-100 p-3 text-sm text-cyan-900 dark:bg-cyan-950 dark:text-cyan-100">
        <p><strong>Interpretation:</strong> {results.interpretation}</p>
      </div>
    </div>
  );
});

export default StatsResultsPanel;