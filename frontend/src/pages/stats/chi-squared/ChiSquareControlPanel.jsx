import React, { useEffect } from 'react';
import SearchableMultiSelectDropdown from '../../components/SearchableMultiSelectDropdown.jsx';
import SearchableMultiCodeDropdown from '../../components/SearchableMultiCodeDropdown.jsx';
import { FaInfoCircle } from 'react-icons/fa';

/**
 * Renders the configuration inputs for a Chi-Square Test of Independence.
 * This test is used to determine if there is a significant association between
 * two categorical variables (in this case, Codes and Documents).
 *
 * @param {object} props - The component props.
 * @param {Array<object>} props.codeDefinitions - All available code definitions for the project.
 * @param {Array<string>} props.indepCodes - An array of IDs for the selected codes (rows).
 * @param {Function} props.setIndepCodes - The state setter function for the selected codes.
 * @param {object} props.project - The current project object, containing imported files.
 * @param {Array<string>} props.indepDocs - An array of IDs for the selected documents (columns).
 * @param {Function} props.setIndepDocs - The state setter function for the selected documents.
 * @returns {JSX.Element} The rendered panel for the Test of Independence.
 */
const IndependencePanel = ({ codeDefinitions, indepCodes, setIndepCodes, project, indepDocs, setIndepDocs }) => (
  <div className="space-y-5 animate-fade-in-up">
    <div className="text-left">
      <h3 className="text-xl font-bold">Chi-Square Test of Independence</h3>
      <p className="mt-1 text-sm text-gray-500">Tests for an association between two categorical variables (e.g., Codes and Documents).</p>
    </div>
    <hr className="dark:border-gray-600" />
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">① Codes</label>
        <SearchableMultiCodeDropdown codes={codeDefinitions} selectedCodeIds={indepCodes} onSelectionChange={setIndepCodes} placeholder="Select 2 or more codes..." />
        <p className="mt-1 text-xs text-gray-500">Select 2 or more codes to form the rows of the table.</p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">② Documents</label>
        <SearchableMultiSelectDropdown files={project.importedFiles} selectedFileIds={indepDocs} onSelectionChange={setIndepDocs} placeholder="Select 2 or more documents..." />
        <p className="mt-1 text-xs text-gray-500">Select 2 or more documents to form the columns of the table.</p>
      </div>
    </div>
  </div>
);

/**
 * Renders the configuration inputs for a Chi-Square Test for Homogeneity.
 * This test is used to determine if the distribution of a categorical variable
 * (Codes) is the same across different populations (groups of Documents).
 *
 * @param {object} props - The component props.
 * @param {Array<object>} props.codeDefinitions - All available code definitions.
 * @param {Array<string>} props.homoCodes - An array of IDs for the selected codes to analyze.
 * @param {Function} props.setHomoCodes - The state setter for selected codes.
 * @param {object} props.project - The current project object.
 * @param {number} props.homoNumGroups - The number of document groups to compare.
 * @param {Function} props.setHomoNumGroups - The state setter for the number of groups.
 * @param {object} props.homoDocGroups - An object where keys are group names and values are arrays of document IDs.
 * @param {Function} props.setHomoDocGroups - The state setter for the document groups.
 * @returns {JSX.Element} The rendered panel for the Test for Homogeneity.
 */
const HomogeneityPanel = ({ codeDefinitions, homoCodes, setHomoCodes, project, homoNumGroups, setHomoNumGroups, homoDocGroups, setHomoDocGroups }) => {
  useEffect(() => {
    const newGroups = {};
    const numGroups = parseInt(homoNumGroups, 10) || 2;

    for (let i = 0; i < numGroups; i++) {
      const groupName = `Group ${String.fromCharCode(65 + i)}`;
      newGroups[groupName] = homoDocGroups[groupName] || [];
    }
    setHomoDocGroups(newGroups);
  }, [homoNumGroups]);

  const allSelectedDocs = new Set(Object.values(homoDocGroups).flat());
  const maxGroups = project.importedFiles.length > 1 ? project.importedFiles.length - 1 : 1;

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="text-left">
        <h3 className="text-xl font-bold">Chi-Square Test for Homogeneity</h3>
        <p className="mt-1 text-sm text-gray-500">Compares the distribution of codes across two or more document groups.</p>
      </div>
      <hr className="dark:border-gray-600" />
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">① Codes</label>
          <SearchableMultiCodeDropdown codes={codeDefinitions} selectedCodeIds={homoCodes} onSelectionChange={setHomoCodes} placeholder="Select 2 or more codes..." />
          <p className="mt-1 text-xs text-gray-500">Select 2 or more codes to analyze.</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">② Number of Groups to Compare</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="2"
              max={maxGroups}
              value={homoNumGroups}
              onChange={(e) => setHomoNumGroups(Math.max(2, Math.min(maxGroups, parseInt(e.target.value, 10) || 2)))}
              className="w-24 rounded-md border p-2 dark:border-gray-600 dark:bg-gray-900"
            />
            <div className="group relative">
              <FaInfoCircle className="text-gray-400" />
              <div className="pointer-events-none absolute bottom-full mb-2 w-72 rounded-md bg-gray-800 p-2 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                When you create a separate group for each document, the Test for Homogeneity becomes mathematically identical to the Test of Independence.
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-3 pt-2">
          {Object.keys(homoDocGroups).map((groupName) => (
            <div key={groupName}>
              <label className="mb-1 block text-sm font-medium">{`③ ${groupName} Documents`}</label>
              <SearchableMultiSelectDropdown
                files={project.importedFiles}
                selectedFileIds={homoDocGroups[groupName]}
                onSelectionChange={(selection) => setHomoDocGroups(prev => ({ ...prev, [groupName]: selection }))}
                disabledFileIds={[...allSelectedDocs].filter(id => !homoDocGroups[groupName].includes(id))}
                placeholder="Select 1 or more documents..."
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Renders the configuration inputs for a Chi-Square Goodness-of-Fit Test.
 * This test is used to determine if the observed frequencies of codes match
 * an expected distribution (either uniform or custom-defined).
 *
 * @param {object} props - The component props.
 * @param {Array<object>} props.codeDefinitions - All available code definitions.
 * @param {Array<string>} props.gofCodes - An array of IDs for the selected codes to analyze.
 * @param {Function} props.setGofCodes - The state setter for selected codes.
 * @param {object} props.project - The current project object.
 * @param {Array<string>} props.gofDocs - An array of IDs for the selected documents to analyze.
 * @param {Function} props.setGofDocs - The state setter for selected documents.
 * @param {string} props.gofDistributionType - The type of expected distribution ('uniform' or 'custom').
 * @param {Function} props.setGofDistributionType - The state setter for the distribution type.
 * @param {object} props.gofCustomProportions - An object mapping code IDs to their expected percentage.
 * @param {Function} props.setGofCustomProportions - The state setter for custom proportions.
 * @returns {JSX.Element} The rendered panel for the Goodness-of-Fit Test.
 */
const GoodnessOfFitPanel = ({ codeDefinitions, gofCodes, setGofCodes, project, gofDocs, setGofDocs, gofDistributionType, setGofDistributionType, gofCustomProportions, setGofCustomProportions }) => {
  const totalProportion = gofDistributionType === 'custom'
    ? gofCodes.reduce((sum, codeId) => sum + (parseFloat(gofCustomProportions[codeId]) || 0), 0)
    : 100;

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="text-left">
        <h3 className="text-xl font-bold">Chi-Square Goodness-of-Fit Test</h3>
        <p className="mt-1 text-sm text-gray-500">Tests if codes appear at an expected frequency.</p>
      </div>
      <hr className="dark:border-gray-600" />
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">① Codes to Analyze</label>
          <SearchableMultiCodeDropdown codes={codeDefinitions} selectedCodeIds={gofCodes} onSelectionChange={setGofCodes} placeholder="Select 2 or more codes..." />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">② Expected Distribution</label>
          <div className="flex items-center space-x-4 rounded-md bg-white p-2 dark:bg-gray-700">
            <label><input type="radio" name="gof-dist" value="uniform" checked={gofDistributionType === 'uniform'} onChange={(e) => setGofDistributionType(e.target.value)} /> Uniform</label>
            <label><input type="radio" name="gof-dist" value="custom" checked={gofDistributionType === 'custom'} onChange={(e) => setGofDistributionType(e.target.value)} /> Custom</label>
          </div>
        </div>
        {gofDistributionType === 'custom' && gofCodes.length > 0 && (
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Custom Proportions</h4>
              <span className={`text-sm font-bold ${Math.abs(totalProportion - 100) > 0.001 ? 'text-red-600' : 'text-green-600'}`}>Total: {totalProportion.toFixed(1)}%</span>
            </div>
            {gofCodes.map(codeId => {
              const code = codeDefinitions.find(c => c._id === codeId);
              return (
                <div key={codeId} className="flex items-center justify-between gap-4">
                  <label htmlFor={`prop-${codeId}`} className="truncate text-sm">{code?.name}</label>
                  <div className="relative w-22">
                    <input 
                      id={`prop-${codeId}`} 
                      type="number" 
                      min="0" 
                      max="100" 
                      step="0.1" 
                      value={gofCustomProportions[codeId] || ''} 
                      onChange={(e) => setGofCustomProportions(p => ({ ...p, [codeId]: e.target.value }))} 
                      className="w-full rounded-md border-gray-300 py-1 pl-2 pr-5 text-black dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 hide-number-arrows" 
                      placeholder="e.g., 25" 
                    />

                    <span className="pointer-events-none absolute inset-y-0 right-6 flex items-center text-gray-500">%</span>
                    
                    <div className="absolute right-0 top-0 mr-1 flex h-full flex-col items-center justify-center">
                      <button 
                        onClick={() => setGofCustomProportions(p => ({ ...p, [codeId]: (Math.min(100, (parseFloat(p[codeId]) || 0) + 0.1)).toFixed(1) }))}
                        className="h-1/2 rounded-tr-sm px-1 text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" fill="currentColor" viewBox="0 0 16 16"><path d="M7.247 4.86l-4.796 5.481c-.566.647-.106 1.659.753 1.659h9.592a1 1 0 0 0 .753-1.659l-4.796-5.48a1 1 0 0 0-1.506 0z"/></svg>
                      </button>
                      <button 
                        onClick={() => setGofCustomProportions(p => ({ ...p, [codeId]: (Math.max(0, (parseFloat(p[codeId]) || 0) - 0.1)).toFixed(1) }))}
                        className="h-1/2 rounded-br-sm px-1 text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" fill="currentColor" viewBox="0 0 16 16"><path d="M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {Math.abs(totalProportion - 100) > 0.001 && <p className="text-center text-xs text-red-600">Proportions must add up to 100%.</p>}
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium">③ Document Group</label>
          <SearchableMultiSelectDropdown files={project.importedFiles} selectedFileIds={gofDocs} onSelectionChange={setGofDocs} placeholder="Select documents to analyze..." />
        </div>
      </div>
      <p className="pt-4 text-left text-sm text-gray-500">Select variables and documents, then validate your data to check assumptions.</p>
    </div>
  );
};

/**
 * A control panel that dynamically renders the appropriate configuration UI
 * based on the selected Chi-Square test type.
 *
 * @param {object} props - The component props, including all props for the child panels.
 * @param {string} props.testType - The type of test to display ('independence', 'homogeneity', 'goodness-of-fit').
 * @returns {JSX.Element} The rendered control panel for the selected test.
 */
const ChiSquareControlPanel = ({
  testType,
  project,
  codeDefinitions,
  gofCodes,
  setGofCodes,
  gofDocs,
  setGofDocs,
  gofDistributionType,
  setGofDistributionType,
  gofCustomProportions,
  setGofCustomProportions,
  indepCodes,
  setIndepCodes,
  indepDocs,
  setIndepDocs,
  homoCodes,
  setHomoCodes,
  homoNumGroups,
  setHomoNumGroups,
  homoDocGroups,
  setHomoDocGroups,
}) => {
  switch (testType) {
    case 'independence':
      return <IndependencePanel
        project={project}
        codeDefinitions={codeDefinitions}
        indepCodes={indepCodes}
        setIndepCodes={setIndepCodes}
        indepDocs={indepDocs}
        setIndepDocs={setIndepDocs}
      />;
    case 'homogeneity':
      return <HomogeneityPanel
        project={project}
        codeDefinitions={codeDefinitions}
        homoCodes={homoCodes}
        setHomoCodes={setHomoCodes}
        homoNumGroups={homoNumGroups}
        setHomoNumGroups={setHomoNumGroups}
        homoDocGroups={homoDocGroups}
        setHomoDocGroups={setHomoDocGroups}
      />;
    case 'goodness-of-fit':
    default:
      return <GoodnessOfFitPanel
        project={project}
        codeDefinitions={codeDefinitions}
        gofCodes={gofCodes}
        setGofCodes={setGofCodes}
        gofDocs={gofDocs}
        setGofDocs={setGofDocs}
        gofDistributionType={gofDistributionType}
        setGofDistributionType={setGofDistributionType}
        gofCustomProportions={gofCustomProportions}
        setGofCustomProportions={setGofCustomProportions}
      />;
  }
};

export default ChiSquareControlPanel;