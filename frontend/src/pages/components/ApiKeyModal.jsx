import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaKey, FaCheckCircle, FaExternalLinkAlt, FaCheck, FaTrash, FaPen, FaBook } from 'react-icons/fa';
import { useAuth } from '../auth/AuthContext.jsx';
import ConfirmationModal from './ConfirmationModal'; 
import apiGuidePdf from '../../assets/AssemblyAI_API_guide.pdf?url'; 
import usageAlertGuidePdf from '../../assets/usage_alert_set_up_guide.pdf?url';

/**
 * @description A modal component designed to manage the user's Transcription API Key (AssemblyAI).
 * It provides a secure interface for users to enter, save, replace, or remove their API keys.
 * * Key features:
 * - Checks backend for existing key status upon opening.
 * - securely saves/updates keys via the backend API.
 * - Handles "Replace" and "Remove" workflows with Confirmation Modals.
 * - Provides links to external documentation and usage guides.
 * * @param {object} props - The component props.
 * @param {boolean} props.show - Controls the visibility of the modal.
 * @param {function} props.onClose - Callback function to close the modal.
 * @param {function} props.onSaveSuccess - Callback function triggered after a successful key save.
 * @returns {JSX.Element|null} The rendered API Key management modal.
 */
const ApiKeyModal = ({ show, onClose, onSaveSuccess }) => {
  const { user } = useAuth();
  
  // State management for input and UI feedback
  const [apiKey, setApiKey] = useState('');
  const [isKeySaved, setIsKeySaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Network and status states
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // --- CONFIRMATION STATES ---
  // Controls visibility of the "Delete Key" confirmation modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Controls visibility of the "Replace Key" confirmation modal
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false); 

  /**
   * Effect that runs whenever the modal's visibility (`show`) changes.
   * If the modal is opening, it resets all internal state (errors, success messages, inputs)
   * and triggers a check to see if the user already has a key saved.
   */
  useEffect(() => {
    if (show) {
      checkExistingKey();
      setApiKey('');
      setError('');
      setSuccess(false);
      setIsEditing(false);
      setShowDeleteConfirm(false);
      setShowReplaceConfirm(false);
    }
  }, [show]);

  /**
   * Queries the backend to determine if the user has already configured an AssemblyAI key.
   * Updates `isKeySaved` based on the response, determining the initial view (Input vs. Saved).
   */
  const checkExistingKey = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/user/api-status`,
        { headers: { Authorization: `Bearer ${user?.token}` } }
      );
      
      if (response.data && response.data.hasAssemblyAI === true) {
        setIsKeySaved(true);
      } else {
        setIsKeySaved(false);
      }
    } catch (err) {
      console.error("Check key error", err);
      setIsKeySaved(false);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles the submission of a new API key.
   * Sends the key to the backend for encryption and storage.
   * On success, shows a success state briefly before closing the edit mode.
   * * @param {React.FormEvent} e - The form submission event.
   */
  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
        await axios.put(
            `${import.meta.env.VITE_BACKEND_URL}/api/user/api-keys`, 
            { provider: 'assemblyAI', key: apiKey },
            { headers: { Authorization: `Bearer ${user?.token}` } }
        );
        
        setSuccess(true);
        setIsKeySaved(true);
        
        // Delay closing to allow user to see the "Saved!" success message
        setTimeout(() => {
            onSaveSuccess();
            setIsEditing(false);
            setSuccess(false);
            setApiKey(''); 
        }, 1500);

    } catch (err) {
        console.error("API Key Save Error:", err);
        setError('Failed to save API key. Please try again.');
    } finally {
        setLoading(false);
    }
  };

  // --- DELETE LOGIC ---

  /**
   * Triggers the Confirmation Modal for deleting the API key.
   */
  const onRequestDelete = () => {
    setShowDeleteConfirm(true);
  };

  /**
   * Executes the actual deletion of the API key via the backend.
   * Called only after the user confirms via the ConfirmationModal.
   */
  const executeDelete = async () => {
    setShowDeleteConfirm(false); 
    setLoading(true);
    try {
        await axios.delete(
            `${import.meta.env.VITE_BACKEND_URL}/api/user/api-keys/assemblyAI`, 
            { headers: { Authorization: `Bearer ${user?.token}` } }
        );

        setIsKeySaved(false);
        setApiKey('');

        onClose();

    } catch (err) {
        console.error("Delete Error:", err);
        setError('Failed to remove key.');
    } finally {
        setLoading(false);
    }
  };

  // --- REPLACE LOGIC ---

  /**
   * Triggers the Confirmation Modal for replacing the API key.
   */
  const onRequestReplace = () => {
    setShowReplaceConfirm(true);
  };

  /**
   * Switches the modal to "Edit Mode", allowing the user to input a new key.
   * Called only after the user confirms via the ConfirmationModal.
   */
  const executeReplace = () => {
    setShowReplaceConfirm(false);
    setIsEditing(true);
  };


  if (!show) return null;

  // Determine if we should show the input form or the "Key Saved" summary
  const showInputMode = !isKeySaved || isEditing;

  return (
    <>
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" 
            onClick={onClose}
        >
          <div 
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-3 text-[#F05623]">
                <FaKey className="text-2xl" />
                <h2 className="text-xl font-bold">Configure Transcription</h2>
            </div>
            
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
                To transcribe audio, QUAiL requires your personal Transcription API key.
                Your key is encrypted and stored securely.
            </p>

            {/* ----------------- SAVED STATE ----------------- */}
            {!showInputMode && (
                 <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-900/20">
                    <div className="flex items-start gap-3 text-green-700 dark:text-green-400">
                        <FaCheckCircle className="mt-1 text-xl" />
                        <div className="flex flex-col">
                            <h3 className="text-sm font-bold">API Key Saved</h3>
                            <p className="text-xs opacity-80">Your key is saved and ready to use.</p>
                            
                            {/* --- ACTION LINKS --- */}
                            <div className="mt-2 flex flex-wrap items-center gap-4">
                                {/* 1. Check Usage Link */}
                                <a 
                                    href={import.meta.env.VITE_TRANSCRIPTION_USAGE_LINK || "https://www.assemblyai.com/dashboard/account/billing"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                                >
                                    Check Usage <FaExternalLinkAlt size={10} />
                                </a>

                                {/* 2. Usage Alert Guide Link (New) */}
                                <a 
                                    href={usageAlertGuidePdf}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                                >
                                    <FaBook size={12} /> Usage Alert Guide
                                </a>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-4 flex gap-3">
                        <button
                            onClick={onRequestReplace}
                            className="flex flex-1 items-center justify-center gap-2 rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                        >
                            <FaPen size={12} /> Replace
                        </button>
                        <button
                            onClick={onRequestDelete} 
                            disabled={loading}
                            className="flex flex-1 items-center justify-center gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                        >
                            <FaTrash size={12} /> Remove
                        </button>
                    </div>
                 </div>
            )}

            {/* ----------------- EDIT/INPUT STATE ----------------- */}
            {showInputMode && (
                <form onSubmit={handleSave}>
                    <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">
                        {isKeySaved ? "Enter New API Key" : "Transcription API Key"}
                    </label>
                    
                    <input 
                        type="text" 
                        name="assembly_ai_key_field" 
                        autoComplete="off"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Paste your API key here..."
                        style={{ WebkitTextSecurity: 'disc' }}
                        className="mb-2 w-full rounded border p-2 focus:border-[#F05623] focus:outline-none dark:bg-gray-700 dark:text-white"
                        required
                    />
                    
                    {error && <p className="mb-2 text-xs text-red-500">{error}</p>}

                    {!isKeySaved && (
                        <div className="mb-6 flex items-center justify-end gap-4">
                            {/* --- 2. USE THE IMPORTED PDF VARIABLE --- */}
                            <a 
                                href={apiGuidePdf} 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center text-xs text-blue-600 hover:underline dark:text-blue-400"
                            >
                                <FaBook className="mr-1" /> API Guide
                            </a>

                            <a 
                                href={import.meta.env.VITE_TRANSCRIPTION_PROVIDER_LINK || "https://www.assemblyai.com/dashboard/signup"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center text-xs text-blue-600 hover:underline dark:text-blue-400"
                            >
                                Get a free key <FaExternalLinkAlt className="ml-1" />
                            </a>
                        </div>
                    )}

                    <div className="mt-4 flex justify-end gap-3">
                        <button 
                            type="button" 
                            onClick={() => {
                                if(isKeySaved) setIsEditing(false);
                                else onClose();
                            }}
                            className="rounded px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={loading || success}
                            className={`rounded px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                                success 
                                ? 'bg-green-500 hover:bg-green-600' 
                                : 'bg-[#F05623] hover:bg-[#d0451b]'
                            }`}
                        >
                            {loading ? 'Saving...' : success ? (
                                <span className="flex items-center gap-2">
                                    <FaCheck /> Saved!
                                </span>
                            ) : 'Save Key'}
                        </button>
                    </div>
                </form>
            )}
          </div>
        </div>

        {/* ----------------- CONFIRMATION MODALS ----------------- */}
        <ConfirmationModal
            show={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={executeDelete}
            title="Remove API Key?"
            shortMessage="Are you sure you want to remove this API key?"
            detailedMessage="Removing this key will disable transcription features immediately. You will need to re-enter a valid transcription API key to use these features again."
            confirmText="Yes, Remove"
        />

        <ConfirmationModal
            show={showReplaceConfirm}
            onClose={() => setShowReplaceConfirm(false)}
            onConfirm={executeReplace}
            title="Replace API Key?"
            shortMessage="Are you sure you want to replace your existing API Key?"
            detailedMessage="This will allow you to enter a new key. The existing key will remain active until you successfully save a new one."
            confirmText="Yes, Replace"
        />
    </>
  );
};

export default ApiKeyModal;