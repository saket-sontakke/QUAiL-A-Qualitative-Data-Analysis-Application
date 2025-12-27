import axios from 'axios';
import Project from '../models/Project.js';

/**
 * The base URL endpoint for the external Python API service.
 * Retrieved from the runtime environment variables.
 *
 * @type {string}
 */
const PYTHON_API_URL = process.env.PYTHON_API_URL;

/**
 * Orchestrates the execution of Chi-Square statistical tests by preparing project data
 * and delegating the computation to an external Python analysis service.
 *
 * @param {Object} req - The Express request object containing the test parameters.
 * @param {string} req.body.projectId - The unique identifier of the project to analyze.
 * @param {string} req.body.testType - The major category of the test (must be 'chi-square').
 * @param {boolean} [req.body.validateOnly] - If true, runs assumption checks without performing the full statistical analysis.
 * @param {string} req.body.chiSquareSubtype - The specific variant of the test (e.g., 'goodness-of-fit', 'independence', 'homogeneity', 'fishers-exact').
 * @param {Object} res - The Express response object used to return results or error messages.
 * @returns {Promise<void>} Sends a JSON response containing either validation results or the computed statistical data.
 */
export const runTest = async (req, res) => {
  const { projectId, testType, validateOnly, chiSquareSubtype } = req.body;

  // --- Input Validation ---
  if (testType !== 'chi-square') {
    return res.status(400).json({ message: `Unsupported test type: ${testType}. Only 'chi-square' is supported.` });
  }

  try {
    // --- Project Retrieval ---
    const project = await Project.findById(projectId).lean();
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // --- Data Preparation Strategy ---
    let preparedData;
    const subtype = chiSquareSubtype;

    if (subtype === 'goodness-of-fit') {
      preparedData = prepareGofTest(req.body, project);
    } else if (subtype === 'independence' || subtype === 'homogeneity' || subtype === 'fishers-exact') {
      if (subtype === 'homogeneity' || (subtype === 'fishers-exact' && req.body.homoDocGroups)) {
        preparedData = prepareHomogeneityTest(req.body, project);
      } else {
        preparedData = prepareIndependenceTest(req.body, project);
      }
    } else {
      throw new Error(`Invalid Chi-Square subtype provided: ${subtype}`);
    }

    // --- Validation Mode Handling ---
    if (validateOnly) {
      const validationResults = performAssumptionChecks(preparedData, subtype);
      return res.status(200).json({ validationResults });
    }

    // --- External Analysis Execution ---
    const pythonPayload = {
      testType: 'chi-square',
      subtype: subtype,
      ...preparedData
    };

    const { data: responseData } = await axios.post(PYTHON_API_URL, pythonPayload);

    // --- Response Parsing & Validation ---
    let data = responseData;

    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        console.error("Failed to parse JSON response from Python service:", data);
        throw new Error("Received malformed data from the analysis service.");
      }
    }

    if (!data || typeof data !== 'object') {
      console.error("Response is not a valid object:", data);
      throw new Error("Received invalid data structure from the analysis service.");
    }

    if (data.statistic === null || data.statistic === undefined) {
      console.log("Statistic is null/undefined, which is acceptable for certain edge cases");
    }

    if (data.pValue === null || data.pValue === undefined) {
      console.error("p-value is null/undefined, which indicates a calculation error");
      throw new Error("Statistical calculation failed - invalid p-value returned.");
    }

    // --- Post-Processing ---
    if (subtype === 'fishers-exact') {
      data.subtype = 'Independence';
      if (data.df !== 'N/A' && data.df != null) {
        data.df = parseInt(data.df, 10);
      } else {
        data.df = 0;
      }
    }

    res.status(200).json(data);

  } catch (error) {
    // --- Error Handling ---
    console.error("Error in runTest controller:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'An error occurred during the analysis.'
    });
  }
};

/**
 * Aggregates specific rows in a dataset based on provided combination rules.
 * Rows specified in the combinations are summed into new grouped rows, while
 * any rows not included in a combination are preserved in their original state.
 *
 * @param {Array<Array<number>>} originalObserved - The source 2D matrix of observed values (rows x columns).
 * @param {string[]} originalRowLabels - Array of labels corresponding to the rows in the source matrix.
 * @param {string[]} originalCodeIds - Array of unique identifiers for each row in the source matrix.
 * @param {Array<{newName: string, originalCodeIds: string[]}>} combinations - Array of objects defining how rows should be grouped.
 * @returns {{observed: Array<Array<number>>, rowLabels: string[], codeIds: string[]}} An object containing the new matrix, labels, and IDs.
 */
function applyCodeCombinations(originalObserved, originalRowLabels, originalCodeIds, combinations) {
  // --- Validation & Early Exit ---
  if (!combinations || combinations.length === 0) {
    return { observed: originalObserved, rowLabels: originalRowLabels, codeIds: originalCodeIds };
  }

  // --- Initialization & Mapping ---
  const newRowLabels = [];
  const newCodeIds = [];

  const originalCodeIdToIndexMap = new Map(originalCodeIds.map((id, index) => [id, index]));

  const numCols = originalObserved[0]?.length || 0;
  const newObserved = [];

  const usedOriginalCodeIds = new Set();

  // --- Process Combinations (Aggregation) ---
  combinations.forEach((combo, index) => {
    newRowLabels.push(combo.newName);
    newCodeIds.push(`group_${index}_${combo.newName}`);
    const newRow = Array(numCols).fill(0);

    combo.originalCodeIds.forEach(originalCodeId => {
      if (originalCodeIdToIndexMap.has(originalCodeId)) {
        const originalRowIndex = originalCodeIdToIndexMap.get(originalCodeId);
        for (let col = 0; col < numCols; col++) {
          newRow[col] += originalObserved[originalRowIndex][col];
        }
        usedOriginalCodeIds.add(originalCodeId);
      }
    });
    newObserved.push(newRow);
  });

  // --- Process Remaining (Uncombined) Rows ---
  originalCodeIds.forEach((originalId, originalIndex) => {
    if (!usedOriginalCodeIds.has(originalId)) {
      newRowLabels.push(originalRowLabels[originalIndex]);
      newCodeIds.push(originalId);
      newObserved.push(originalObserved[originalIndex]);
    }
  });

  return { observed: newObserved, rowLabels: newRowLabels, codeIds: newCodeIds };
}

/**
 * Prepares the necessary data structures to perform a Goodness of Fit (GoF) test.
 * This function aggregates observed frequencies from selected documents and resolves
 * code identifiers to human-readable labels for the analysis.
 *
 * @param {Object} body - The input payload containing test parameters.
 * @param {string[]} body.codes - An array of code IDs to be included in the test.
 * @param {string[]} body.docList - An array of document IDs to filter the analysis by.
 * @param {string} body.distribution - The type of theoretical distribution to compare against.
 * @param {Object} project - The full project object containing files, segments, and definitions.
 * @returns {Object} The formatted data object required to run the GoF test, including observed counts and labels.
 */
function prepareGofTest(body, project) {
  // --- Input Extraction ---
  const { codes, docList, distribution } = body;

  // --- Document Filtering ---
  const documents = project.importedFiles.filter(doc => docList.includes(doc._id.toString()));

  // --- Observed Frequency Calculation ---
  const observed = buildGofObserved(documents, project.codedSegments, codes);

  // --- Label Resolution ---
  const categoryLabels = codes.map(id => project.codeDefinitions.find(c => c._id.toString() === id)?.name || id);

  return {
    observed,
    codes,
    categoryLabels,
    distribution
  };
}

/**
 * Prepares the contingency table and associated labels for an independence test
 * based on the provided project data and user selections.
 *
 * @param {Object} body - The request body containing test configuration.
 * @param {string[]} body.indepCodes - Array of code IDs to include in the test.
 * @param {string[]} body.indepDocs - Array of document IDs to include in the test.
 * @param {Object} body.codeCombinations - Configuration for merging or grouping codes.
 * @param {Object} project - The full project object containing files and definitions.
 * @param {Array} project.importedFiles - List of files imported into the project.
 * @param {Array} project.codedSegments - List of all coded segments in the project.
 * @param {Array} project.codeDefinitions - Definitions of codes including IDs and names.
 * @returns {Object} An object containing the observed frequencies matrix, row/column labels, and validation data.
 */
function prepareIndependenceTest(body, project) {
  // --- Data Extraction & Initial Table Construction ---
  const { indepCodes, indepDocs, codeCombinations } = body;
  const documents = project.importedFiles.filter(doc => indepDocs.includes(doc._id.toString()));
  const originalObserved = buildContingencyTable(documents, project.codedSegments, indepCodes);
  const originalRowLabels = indepCodes.map(id => project.codeDefinitions.find(c => c._id.toString() === id)?.name || 'Unknown Code');

  // --- Code Combination Processing ---
  const { observed, rowLabels } = applyCodeCombinations(originalObserved, originalRowLabels, indepCodes, codeCombinations);

  // --- Label Generation & Final Output ---
  const colLabels = documents.map(doc => doc.name || 'Unknown Document');

  return {
    observed,
    rowLabels,
    colLabels,
    originalCodeIdsForValidation: indepCodes,
    originalRowLabelsForValidation: originalRowLabels
  };
}

/**
 * Prepares the observed data matrix and labels for a homogeneity test.
 * Maps documents to groups, builds an initial contingency table, and applies
 * any requested code combinations to format the final dataset.
 *
 * @param {Object} body - The configuration object for the test.
 * @param {string[]} body.homoCodes - Array of code IDs to be analyzed.
 * @param {Object.<string, string[]>} body.homoDocGroups - Dictionary mapping group names to arrays of document IDs.
 * @param {Object[]} body.codeCombinations - Rules for combining or merging specific codes.
 * @param {Object} project - The full project data object.
 * @param {Object[]} project.codedSegments - Array of segment objects containing coding data.
 * @param {Object[]} project.codeDefinitions - Array of code definition objects used for label lookup.
 * @returns {Object} An object containing the final observed matrix, row/column labels, and original validation data.
 */
function prepareHomogeneityTest(body, project) {
  const { homoCodes, homoDocGroups, codeCombinations } = body;
  const groupNames = Object.keys(homoDocGroups);

  // --- Document to Group Mapping ---
  const docIdToGroupMap = new Map();
  groupNames.forEach(groupName => {
    homoDocGroups[groupName].forEach(docId => {
      docIdToGroupMap.set(docId, groupName);
    });
  });

  // --- Initial Contingency Table Generation ---
  const originalObserved = buildGroupedContingencyTable(project.codedSegments, homoCodes, groupNames, docIdToGroupMap);
  const originalRowLabels = homoCodes.map(id => project.codeDefinitions.find(c => c._id.toString() === id)?.name || 'Unknown Code');

  // --- Code Combination Processing ---
  const { observed, rowLabels } = applyCodeCombinations(originalObserved, originalRowLabels, homoCodes, codeCombinations);

  const colLabels = groupNames;

  return {
    observed,
    rowLabels,
    colLabels,
    originalCodeIdsForValidation: homoCodes,
    originalRowLabelsForValidation: originalRowLabels
  };
}

/**
 * Extracts the unique identifier string from a provided code definition input.
 * Handles cases where the input is already an ID string or an object containing an `_id` property.
 *
 * @param {string|Object|null} codeDefinition - The code definition object or ID string to process.
 * @returns {string|null} The extracted ID as a string, or null if the input is falsy.
 */
function extractCodeId(codeDefinition) {
  // --- Input Validation ---
  if (!codeDefinition) return null;

  // --- ID Extraction ---
  if (typeof codeDefinition === 'string') return codeDefinition;
  if (codeDefinition._id) return codeDefinition._id.toString();

  // --- Fallback Conversion ---
  return codeDefinition.toString();
}

/**
 * Normalizes a file identifier input to ensure it is returned as a string.
 *
 * @param {string|number|Object} fileId - The raw file identifier to process.
 * @returns {string|null} The file identifier as a string, or null if the input is falsy.
 */
function extractFileId(fileId) {
  // --- Validation ---
  if (!fileId) return null;

  // --- Type Normalization ---
  if (typeof fileId === 'string') return fileId;
  return fileId.toString();
}

/**
 * Calculates the observed frequency counts for a specific set of codes across a given list of documents.
 * This is typically used for Goodness-of-Fit (GoF) calculations or frequency distribution analysis.
 *
 * @param {Array<Object>} documents - An array of document objects to be included in the analysis (must contain `_id`).
 * @param {Array<Object>} codedSegments - An array of coded segment objects containing code definitions and file references.
 * @param {Array<string|Object>} codes - An array of unique code identifiers to count occurrences for.
 * @returns {Array<number>} An array of integers where each index corresponds to the count of the code at the same index in the `codes` array.
 */
function buildGofObserved(documents, codedSegments, codes) {
  // --- Input Validation ---
  if (!codedSegments || codedSegments.length === 0) return Array(codes.length).fill(0);

  // --- Initialization & Lookup Construction ---
  const docIds = new Set(documents.map(d => d._id.toString()));
  const observedCounts = Array(codes.length).fill(0);
  const codeIndexMap = new Map(codes.map((codeId, index) => [codeId.toString(), index]));

  // --- Frequency Aggregation ---
  for (const segment of codedSegments) {
    const codeId = extractCodeId(segment.codeDefinition);
    const fileId = extractFileId(segment.fileId);
    if (docIds.has(fileId) && codeIndexMap.has(codeId)) {
      const index = codeIndexMap.get(codeId);
      observedCounts[index]++;
    }
  }

  return observedCounts;
}

/**
 * Constructs a contingency table (matrix) representing the frequency of codes applied to documents.
 * Rows correspond to codes, and columns correspond to documents.
 *
 * @param {Array<Object>} documents - An array of document objects, each containing an `_id`.
 * @param {Array<Object>} codedSegments - An array of segment objects containing `fileId` and `codeDefinition`.
 * @param {Array<string>} codes - An array of unique code identifiers.
 * @returns {Array<Array<number>>} A 2D array (matrix) where cell [i][j] contains the count of code i in document j.
 */
function buildContingencyTable(documents, codedSegments, codes) {
  // --- Index Mapping ---
  const docIndexMap = new Map(documents.map((doc, i) => [doc._id.toString(), i]));
  const codeIndexMap = new Map(codes.map((code, i) => [code.toString(), i]));

  // --- Table Initialization ---
  const table = Array(codes.length).fill(0).map(() => Array(documents.length).fill(0));

  // --- Data Aggregation ---
  for (const segment of codedSegments) {
    const docId = extractFileId(segment.fileId);
    const codeId = extractCodeId(segment.codeDefinition);

    if (docIndexMap.has(docId) && codeIndexMap.has(codeId)) {
      const rowIndex = codeIndexMap.get(codeId);
      const colIndex = docIndexMap.get(docId);
      table[rowIndex][colIndex]++;
    }
  }

  return table;
}

/**
 * Constructs a grouped contingency table (matrix) representing the frequency of codes across different document groups.
 *
 * @param {Array<Object>} codedSegments - An array of segment objects containing file IDs and code definitions.
 * @param {Array<string|number>} codes - An array of code identifiers representing the rows of the table.
 * @param {Array<string>} groupNames - An array of group names representing the columns of the table.
 * @param {Map<string, string>} docIdToGroupMap - A Map associating document file IDs with their corresponding group names.
 * @returns {Array<Array<number>>} A 2D array (matrix) where each cell [row][col] contains the count of a specific code within a specific group.
 */
function buildGroupedContingencyTable(codedSegments, codes, groupNames, docIdToGroupMap) {
  // --- Initialization ---
  const codeIndexMap = new Map(codes.map((codeId, i) => [codeId.toString(), i]));
  const groupIndexMap = new Map(groupNames.map((name, i) => [name, i]));
  const table = Array(codes.length).fill(0).map(() => Array(groupNames.length).fill(0));

  // --- Aggregation ---
  for (const segment of codedSegments) {
    const fileId = extractFileId(segment.fileId);
    const codeId = extractCodeId(segment.codeDefinition);
    const groupName = docIdToGroupMap.get(fileId);

    if (groupName && codeIndexMap.has(codeId)) {
      const rowIndex = codeIndexMap.get(codeId);
      const colIndex = groupIndexMap.get(groupName);
      table[rowIndex][colIndex]++;
    }
  }
  return table;
}

/**
 * Orchestrates assumption checks for statistical tests based on the provided data and test subtype.
 * Initializes a default results object and delegates specific validation logic to helper functions.
 *
 * @param {Object} data - The dataset or observation units to be analyzed.
 * @param {string} subtype - The specific type of statistical test (e.g., 'goodness-of-fit', 'independence').
 * @returns {Object} An object containing the status and messages for various statistical assumptions.
 */
function performAssumptionChecks(data, subtype) {
  // --- Initialization ---
  const results = {
    independence: { status: 'passed', message: 'This assumption requires that each unit of observation is independent. You confirmed this in the previous step.' },
    categorical: { status: 'passed', message: 'The data inherently satisfies this requirement, as codes represent categorical variables.' },
    randomSampling: { status: 'pending', message: 'This is a methodological assumption. For results to be generalizable, your data should represent a random sample from the population.' },
    expectedFrequency: { status: 'pending', message: 'Run validation to check expected frequencies.' }
  };

  // --- Subtype-Specific Validation ---
  if (subtype === 'goodness-of-fit') {
    checkGofAssumptions(data, results);
  } else if (subtype === 'independence' || subtype === 'homogeneity' || subtype === 'fishers-exact') {
    checkContingencyAssumptions(data, results);
  }

  return results;
}

/**
 * Validates statistical assumptions for a Chi-Square Goodness of Fit test.
 * Checks for minimum category counts, non-zero total observations, and 
 * verifies that expected frequencies meet the threshold (typically >= 5).
 * * @param {Object} data - The input data for the test.
 * @param {number[]} data.observed - Array of observed frequencies.
 * @param {string[]} data.categoryLabels - Array of labels corresponding to categories.
 * @param {Object} [data.distribution] - Distribution settings (type and custom proportions).
 * @param {string[]} data.codes - Array of code identifiers used for custom proportions.
 * @param {Object} results - The results object to be mutated with assumption checks.
 * @returns {void}
 */
function checkGofAssumptions(data, results) {
  const { observed, categoryLabels, distribution, codes } = data;
  const total = observed.reduce((sum, val) => sum + val, 0);

  // --- Basic Validation ---
  if (observed.length < 2) {
    results.expectedFrequency = { status: 'warning', message: 'At least two categories are required.' };
    return;
  }
  if (total === 0) {
    results.expectedFrequency = { status: 'warning', message: 'No coded segments found for the selected items.' };
    return;
  }

  // --- Expected Frequency Calculation ---
  let expectedCounts;
  if (distribution?.type === 'custom') {
    const proportions = codes.map(codeId => (parseFloat(distribution.proportions[codeId]) || 0) / 100);
    expectedCounts = proportions.map(p => total * p);
  } else {
    expectedCounts = Array(observed.length).fill(total / observed.length);
  }

  // --- Threshold Verification ---
  const lowCountCells = expectedCounts.filter(e => e < 5).length;
  if (lowCountCells > 0) {
    results.expectedFrequency = {
      status: 'warning',
      message: `${lowCountCells} categor${lowCountCells > 1 ? 'ies have' : 'y has'} an expected frequency below 5. This may reduce test accuracy.`,
      details: { observedCounts: observed, expectedCounts, categoryLabels, totalObservations: total, numCategories: observed.length }
    };
  } else {
    results.expectedFrequency = { status: 'passed', message: 'All categories have an expected frequency of 5 or greater.', details: { observedCounts: observed, expectedCounts, categoryLabels, totalObservations: total, numCategories: observed.length } };
  }
}

/**
 * Evaluates statistical assumptions for a contingency table, specifically checking
 * for expected frequency counts to ensure test reliability.
 *
 * This function calculates row and column totals, derives expected frequencies,
 * and identifies if cells fall below standard statistical thresholds (counts < 1 or < 5).
 * It mutates the `results` object with a warning or pass status based on these checks.
 *
 * @param {Object} data - The input data object.
 * @param {number[][]} data.observed - The 2D array representing the observed contingency table.
 * @param {string[]} data.rowLabels - Labels for the rows.
 * @param {string[]} data.colLabels - Labels for the columns.
 * @param {string[]} [data.originalCodeIdsForValidation] - Original IDs for validation purposes.
 * @param {string[]} [data.originalRowLabelsForValidation] - Original row labels for validation purposes.
 * @param {Object} results - The results object to be updated.
 * @param {Object} results.expectedFrequency - The output property where status and messages are stored.
 * @returns {void}
 */
function checkContingencyAssumptions(data, results) {
  const { observed, rowLabels, colLabels, originalCodeIdsForValidation, originalRowLabelsForValidation } = data;

  // --- Input Validation ---
  if (!observed || observed.length === 0 || observed[0].length === 0) {
    results.expectedFrequency = { status: 'warning', message: 'Contingency table could not be built. Check your selections.' };
    return;
  }

  // --- Total Calculations ---
  const rowTotals = observed.map(row => row.reduce((sum, val) => sum + val, 0));
  const colTotals = observed[0].map((_, colIndex) => observed.reduce((sum, row) => sum + row[colIndex], 0));
  const grandTotal = rowTotals.reduce((sum, val) => sum + val, 0);

  // --- Zero Data Check ---
  if (grandTotal === 0) {
    results.expectedFrequency = { status: 'warning', message: 'No data found for the selected items, resulting in a table of zeros.' };
    return;
  }

  // --- Expected Frequency Calculation ---
  const expected = observed.map((row, i) =>
    row.map((_, j) => (rowTotals[i] * colTotals[j]) / grandTotal)
  );

  // --- Threshold Analysis ---
  let cellsLessThanFive = 0;
  let cellsLessThanOne = 0;
  const totalCells = expected.length * expected[0].length;

  expected.forEach(row => {
    row.forEach(cell => {
      if (cell < 1) cellsLessThanOne++;
      if (cell < 5) cellsLessThanFive++;
    });
  });

  // --- Result Synthesis ---
  const percentLessThanFive = (cellsLessThanFive / totalCells) * 100;
  const details = {
    observed, expected, rowLabels, colLabels, rowTotals, colTotals, grandTotal,
    originalCodeIds: originalCodeIdsForValidation,
    originalRowLabels: originalRowLabelsForValidation
  };

  // --- Reliability Assessment ---
  if (cellsLessThanOne > 0) {
    details.suggestion = (observed.length === 2 && observed[0].length === 2) ? 'fishers' : 'combine';
    results.expectedFrequency = { status: 'warning', message: `Test is not reliable because ${cellsLessThanOne} cell(s) have an expected frequency below 1.`, details };
  } else if (percentLessThanFive > 20) {
    details.suggestion = (observed.length === 2 && observed[0].length === 2) ? 'fishers' : 'combine';
    results.expectedFrequency = { status: 'warning', message: `Test accuracy may be reduced because ${percentLessThanFive.toFixed(0)}% of cells have an expected frequency below 5.`, details };
  } else {
    results.expectedFrequency = { status: 'passed', message: 'The sample size is large enough. No more than 20% of cells have an expected frequency below 5, and none are below 1.', details };
  }
}