import axios from 'axios';
import Project from '../models/Project.js';

const PYTHON_API_URL = process.env.PYTHON_API_URL;

/**
 * Main controller to handle Chi-Square test requests. It validates the request,
 * fetches project data, routes to the appropriate data preparation function based on the
 * test subtype, and then either runs assumption validation or forwards the prepared
 * data to a Python microservice for statistical computation.
 * @param {object} req - The Express request object.
 * @param {object} req.body - The body of the request containing test parameters.
 * @param {string} req.body.projectId - The ID of the project to analyze.
 * @param {string} req.body.testType - The type of statistical test (must be 'chi-square').
 * @param {boolean} [req.body.validateOnly] - If true, only performs assumption checks.
 * @param {string} req.body.chiSquareSubtype - The specific subtype of Chi-Square test.
 * @param {object} res - The Express response object.
 * @returns {Promise<void>} A promise that resolves when the response is sent.
 */
export const runTest = async (req, res) => {
  const { projectId, testType, validateOnly, chiSquareSubtype } = req.body;

  if (testType !== 'chi-square') {
    return res.status(400).json({ message: `Unsupported test type: ${testType}. Only 'chi-square' is supported.` });
  }

  try {
    const project = await Project.findById(projectId).lean();
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

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

    if (validateOnly) {
      const validationResults = performAssumptionChecks(preparedData, subtype);
      return res.status(200).json({ validationResults });
    }

    const pythonPayload = {
      testType: 'chi-square',
      subtype: subtype,
      ...preparedData
    };

    const { data: responseData } = await axios.post(PYTHON_API_URL, pythonPayload);

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
    console.error("Error in runTest controller:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'An error occurred during the analysis.'
    });
  }
};

/**
 * Merges rows of a contingency table based on user-defined code combinations.
 * It sums the counts of original codes into new, combined rows and preserves any
 * codes that were not part of a combination.
 * @param {number[][]} originalObserved - The original 2D array of observed frequencies.
 * @param {string[]} originalRowLabels - The array of names corresponding to the original rows.
 * @param {string[]} originalCodeIds - The array of IDs corresponding to the original rows.
 * @param {object[]} combinations - An array of combination objects defining how to group codes.
 * @param {string} combinations[].newName - The name for the new combined row.
 * @param {string[]} combinations[].originalCodeIds - The code IDs to be merged into this group.
 * @returns {{observed: number[][], rowLabels: string[], codeIds: string[]}} An object with the new table, labels, and IDs.
 */
function applyCodeCombinations(originalObserved, originalRowLabels, originalCodeIds, combinations) {
  if (!combinations || combinations.length === 0) {
    return { observed: originalObserved, rowLabels: originalRowLabels, codeIds: originalCodeIds };
  }

  const newRowLabels = [];
  const newCodeIds = [];

  const originalCodeIdToIndexMap = new Map(originalCodeIds.map((id, index) => [id, index]));

  const numCols = originalObserved[0]?.length || 0;
  const newObserved = [];

  const usedOriginalCodeIds = new Set();

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
 * Prepares data for a Chi-Square Goodness-of-Fit test by calculating observed
 * frequencies of codes within a specified set of documents.
 * @param {object} body - The request body containing test parameters.
 * @param {string[]} body.codes - An array of code IDs to be included in the test.
 * @param {string[]} body.docList - An array of document IDs to source data from.
 * @param {object} [body.distribution] - The expected distribution parameters.
 * @param {object} project - The full project object from the database.
 * @returns {object} The prepared data object for the Goodness-of-Fit test.
 */
function prepareGofTest(body, project) {
  const { codes, docList, distribution } = body;
  const documents = project.importedFiles.filter(doc => docList.includes(doc._id.toString()));
  const observed = buildGofObserved(documents, project.codedSegments, codes);
  const categoryLabels = codes.map(id => project.codeDefinitions.find(c => c._id.toString() === id)?.name || id);

  return {
    observed,
    codes,
    categoryLabels,
    distribution
  };
}

/**
 * Prepares data for a Chi-Square Test of Independence by building a contingency table
 * of codes versus documents. It also handles optional code combinations.
 * @param {object} body - The request body containing test parameters.
 * @param {string[]} body.indepCodes - An array of code IDs (rows).
 * @param {string[]} body.indepDocs - An array of document IDs (columns).
 * @param {object[]} [body.codeCombinations] - Optional groupings for code rows.
 * @param {object} project - The full project object from the database.
 * @returns {object} The prepared data object for the Test of Independence.
 */
function prepareIndependenceTest(body, project) {
  const { indepCodes, indepDocs, codeCombinations } = body;
  const documents = project.importedFiles.filter(doc => indepDocs.includes(doc._id.toString()));
  const originalObserved = buildContingencyTable(documents, project.codedSegments, indepCodes);
  const originalRowLabels = indepCodes.map(id => project.codeDefinitions.find(c => c._id.toString() === id)?.name || 'Unknown Code');

  const { observed, rowLabels } = applyCodeCombinations(originalObserved, originalRowLabels, indepCodes, codeCombinations);

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
 * Prepares data for a Chi-Square Test of Homogeneity by building a contingency
 * table of codes versus user-defined document groups. It also handles optional
 * code combinations.
 * @param {object} body - The request body containing test parameters.
 * @param {string[]} body.homoCodes - An array of code IDs (rows).
 * @param {object} body.homoDocGroups - An object where keys are group names and values are arrays of document IDs.
 * @param {object[]} [body.codeCombinations] - Optional groupings for code rows.
 * @param {object} project - The full project object from the database.
 * @returns {object} The prepared data object for the Test of Homogeneity.
 */
function prepareHomogeneityTest(body, project) {
  const { homoCodes, homoDocGroups, codeCombinations } = body;
  const groupNames = Object.keys(homoDocGroups);

  const docIdToGroupMap = new Map();
  groupNames.forEach(groupName => {
    homoDocGroups[groupName].forEach(docId => {
      docIdToGroupMap.set(docId, groupName);
    });
  });

  const originalObserved = buildGroupedContingencyTable(project.codedSegments, homoCodes, groupNames, docIdToGroupMap);
  const originalRowLabels = homoCodes.map(id => project.codeDefinitions.find(c => c._id.toString() === id)?.name || 'Unknown Code');

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
 * Safely extracts a string ID from a code definition, which could be an object or a string.
 * @param {object|string} codeDefinition - The code definition from a coded segment.
 * @returns {string|null} The extracted code ID as a string, or null.
 */
function extractCodeId(codeDefinition) {
  if (!codeDefinition) return null;
  if (typeof codeDefinition === 'string') return codeDefinition;
  if (codeDefinition._id) return codeDefinition._id.toString();
  return codeDefinition.toString();
}

/**
 * Safely extracts a string ID from a file ID, which could be an object or a string.
 * @param {object|string} fileId - The file ID from a coded segment.
 * @returns {string|null} The extracted file ID as a string, or null.
 */
function extractFileId(fileId) {
  if (!fileId) return null;
  if (typeof fileId === 'string') return fileId;
  return fileId.toString();
}

/**
 * Builds a 1D array of observed frequencies for a Goodness-of-Fit test.
 * @param {object[]} documents - An array of document objects to consider.
 * @param {object[]} codedSegments - All coded segments in the project.
 * @param {string[]} codes - An array of code IDs to count.
 * @returns {number[]} A 1D array of observed counts corresponding to the `codes` array.
 */
function buildGofObserved(documents, codedSegments, codes) {
  if (!codedSegments || codedSegments.length === 0) return Array(codes.length).fill(0);
  const docIds = new Set(documents.map(d => d._id.toString()));
  const observedCounts = Array(codes.length).fill(0);
  const codeIndexMap = new Map(codes.map((codeId, index) => [codeId.toString(), index]));
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
 * Builds a 2D contingency table of code frequencies versus documents.
 * @param {object[]} documents - An array of document objects (columns).
 * @param {object[]} codedSegments - All coded segments in the project.
 * @param {string[]} codes - An array of code IDs (rows).
 * @returns {number[][]} A 2D array representing the contingency table.
 */
function buildContingencyTable(documents, codedSegments, codes) {
  const docIndexMap = new Map(documents.map((doc, i) => [doc._id.toString(), i]));
  const codeIndexMap = new Map(codes.map((code, i) => [code.toString(), i]));
  const table = Array(codes.length).fill(0).map(() => Array(documents.length).fill(0));

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
 * Builds a 2D contingency table of code frequencies versus document groups.
 * @param {object[]} codedSegments - All coded segments in the project.
 * @param {string[]} codes - An array of code IDs (rows).
 * @param {string[]} groupNames - An array of document group names (columns).
 * @param {Map<string, string>} docIdToGroupMap - A map linking document IDs to group names.
 * @returns {number[][]} A 2D array representing the grouped contingency table.
 */
function buildGroupedContingencyTable(codedSegments, codes, groupNames, docIdToGroupMap) {
  const codeIndexMap = new Map(codes.map((codeId, i) => [codeId.toString(), i]));
  const groupIndexMap = new Map(groupNames.map((name, i) => [name, i]));
  const table = Array(codes.length).fill(0).map(() => Array(groupNames.length).fill(0));

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
 * Performs assumption checks for Chi-Square tests based on the test subtype.
 * @param {object} data - The prepared data object from a preparation helper.
 * @param {string} subtype - The Chi-Square test subtype ('goodness-of-fit', etc.).
 * @returns {object} An object containing the status and messages for each assumption.
 */
function performAssumptionChecks(data, subtype) {
  const results = {
    independence: { status: 'passed', message: 'This assumption requires that each unit of observation is independent. You confirmed this in the previous step.' },
    categorical: { status: 'passed', message: 'The data inherently satisfies this requirement, as codes represent categorical variables.' },
    randomSampling: { status: 'pending', message: 'This is a methodological assumption. For results to be generalizable, your data should represent a random sample from the population.' },
    expectedFrequency: { status: 'pending', message: 'Run validation to check expected frequencies.' }
  };

  if (subtype === 'goodness-of-fit') {
    checkGofAssumptions(data, results);
  } else if (subtype === 'independence' || subtype === 'homogeneity' || subtype === 'fishers-exact') {
    checkContingencyAssumptions(data, results);
  }

  return results;
}

/**
 * Checks the expected frequency assumption for a Goodness-of-Fit test.
 * It calculates expected counts and warns if any are below 5.
 * @param {object} data - The prepared data for the test.
 * @param {object} results - The results object to be mutated with check outcomes.
 * @returns {void}
 */
function checkGofAssumptions(data, results) {
  const { observed, categoryLabels, distribution, codes } = data;
  const total = observed.reduce((sum, val) => sum + val, 0);

  if (observed.length < 2) {
    results.expectedFrequency = { status: 'warning', message: 'At least two categories are required.' };
    return;
  }
  if (total === 0) {
    results.expectedFrequency = { status: 'warning', message: 'No coded segments found for the selected items.' };
    return;
  }

  let expectedCounts;
  if (distribution?.type === 'custom') {
    const proportions = codes.map(codeId => (parseFloat(distribution.proportions[codeId]) || 0) / 100);
    expectedCounts = proportions.map(p => total * p);
  } else {
    expectedCounts = Array(observed.length).fill(total / observed.length);
  }

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
 * Checks the expected frequency assumption for contingency table-based tests.
 * It calculates the expected frequency for each cell and warns if too many
 * cells have low counts (below 5 or below 1).
 * @param {object} data - The prepared data for the test.
 * @param {object} results - The results object to be mutated with check outcomes.
 * @returns {void}
 */
function checkContingencyAssumptions(data, results) {
  const { observed, rowLabels, colLabels, originalCodeIdsForValidation, originalRowLabelsForValidation } = data;

  if (!observed || observed.length === 0 || observed[0].length === 0) {
    results.expectedFrequency = { status: 'warning', message: 'Contingency table could not be built. Check your selections.' };
    return;
  }

  const rowTotals = observed.map(row => row.reduce((sum, val) => sum + val, 0));
  const colTotals = observed[0].map((_, colIndex) => observed.reduce((sum, row) => sum + row[colIndex], 0));
  const grandTotal = rowTotals.reduce((sum, val) => sum + val, 0);

  if (grandTotal === 0) {
    results.expectedFrequency = { status: 'warning', message: 'No data found for the selected items, resulting in a table of zeros.' };
    return;
  }

  const expected = observed.map((row, i) =>
    row.map((_, j) => (rowTotals[i] * colTotals[j]) / grandTotal)
  );

  let cellsLessThanFive = 0;
  let cellsLessThanOne = 0;
  const totalCells = expected.length * expected[0].length;

  expected.forEach(row => {
    row.forEach(cell => {
      if (cell < 1) cellsLessThanOne++;
      if (cell < 5) cellsLessThanFive++;
    });
  });

  const percentLessThanFive = (cellsLessThanFive / totalCells) * 100;
  const details = {
    observed, expected, rowLabels, colLabels, rowTotals, colTotals, grandTotal,
    originalCodeIds: originalCodeIdsForValidation,
    originalRowLabels: originalRowLabelsForValidation
  };

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