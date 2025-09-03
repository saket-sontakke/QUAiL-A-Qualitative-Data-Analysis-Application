import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaFileUpload, FaMicrophoneAlt, FaTimes, FaParagraph, FaListUl, FaArrowLeft } from 'react-icons/fa';

/**
 * A multi-step modal for importing files into a project. It guides the user
 * to first select the file type (audio or text) and then choose a content
 * splitting option (e.g., by speaker turn or by sentence) before prompting
 * for the file upload. Includes client-side file size validation.
 *
 * @param {object} props - The component props.
 * @param {boolean} props.show - Controls the visibility of the modal.
 * @param {Function} props.onClose - The callback function to close the modal.
 * @param {(file: File, splitOption: string) => void} props.handleAudioImport - The handler for audio file imports, receiving the file and the chosen split option.
 * @param {(file: File, splitOption: string) => void} props.handleTextImport - The handler for text file imports, receiving the file and the chosen split option.
 * @returns {JSX.Element|null} The rendered modal component or null if not shown.
 */
const ImportOptionsModal = ({
  show,
  onClose,
  handleAudioImport,
  handleTextImport
}) => {
  const [modalStep, setModalStep] = useState('initial');
  const audioInputRef = useRef(null);
  const textInputRef = useRef(null);
  const splitOptionRef = useRef('turn');

  const MAX_TEXT_SIZE_BYTES = 25 * 1024 * 1024; // 25MB
  const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

  const MAX_TEXT_SIZE_MB = MAX_TEXT_SIZE_BYTES / 1024 / 1024;
  const MAX_AUDIO_SIZE_MB = MAX_AUDIO_SIZE_BYTES / 1024 / 1024;

  const textFormats = '.txt, .docx';
  const audioFormats = '.mp3, .wav, .ogg, .m4a, .aac';

  const handleAudioOptionClick = (option) => {
    splitOptionRef.current = option;
    audioInputRef.current?.click();
  };

  const handleTextOptionClick = (option) => {
    splitOptionRef.current = option;
    textInputRef.current?.click();
  };

  const handleTextFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > MAX_TEXT_SIZE_BYTES) {
      alert(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). The maximum size for text files is ${MAX_TEXT_SIZE_MB}MB.`);
      e.target.value = '';
      return;
    }

    handleTextImport(file, splitOptionRef.current);
    onClose();
  };

  const handleAudioFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > MAX_AUDIO_SIZE_BYTES) {
      alert(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). The maximum size for audio files is ${MAX_AUDIO_SIZE_MB}MB.`);
      e.target.value = '';
      return;
    }

    handleAudioImport(file, splitOptionRef.current);
    onClose();
  };

  const resetModal = () => {
    setModalStep('initial');
    onClose();
  };

  if (!show) return null;

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
          <span className="mt-1 text-xs font-semibold text-red-500 dark:text-red-400">{`*Max ${MAX_AUDIO_SIZE_MB} MB`}</span>
        </button>
        <button
          onClick={() => setModalStep('textOptions')}
          className="group flex transform flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 transition-all duration-300 hover:scale-105 hover:border-[#1D3C87] hover:bg-blue-50 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600"
        >
          <FaFileUpload className="mb-3 text-4xl text-[#1D3C87] dark:text-blue-400" />
          <span className="font-semibold text-gray-800 dark:text-white">Import Text File</span>
          <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">{textFormats}</span>
          <span className="mt-1 text-xs font-semibold text-red-500 dark:text-red-400">{`*Max ${MAX_TEXT_SIZE_MB} MB`}</span>
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
          <button
            onClick={resetModal}
            className="absolute top-3 right-3 text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
            title="Close"
          >
            <FaTimes size={20} />
          </button>

          {modalStep !== 'initial' && (
            <button
              onClick={() => setModalStep('initial')}
              className="absolute top-3 left-3 text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
              title="Back"
            >
              <FaArrowLeft size={20} />
            </button>
          )}

          <div className="p-8 text-center">
            {modalStep === 'initial' && renderInitialStep()}
            {modalStep === 'textOptions' && renderTextOptions()}
            {modalStep === 'audioOptions' && renderAudioOptions()}
          </div>

          <input type="file" ref={textInputRef} onChange={handleTextFileChange} accept={textFormats} className="hidden" />
          <input type="file" ref={audioInputRef} onChange={handleAudioFileChange} accept={audioFormats} className="hidden" />
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ImportOptionsModal;