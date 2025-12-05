import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { FaTimes, FaArrowLeft, FaTable } from 'react-icons/fa';
import { useAuth } from './auth/AuthContext';

import ChiSquareTypeSelector from './chi-squared/ChiSquareTypeSelector.jsx';
import ChiSquareControlPanel from './chi-squared/ChiSquareControlPanel.jsx';
import StatsResultsPanel from './StatsResultsPanel.jsx';

/**
 * A presentational component for displaying a selectable statistical test type.
 * @param {object} props - The component props.
 * @param {JSX.Element} props.icon - The icon element representing the test.
 * @param {string} props.title - The title of the test.
 * @param {string} props.description - A brief description of the test.
 * @param {() => void} props.onClick - The callback function to execute on click.
 * @param {boolean} [props.disabled=false] - If true, the card is non-interactive.
 * @returns {JSX.Element} The rendered test selection card.
 */
const TestSelectionCard = ({ icon, title, description, onClick, disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all duration-300 ${disabled ? 'cursor-not-allowed opacity-60' : 'transform cursor-pointer hover:scale-105 hover:border-cyan-900 dark:hover:border-orange-500'}`}
    title={title}
  >
    <div className="mb-4 text-4xl text-cyan-900 dark:text-orange-500">{icon}</div>
    <span className="text-lg font-bold">{title}</span>
  </button>
);

/**
 * A comprehensive, multi-view modal for conducting statistical analyses. It
 * guides the user through selecting a test family (e.g., Chi-Squared), choosing
 * a specific test type, configuring variables, checking statistical assumptions,
 * and viewing the final results.
 *
 * @param {object} props - The component props.
 * @param {boolean} props.show - Controls the visibility of the modal.
 * @param {() => void} props.onClose - The callback function to close the modal.
 * @param {object} props.project - The current project data, including imported files.
 * @param {Array<object>} props.codeDefinitions - An array of all code definitions for the project.
 * @param {string} props.projectId - The ID of the current project.
 * @returns {JSX.Element|null} The rendered statistics modal or null if not shown.
 */
const StatsModal = ({ show, onClose, project, codeDefinitions, projectId }) => {
  const { user } = useAuth();
  const [view, setView] = useState('initial');
  const [selectedChiSquareType, setSelectedChiSquareType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [isValidationRunning, setIsValidationRunning] = useState(false);
  const [validationStatus, setValidationStatus] = useState(null);
  const [showIndependenceConfirm, setShowIndependenceConfirm] = useState(false);
  const [showRandomSamplingConfirm, setShowRandomSamplingConfirm] = useState(false);
  const [isIndependenceChecked, setIsIndependenceChecked] = useState(false);
  const [isSamplingAcknowledged, setIsSamplingAcknowledged] = useState(false);

  const [gofCodes, setGofCodes] = useState([]);
  const [gofDocs, setGofDocs] = useState([]);
  const [gofDistributionType, setGofDistributionType] = useState('uniform');
  const [gofCustomProportions, setGofCustomProportions] = useState({});

  const [indepCodes, setIndepCodes] = useState([]);
  const [indepDocs, setIndepDocs] = useState([]);

  const [homoCodes, setHomoCodes] = useState([]);
  const [homoNumGroups, setHomoNumGroups] = useState(2);
  const [homoDocGroups, setHomoDocGroups] = useState({ 0: [], 1: [] });

  useEffect(() => {
    const newGroups = {};
    const numGroups = parseInt(homoNumGroups, 10) || 2;
    for (let i = 0; i < numGroups; i++) {
      newGroups[i] = homoDocGroups[i] || [];
    }
    setHomoDocGroups(newGroups);
  }, [homoNumGroups]);

  const resetAllStates = () => {
    setGofCodes([]); setGofDocs([]); setGofDistributionType('uniform'); setGofCustomProportions({});
    setIndepCodes([]); setIndepDocs([]);
    setHomoCodes([]); setHomoNumGroups(2); setHomoDocGroups({ 0: [], 1: [] });
    setValidationStatus(null);
    setError(null);
    setResults(null);
  };

  useEffect(() => {
    if (validationStatus || results) {
      setValidationStatus(null);
      setResults(null);
    }
  }, [
    gofCodes, gofDocs, gofDistributionType, gofCustomProportions,
    indepCodes, indepDocs,
    homoCodes, homoDocGroups
  ]);

  const handleClose = () => {
    setView('initial');
    resetAllStates();
    onClose();
  };

  const handleBack = () => {
    resetAllStates();
    if (view === 'chi-square-config') {
      setView('chi-square-type-selection');
    } else if (view === 'chi-square-type-selection') {
      setView('initial');
    }
  };

  const handleChiSquareTypeSelect = (type) => {
    resetAllStates();
    setSelectedChiSquareType(type);
    setView('chi-square-config');
  };

  const getChiSquarePayload = () => {
    switch (selectedChiSquareType) {
      case 'goodness-of-fit':
        const gofPayload = {
          testType: 'chi-square',
          chiSquareSubtype: 'goodness-of-fit',
          codes: gofCodes,
          docList: gofDocs,
          distribution: { type: gofDistributionType }
        };
        if (gofDistributionType === 'custom') {
          gofPayload.distribution.proportions = gofCustomProportions;
        }
        return gofPayload;
      case 'independence':
        return {
          testType: 'chi-square',
          chiSquareSubtype: 'independence',
          indepCodes,
          indepDocs
        };
      case 'homogeneity':
        const validHomoDocGroups = Object.fromEntries(
          Object.entries(homoDocGroups).filter(([_, docs]) => docs.length > 0)
        );
        return {
          testType: 'chi-square',
          chiSquareSubtype: 'homogeneity',
          homoCodes,
          homoDocGroups: validHomoDocGroups
        };
      default:
        return null;
    }
  };

  const handleValidateTest = () => {
    setIsIndependenceChecked(false);
    setShowIndependenceConfirm(true);
  };

  const handleIndependenceConfirm = () => {
    setShowIndependenceConfirm(false);
    setIsSamplingAcknowledged(false);
    setShowRandomSamplingConfirm(true);
  };

  const handleConfirmAndProceedWithValidation = async () => {
    setShowRandomSamplingConfirm(false);
    setIsValidationRunning(true);
    setError(null);

    try {
      const token = user?.token;
      if (!token) throw new Error("Authentication token not found.");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const testPayload = getChiSquarePayload();
      const payload = { ...testPayload, projectId, validateOnly: true };
      const { data } = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/stats/run`, payload, config);

      setValidationStatus({
        ...data.validationResults,
        independence: { status: 'passed', message: 'You confirmed that observations are independent.' },
        randomSampling: { status: 'passed', message: 'You have acknowledged the considerations for random sampling.' }
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Validation failed.');
    } finally {
      setIsValidationRunning(false);
    }
  };

  const handleRunTest = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const token = user?.token;
      if (!token) throw new Error("Authentication token not found.");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const payload = { ...getChiSquarePayload(), projectId };
      const { data } = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/stats/run`, payload, config);
      setResults(data);
      setValidationStatus(null);
    } catch (err) {
      setError(err.response?.data?.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const areInputsIncomplete = useMemo(() => {
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
        if (groups.length < 2 || groups.some(g => g.length === 0)) return true;
        return false;
      default:
        return true;
    }
  }, [
    selectedChiSquareType,
    gofCodes, gofDocs, gofDistributionType, gofCustomProportions,
    indepCodes, indepDocs,
    homoCodes, homoDocGroups
  ]);

  const isValidationPassed = useMemo(() => {
    if (!validationStatus) return false;
    return Object.values(validationStatus).every(res => res.status === 'passed' || res.status === 'warning');
  }, [validationStatus]);

  const renderContent = () => {
    switch (view) {
      case 'chi-square-config':
        return (
          <div className="flex h-full flex-grow gap-6 overflow-hidden">
            <div className="custom-scrollbar w-2/5 flex-shrink-0 overflow-y-auto border-r p-2 dark:border-gray-600">
              <ChiSquareControlPanel
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
              />
            </div>
            <div className="custom-scrollbar w-3/5 flex-grow overflow-y-auto p-2">
              <StatsResultsPanel
                results={results}
                isLoading={loading}
                error={error}
                validationStatus={validationStatus}
                isValidationRunning={isValidationRunning}
                chiSquareSubtype={selectedChiSquareType}
                onValidate={handleValidateTest}
                onRunTest={handleRunTest}
                isValidateDisabled={areInputsIncomplete || isValidationRunning}
                isValidationPassed={isValidationPassed}
                projectName={project.name}
              />
            </div>
          </div>
        );
      case 'chi-square-type-selection':
        return <ChiSquareTypeSelector onSelect={handleChiSquareTypeSelect} />;
      case 'initial':
      default:
        return (
          <div className="flex h-full flex-col justify-center p-4 text-center">
            <h2 className="mb-4 text-3xl font-bold">Statistical Analysis</h2>
            <div className="grid w-full max-w-sm grid-cols-1 gap-8">
              <TestSelectionCard icon={<FaTable />} title="Chi-Squared Tests" description="..." onClick={() => setView('chi-square-type-selection')} />
            </div>
          </div>
        );
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="relative flex h-[90vh] w-full max-w-6xl flex-col rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            {view !== 'initial' && <button onClick={handleBack} className="absolute top-4 left-4 z-10"><FaArrowLeft size={20} /></button>}
            <button onClick={handleClose} className="absolute top-4 right-4 z-10"><FaTimes size={24} /></button>
            <div className="mt-8 flex-grow overflow-y-auto">{renderContent()}</div>
          </motion.div>

          {showIndependenceConfirm && (
            <motion.div className="absolute inset-0 flex items-center justify-center bg-black/60" onClick={() => setShowIndependenceConfirm(false)}>
              <motion.div className="w-full max-w-md rounded-lg bg-white p-8 dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
                <h3 className="mb-4 text-center text-xl font-semibold">Confirm Independence</h3>
                <p className="mb-6 text-sm">Do you confirm that the selected documents are distinct and have no content in common?</p>
                <label className="mb-6 flex items-center space-x-3"><input type="checkbox" checked={isIndependenceChecked} onChange={(e) => setIsIndependenceChecked(e.target.checked)} /><span>I confirm</span></label>
                <div className="flex justify-center gap-4">
                  <button onClick={handleIndependenceConfirm} disabled={!isIndependenceChecked} className="rounded bg-cyan-900 px-6 py-2 text-white disabled:opacity-50">Confirm</button>
                  <button onClick={() => setShowIndependenceConfirm(false)} className="rounded bg-gray-300 px-6 py-2">Cancel</button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {showRandomSamplingConfirm && (
            <motion.div className="absolute inset-0 flex items-center justify-center bg-black/60" onClick={() => setShowRandomSamplingConfirm(false)}>
              <motion.div className="w-full max-w-md rounded-lg bg-white p-8 dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
                <h3 className="mb-4 text-center text-xl font-semibold">Acknowledge: Random Sampling</h3>
                <p className="mb-6 text-sm">If your data was not randomly selected, consider this limitation when interpreting results.</p>
                <label className="mb-6 flex items-center space-x-3"><input type="checkbox" checked={isSamplingAcknowledged} onChange={(e) => setIsSamplingAcknowledged(e.target.checked)} /><span>I acknowledge</span></label>
                <div className="flex justify-center gap-4">
                  <button onClick={handleConfirmAndProceedWithValidation} disabled={!isSamplingAcknowledged} className="rounded bg-cyan-900 px-6 py-2 text-white disabled:opacity-50">Acknowledge</button>
                  <button onClick={() => setShowRandomSamplingConfirm(false)} className="rounded bg-gray-300 px-6 py-2">Cancel</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StatsModal;