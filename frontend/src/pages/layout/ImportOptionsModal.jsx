import React, { useState, useRef, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaFileUpload, FaMicrophoneAlt, FaTimes, FaParagraph, FaListUl, FaArrowLeft, FaSpinner } from 'react-icons/fa';
import ConfirmationModal from "../components/ConfirmationModal.jsx";
import { ProjectContext } from '../ProjectContext.jsx';

const ImportOptionsModal = ({
  show,
  onClose,
  modalStep,
  setModalStep,
  handleAudioImport,
  handleTextImport,
  setRequestApiKeyModal,
  hasApiKey
}) => {
  // const [modalStep, setModalStep] = useState('initial');
  // New state to track if a file is currently being processed
  const [isProcessing, setIsProcessing] = useState(false);

  const { fileLimits } = useContext(ProjectContext);
  
  const [errorModal, setErrorModal] = useState({
    show: false,
    title: '',
    message: ''
  });

  const audioInputRef = useRef(null);
  const textInputRef = useRef(null);
  const splitOptionRef = useRef('turn');

  const textFormats = '.txt, .docx, .pdf, .rtf'; 
  const audioFormats = 'mp3, mpeg, wav, ogg, m4a, mp4, aac, webm, flac';

  const closeErrorModal = () => {
    setErrorModal({ show: false, title: '', message: '' });
  };

  const handleAudioOptionClick = (option) => {
    if (hasApiKey === false) {
        onClose();
        if (setRequestApiKeyModal) setRequestApiKeyModal(true);
        return;
    }
    splitOptionRef.current = option;
    audioInputRef.current?.click();
  };

  const handleTextOptionClick = (option) => {
    splitOptionRef.current = option;
    textInputRef.current?.click();
  };

  // Made Async to wait for import
  const handleTextFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Clear input so same file can be selected again if needed
    e.target.value = null; 

    if (!fileLimits) return;

    const maxBytes = fileLimits.textMB * 1024 * 1024;

    if (file.size > maxBytes) {
      setErrorModal({
        show: true,
        title: 'File Too Large',
        message: `The file "${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)}MB. The maximum size for text files is ${fileLimits.textMB}MB.`
      });
      return;
    }

    // Start Spinner
    setIsProcessing(true);
    
    try {
      // Await the import process
      await handleTextImport(file, splitOptionRef.current);
    } catch (error) {
      console.error("Import error caught in modal:", error);
    } finally {
      // Stop Spinner and Close Modal regardless of success/fail
      // (If failed, useFileManager likely triggered an Error Modal which should now be visible)
      setIsProcessing(false);
      onClose();
    }
  };

  // Made Async to wait for import
  const handleAudioFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    e.target.value = null; 

    if (!fileLimits) return;

    const maxBytes = fileLimits.audioMB * 1024 * 1024;

    if (file.size > maxBytes) {
      setErrorModal({
        show: true,
        title: 'File Too Large',
        message: `The file "${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)}MB. The maximum size for audio files is ${fileLimits.audioMB}MB.`
      });
      return;
    }

    setIsProcessing(true);

    try {
      await handleAudioImport(file, splitOptionRef.current);
    } catch (error) {
      console.error("Audio import error caught in modal:", error);
    } finally {
      setIsProcessing(false);
      onClose();
    }
  };

  const resetModal = () => {
    if (!isProcessing) {
      setModalStep('initial');
      onClose();
    }
  };

  if (!show) return null;

  // New Render Step for Loading
  const renderProcessingStep = () => (
    <div className="flex flex-col items-center justify-center p-8">
      <FaSpinner className="animate-spin text-5xl text-[#F05623] mb-4" />
      <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Importing File...</h3>
      <p className="text-gray-500 dark:text-gray-400">Please wait while we process your document.</p>
    </div>
  );

  const renderInitialStep = () => (
    <>
      <h2 className="mb-2 text-2xl font-bold text-[#1D3C87] dark:text-[#F05623]">Import a File</h2>
      <p className="mb-6 text-gray-600 dark:text-gray-300">
        Choose how to add a document to your project.
      </p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <button
          onClick={() => setModalStep('audioOptions')}
          className="group flex transform flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 transition-all duration-300 hover:scale-105 hover:border-[#F05623] hover:bg-orange-50 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600"
        >
          <FaMicrophoneAlt className="mb-3 text-4xl text-[#F05623]" />
          <span className="font-semibold text-gray-800 dark:text-white">Import Audio</span>
          <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">{audioFormats}</span>
          <span className="mt-1 text-xs font-semibold text-red-500 dark:text-red-400">{`*Max ${fileLimits.audioMB} MB`}</span>
        </button>
        <button
          onClick={() => setModalStep('textOptions')}
          className="group flex transform flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 transition-all duration-300 hover:scale-105 hover:border-[#1D3C87] hover:bg-blue-50 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600"
        >
          <FaFileUpload className="mb-3 text-4xl text-[#1D3C87] dark:text-blue-400" />
          <span className="font-semibold text-gray-800 dark:text-white">Import Text</span>
          <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">{textFormats}</span>
          <span className="mt-1 text-xs font-semibold text-red-500 dark:text-red-400">{`*Max ${fileLimits.textMB} MB`}</span>
        </button>
      </div>
    </>
  );

  const renderTextOptions = () => (
    <>
      <h2 className="mb-2 text-2xl font-bold text-[#1D3C87] dark:text-blue-400">
        Choose Text Format
      </h2>
      <p className="mb-6 text-gray-600 dark:text-gray-300">
        How is your text file structured? This helps in proper analysis.
      </p>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <button
          onClick={() => handleTextOptionClick('turn')}
          className="flex transform flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 transition-all duration-300 hover:scale-105 hover:border-[#F05623] hover:bg-blue-50 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600"
        >
          <FaListUl className="mb-3 text-4xl text-[#F05623]" />
          <span className="font-semibold text-gray-800 dark:text-white">Turn-wise Splitting</span>
          <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">For interview transcripts</span>
        </button>
        <button
          onClick={() => handleTextOptionClick('sentence')}
          className="flex transform flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 transition-all duration-300 hover:scale-105 hover:border-[#1D3C87] hover:bg-blue-50 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600"
        >
          <FaParagraph className="mb-3 text-4xl text-[#1D3C87] dark:text-blue-400" />
          <span className="font-semibold text-gray-800 dark:text-white">Sentence-wise Splitting</span>
          <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">For standard paragraphs</span>
        </button>
      </div>
    </>
  );

  const renderAudioOptions = () => (
    <>
      <h2 className="mb-2 text-2xl font-bold text-[#1D3C87] dark:text-[#F05623]">
        Choose Transcript Format
      </h2>
      <p className="mb-6 text-gray-600 dark:text-gray-300">
        How should the transcribed text be structured?
      </p>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <button
          onClick={() => handleAudioOptionClick('turn')}
          className="flex transform flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 transition-all duration-300 hover:scale-105 hover:border-[#F05623] hover:bg-orange-50 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600"
        >
          <FaListUl className="mb-3 text-4xl text-[#F05623]" />
          <span className="font-semibold text-gray-800 dark:text-white">Turn-wise Splitting</span>
          <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">Groups by speaker</span>
        </button>
        <button
          onClick={() => handleAudioOptionClick('sentence')}
          className="flex transform flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 transition-all duration-300 hover:scale-105 hover:border-[#1D3C87] hover:bg-blue-50 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600"
        >
          <FaParagraph className="mb-3 text-4xl text-[#1D3C87] dark:text-blue-400" />
          <span className="font-semibold text-gray-800 dark:text-white">Sentence-wise Splitting</span>
          <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">Separates each sentence</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      <AnimatePresence>
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={resetModal}
        >
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button only visible if NOT processing */}
            {!isProcessing && (
              <button
                onClick={resetModal}
                className="absolute top-3 right-3 text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                title="Close"
              >
                <FaTimes size={20} />
              </button>
            )}

            {/* Back button only visible if NOT processing and not initial step */}
            {!isProcessing && modalStep !== 'initial' && (
              <button
                onClick={() => setModalStep('initial')}
                className="absolute top-3 left-3 text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                title="Back"
              >
                <FaArrowLeft size={20} />
              </button>
            )}

            <div className="p-8 text-center">
              {isProcessing && renderProcessingStep()}
              {!isProcessing && modalStep === 'initial' && renderInitialStep()}
              {!isProcessing && modalStep === 'textOptions' && renderTextOptions()}
              {!isProcessing && modalStep === 'audioOptions' && renderAudioOptions()}
            </div>

            <input type="file" ref={textInputRef} onChange={handleTextFileChange} accept={textFormats} className="hidden" />
            <input type="file" ref={audioInputRef} onChange={handleAudioFileChange} accept={audioFormats} className="hidden" />
          </motion.div>
        </div>
      </AnimatePresence>

      <ConfirmationModal
        show={errorModal.show}
        onClose={closeErrorModal}
        onConfirm={closeErrorModal}
        title={errorModal.title}
        shortMessage={errorModal.message}
        confirmText="Close"
        showCancelButton={false}
      />
    </>
  );
};

export default ImportOptionsModal;