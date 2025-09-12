import { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../auth/AuthContext.jsx';

/**
 * A custom hook to manage the complex state, effects, and API interactions for the Statistical Analysis tab.
 * @param {object} props - The props for the hook.
 * @param {string} props.projectId - The ID of the current project.
 * @returns {object} An object containing the complete state and all handler functions required by the StatsView component.
 */
export const useStatsLogic = ({ projectId }) => {
  const { user } = useAuth();

  const [view, setView] = useState('summary');
  const [selectedChiSquareType, setSelectedChiSquareType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [isValidationRunning, setIsValidationRunning] = useState(false);
  const [validationStatus, setValidationStatus] = useState(null);
  const [showAssumptionsConfirm, setShowAssumptionsConfirm] = useState(false);
  const [areAssumptionsAcknowledged, setAreAssumptionsAcknowledged] = useState(false);
  const [showFisherConfirm, setShowFisherConfirm] = useState(false);
  const [codeCombinations, setCodeCombinations] = useState(null);

  const [gofCodes, setGofCodes] = useState([]);
  const [gofDocs, setGofDocs] = useState([]);
  const [gofDistributionType, setGofDistributionType] = useState('uniform');
  const [gofCustomProportions, setGofCustomProportions] = useState({});
  const [indepCodes, setIndepCodes] = useState([]);
  const [indepDocs, setIndepDocs] = useState([]);
  const [homoCodes, setHomoCodes] = useState([]);
  const [homoNumGroups, setHomoNumGroups] = useState(2);
  const [homoDocGroups, setHomoDocGroups] = useState({ "Group A": [], "Group B": [] });

  const resetChiSquareState = () => {
    setGofCodes([]);
    setGofDocs([]);
    setGofDistributionType('uniform');
    setGofCustomProportions({});
    setIndepCodes([]);
    setIndepDocs([]);
    setHomoCodes([]);
    setHomoNumGroups(2);
    setHomoDocGroups({ "Group A": [], "Group B": [] });
    setValidationStatus(null);
    setError(null);
    setResults(null);
    setCodeCombinations(null);
    setAreAssumptionsAcknowledged(false);
    setView('summary'); 
  };
  
  const handleStatsBack = () => {
    setError(null);

    if (results) {
      setResults(null);
      setValidationStatus(null);
      return;
    }

    switch (view) {
      case 'chi-square-config':
        setView('chi-square-type-selection');
        setResults(null);
        setValidationStatus(null);
        break;
      
      case 'chi-square-type-selection':
        setView('test-selection');
        break;
        
      case 'test-selection':
        setView('summary');
        break;
      
      default:
        return 'exit-stats';
    }
  };

  useEffect(() => {
    const resetOnChange = () => {
      setValidationStatus(null);
      setResults(null);
      setCodeCombinations(null);
    };
    resetOnChange();
  }, [gofCodes, gofDocs, gofDistributionType, gofCustomProportions, indepCodes, indepDocs, homoCodes, homoDocGroups, homoNumGroups]);
  
  const getChiSquarePayload = (testTypeOverride = null) => {
    let payload = { projectId, testType: 'chi-square' };
    const subtype = testTypeOverride || selectedChiSquareType;
    switch (selectedChiSquareType) {
      case 'goodness-of-fit':
        Object.assign(payload, { chiSquareSubtype: subtype, codes: gofCodes, docList: gofDocs, distribution: { type: gofDistributionType } });
        if (gofDistributionType === 'custom') payload.distribution.proportions = gofCustomProportions;
        break;
      case 'independence':
        Object.assign(payload, { chiSquareSubtype: subtype, indepCodes, indepDocs });
        break;
      case 'homogeneity':
        const validHomoDocGroups = Object.fromEntries(Object.entries(homoDocGroups).filter(([_, docs]) => docs.length > 0));
        Object.assign(payload, { chiSquareSubtype: subtype, homoCodes, homoDocGroups: validHomoDocGroups });
        break;
    }
    if (codeCombinations) {
      payload.codeCombinations = codeCombinations;
    }
    return payload;
  };

  const performValidation = async (combinations = codeCombinations) => {
    setIsValidationRunning(true);
    setError(null);
    try {
      const token = user?.token;
      if (!token) throw new Error("Authentication failed.");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const payload = { ...getChiSquarePayload(), validateOnly: true, codeCombinations: combinations };
      const { data } = await axios.post('/api/stats/run', payload, config);
      setValidationStatus({
        ...data.validationResults,
        independence: { status: 'passed', message: 'You confirmed that each document represents a distinct observation.' },
        randomSampling: { status: 'passed', message: 'You have acknowledged the considerations for generalizing findings.' }
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Validation failed.');
      setValidationStatus(prev => ({ ...prev, independence: { status: 'pending' }, randomSampling: { status: 'pending' } }));
    } finally {
      setIsValidationRunning(false);
    }
  };

  const handleRevalidateWithCombinations = (newCombinations) => {
    setCodeCombinations(newCombinations);
    performValidation(newCombinations);
  };

  const handleValidateTest = () => {
    setAreAssumptionsAcknowledged(false);
    setShowAssumptionsConfirm(true);
  };

  const handleConfirmAndProceedWithValidation = () => {
    setShowAssumptionsConfirm(false);
    performValidation(null);
  };

  const executeTestApi = async (testSubtype) => {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const token = user?.token;
      if (!token) throw new Error("Authentication failed.");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const payload = getChiSquarePayload(testSubtype);
      const { data } = await axios.post('/api/stats/run', payload, config);
      setResults(data);
      setValidationStatus(null);
    } catch (err) {
      setError(err.response?.data?.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleRunTest = (testSubtype) => {
    if (testSubtype === 'fishers-exact') {
      setShowFisherConfirm(true);
    } else {
      executeTestApi(testSubtype);
    }
  };
  
  const handleConfirmFisher = () => {
    setShowFisherConfirm(false);
    executeTestApi('fishers-exact');
  };

  const areChiSquareInputsIncomplete = useMemo(() => {
    switch (selectedChiSquareType) {
      case 'goodness-of-fit':
        if (gofCodes.length < 2 || gofDocs.length === 0) return true;
        if (gofDistributionType === 'custom') {
          if (gofCodes.some(codeId => !gofCustomProportions[codeId] || gofCustomProportions[codeId] === '')) return true;
          const total = gofCodes.reduce((sum, id) => sum + (parseFloat(gofCustomProportions[id]) || 0), 0);
          return Math.abs(total - 100) > 0.001;
        }
        return false;
      case 'independence':
        return indepCodes.length < 2 || indepDocs.length < 2;
      case 'homogeneity':
        if (homoCodes.length < 2) return true;
        const groups = Object.values(homoDocGroups);
        return groups.length < 2 || groups.some(g => g.length === 0);
      default:
        return true;
    }
  }, [selectedChiSquareType, gofCodes, gofDocs, gofDistributionType, gofCustomProportions, indepCodes, indepDocs, homoCodes, homoDocGroups]);

  const isValidationPassed = useMemo(() => {
    if (!validationStatus) return false;
    return Object.values(validationStatus).every(result => result.status === 'passed' || result.status === 'warning');
  }, [validationStatus]);

  return {
    view, setView,
    selectedChiSquareType, setSelectedChiSquareType,
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
    handleStatsBack,
    resetChiSquareState,
    handleRevalidateWithCombinations,
    handleValidateTest,
    handleConfirmAndProceedWithValidation,
    handleRunTest,
    handleConfirmFisher
  };
};