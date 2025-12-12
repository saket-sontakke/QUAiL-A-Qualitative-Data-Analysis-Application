import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext.jsx';
import { useHistory } from './useHistory.js';
import FileSaver from 'file-saver';

/**
 * A comprehensive custom hook that encapsulates the state management and business
 * logic for the main project view. It handles data fetching, user interactions,
 * annotations, search functionality, modal states, and undo/redo history.
 *
 * @param {object} props - The hook's configuration object.
 * @param {(file: object) => void} props.onImportSuccess - A callback function to run when a file import is successful, typically to enter edit mode.
 * @param {React.Dispatch<React.SetStateAction<object|null>>} props.setFileInEditMode - A state setter from the parent to control the edit mode file.
 * @param {string|null} [props.idFromProp=null] - An optional project ID passed as a prop, overriding the URL parameter.
 * @returns {object} An object containing all the state and handler functions required by the `ProjectView` component and its children.
 */
export default function useProjectViewHooks({ onImportSuccess, setFileInEditMode, idFromProp = null, isInEditMode, onRequestApiKey }) {
  const { user } = useAuth();

  const { id: idFromParams } = useParams();
  const projectId = idFromProp || idFromParams;
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [transcriptionStatus, setTranscriptionStatus] = useState({
    isActive: false,
    message: '',
    progress: 0,
  });

  const [selectedContent, setSelectedContent] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [selectedFileAudioUrl, setSelectedFileAudioUrl] = useState(null);

  const [codedSegments, setCodedSegments] = useState([]);
  const [inlineHighlights, setInlineHighlights] = useState([]);
  const [codeDefinitions, setCodeDefinitions] = useState([]);
  const [memos, setMemos] = useState([]);
  const [segmentToReassign, setSegmentToReassign] = useState(null);

  const { executeAction, undo, redo, canUndo, canRedo } = useHistory(selectedFileId);

  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [showImportedFiles, setShowImportedFiles] = useState(true);
  const [showCodeDefinitions, setShowCodeDefinitions] = useState(true);
  const [showCodedSegments, setShowCodedSegments] = useState(true);
  const [showMemosPanel, setShowMemosPanel] = useState(true);

  const [selectedHighlightColor, setSelectedHighlightColor] = useState('#00FF00');
  const [showHighlightColorDropdown, setShowHighlightColorDropdown] = useState(false);

  const [showCodeColors, setShowCodeColors] = useState(true);
  const [showCodeDropdown, setShowCodeDropdown] = useState(false);
  const [selectedCodeColor, setSelectedCodeColor] = useState('#FFA500');
  const [showDefineCodeModal, setShowDefineCodeModal] = useState(false);
  const [codeDefinitionToEdit, setCodeDefinitionToEdit] = useState(null);

  const [currentSelectionInfo, setCurrentSelectionInfo] = useState({
    text: '',
    startIndex: -1,
    endIndex: -1,
  });
  const [currentSelectionRange, setCurrentSelectionRange] = useState(null);
  const [activeTool, setActiveTool] = useState(null);

  const [showMemoModal, setShowMemoModal] = useState(false);
  const [memoToEdit, setMemoToEdit] = useState(null);
  const [currentMemoSelectionInfo, setCurrentMemoSelectionInfo] = useState(null);

  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false);
  const [floatingToolbarPosition, setFloatingToolbarPosition] = useState({ top: 0, left: 0 });
  const [showFloatingAssignCode, setShowFloatingAssignCode] = useState(false);
  const [floatingAssignCodePosition, setFloatingAssignCodePosition] = useState({ top: 0, left: 0 });
  const [showFloatingMemoInput, setShowFloatingMemoInput] = useState(false);
  const [floatingMemoInputPosition, setFloatingMemoInputPosition] = useState({ top: 0, left: 0 });

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState({
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [showCodedSegmentsTableModal, setShowCodedSegmentsTableModal] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [viewerSearchQuery, setViewerSearchQuery] = useState('');
  const [viewerSearchMatches, setViewerSearchMatches] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

  const [activeCodedSegmentId, setActiveCodedSegmentId] = useState(null);
  const [activeMemoId, setActiveMemoId] = useState(null);
  const [annotationToScrollToId, setAnnotationToScrollToId] = useState(null);

  const [expandedCodes, setExpandedCodes] = useState({});
  const [expandedMemos, setExpandedMemos] = useState({});

  const leftPanelRef = useRef(null);
  const viewerRef = useRef(null);
  const searchInputRef = useRef(null);
  const viewerSearchInputRef = useRef(null);
  const setDefineModalBackendErrorRef = useRef(null);
  const [pinnedFiles, setPinnedFiles] = useState([]);

  const highlightColors = [
    { name: 'Yellow', value: '#FFFF00', cssClass: 'bg-yellow-300' },
    { name: 'Green', value: '#00FF00', cssClass: 'bg-green-300' },
    { name: 'Blue', value: '#ADD8E6', cssClass: 'bg-blue-300' },
    { name: 'Pink', value: '#FFC0CB', cssClass: 'bg-pink-300' },
  ];

  /**
   * Toggles the expanded/collapsed state of a coded segment group in the UI.
   * @param {string} codeName - The name of the code group to toggle.
   * @returns {void}
   */
  const toggleCodeGroup = (codeName) => {
    setExpandedCodes(prev => ({
      ...prev,
      [codeName]: !prev[codeName]
    }));
  };

  /**
   * Toggles the expanded/collapsed state of a memo group in the UI.
   * @param {string} memoId - The ID of the memo group to toggle.
   * @returns {void}
   */
  const toggleMemoGroup = (memoId) => {
    setExpandedMemos(prev => ({
      ...prev,
      [memoId]: !prev[memoId]
    }));
  };

  /**
   * Registers a state setter function from a child modal component to allow this hook to set error messages within that modal.
   * @param {function} setter - The state setter function for the modal's error message state.
   * @returns {void}
   */
  const handleDefineModalErrorSetter = useCallback((setter) => {
    setDefineModalBackendErrorRef.current = setter;
  }, []);

  /**
   * Calculates the character offset of a node within a container element.
   * This is used to determine the start and end indices of a text selection.
   * @param {HTMLElement} container - The parent element containing the text nodes.
   * @param {Node} node - The specific text node to find the offset of.
   * @param {number} offset - The character offset within the `node`.
   * @returns {number} The total character offset from the beginning of the container, or -1 if not found.
   */
  const getCharOffset = useCallback((container, node, offset) => {
    let charCount = 0;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
    let currentNode;
    while ((currentNode = walker.nextNode())) {
      if (currentNode === node) {
        return charCount + offset;
      }
      charCount += currentNode.length;
    }
    return -1;
  }, []);

  /**
   * Creates a DOM Range object from character start and end indices within a container element.
   * This is used to programmatically highlight text based on stored annotation data.
   * @param {HTMLElement} containerElement - The element that contains the text.
   * @param {number} startIndex - The starting character index of the range.
   * @param {number} endIndex - The ending character index of the range.
   * @returns {Range|null} A DOM Range object, or null if the range cannot be created.
   */
  const createRangeFromOffsets = useCallback((containerElement, startIndex, endIndex) => {
    const range = document.createRange();
    const findNodeAndOffset = (targetIndex) => {
      const treeWalker = document.createTreeWalker(containerElement, NodeFilter.SHOW_TEXT, null, false);
      let node;
      let charCount = 0;
      while ((node = treeWalker.nextNode())) {
        const nodeLength = node.nodeValue.length;
        if (charCount + nodeLength >= targetIndex) {
          return { node, offset: targetIndex - charCount };
        }
        charCount += nodeLength;
      }
      return { node: null, offset: -1 };
    };
    const startInfo = findNodeAndOffset(startIndex);
    const endInfo = findNodeAndOffset(endIndex);
    if (startInfo.node && endInfo.node) {
      range.setStart(startInfo.node, startInfo.offset);
      range.setEnd(endInfo.node, endInfo.offset);
      return range;
    }
    return null;
  }, []);

  /**
   * Gets information about the current user text selection within the viewer panel.
   * @returns {{text: string, startIndex: number, endIndex: number}|null} An object with the selected text and its offsets, or null if the selection is invalid.
   */
  const getSelectionInfo = useCallback(() => {
    const selection = window.getSelection();
    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    if (!selection || !range || !selectedFileName || !viewerRef.current || !viewerRef.current.contains(range.commonAncestorContainer)) {
      return null;
    }
    const selectedText = selection.toString();
    if (!selectedText.trim()) {
      return null;
    }
    const startIndex = getCharOffset(viewerRef.current, range.startContainer, range.startOffset);
    const endIndex = getCharOffset(viewerRef.current, range.endContainer, range.endOffset);
    if (startIndex === -1 || endIndex === -1) {
      console.error("Failed to calculate accurate character offsets for selection.");
      return null;
    }
    return { text: selectedText, startIndex, endIndex };
  }, [selectedFileName, viewerRef, getCharOffset]);

  /**
   * Handles the selection of a file from the list, updating the viewer and related annotation states.
   * @param {object} file - The file object to display.
   * @param {Array<object>} allCodedSegments - The complete list of coded segments for the entire project.
   * @param {Array<object>} allInlineHighlights - The complete list of highlights for the entire project.
   * @param {Array<object>} allMemos - The complete list of memos for the entire project.
   * @returns {void}
   */
  const handleSelectFile = useCallback((file) => {
    if (!file || !project) {
      setSelectedContent('');
      setSelectedFileName('');
      setSelectedFileId(null);
      setSelectedFileAudioUrl(null);
      setCodedSegments([]);
      setInlineHighlights([]);
      setMemos([]);
      return;
    }
    setSelectedContent(file.content);
    setSelectedFileName(file.name);
    setSelectedFileId(file._id);
    setSelectedFileAudioUrl(file.audioUrl || null);

    const filteredCodes = project.codedSegments?.filter(seg => seg.fileId === file._id) || [];
    filteredCodes.sort((a, b) => a.startIndex - b.startIndex);
    setCodedSegments(filteredCodes);

    const filteredHighlights = project.inlineHighlights?.filter(hl => hl.fileId === file._id) || [];
    filteredHighlights.sort((a, b) => a.startIndex - b.startIndex);
    setInlineHighlights(filteredHighlights);

    const filteredMemos = project.memos?.filter(memo => memo.fileId === file._id) || [];
    filteredMemos.sort((a, b) => a.startIndex - b.startIndex);
    setMemos(filteredMemos);
    
    setViewerSearchQuery('');
    setViewerSearchMatches([]);
    setCurrentMatchIndex(-1);
    setActiveCodedSegmentId(null);
    setActiveMemoId(null);
  }, [project]);

    /**
     * Fetches the full project data from the backend API.
     * @returns {Promise<void>}
     */
    const fetchProject = useCallback(async () => {
      setLoading(true);
      setError('');
      const token = user?.token;
      if (!token) {
        setError('Authentication error. Please log in.');
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}`, { headers: { Authorization: `Bearer ${token}` } }
        );
        const fetchedProject = res.data;
        setProject(fetchedProject);
        setProjectName(fetchedProject.name);
        setCodeDefinitions(fetchedProject.codeDefinitions || []);
        
        const savedPinnedFiles = localStorage.getItem(`pinnedFiles_${projectId}`);
        if (savedPinnedFiles) {
          setPinnedFiles(JSON.parse(savedPinnedFiles));
        }

      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load project');
      } finally {
        setLoading(false);
      }
    }, [projectId, user]);

  /**
   * Handles the import of a text file, sending it to the backend for processing.
   * @param {File} file - The text file to import.
   * @param {string} [splittingOption='sentence'] - The method for splitting the text content.
   * @param {string|null} [overrideName=null] - An optional name to use for the file, overriding its original name.
   * @returns {Promise<void>}
   */
  const handleTextImport = async (file, splittingOption = 'sentence', overrideName = null) => {
    const token = user?.token;
    if (!token) return setError('You must be logged in to import files.');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('splittingOption', splittingOption);
    if (overrideName) {
      formData.append('overrideName', overrideName);
    }
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/files/stage`,
        formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const { stagedFile } = res.data;

      if (stagedFile && onImportSuccess) {
        onImportSuccess({ ...stagedFile, isStaged: true });
      }

    } catch (err) {
      if (err.response && err.response.status === 409 && err.response.data.promptRequired) {
        const { suggestedName } = err.response.data;
        setConfirmModalData({
          title: 'Duplicate File Detected',
          shortMessage: (
            <p>
              A file named <strong>{file.name}</strong> already exists. Do you still want to continue?
              <br /><br />
              <span className="font-bold text-red-500 dark:text-red-500">
                THIS MIGHT LEAD TO INCORRECT RESULTS IN STATISTICAL TESTS.
              </span>
            </p>
          ),
          detailedMessage: "The assumption of independence is crucial for many statistical tests (e.g., chi-squared, t-tests). It means each data point is unrelated to others. Importing the same file twice violates this by creating perfect dependency, which can inflate statistical significance and lead to false conclusions.",
          onConfirm: () => {
            setShowConfirmModal(false);
            handleTextImport(file, splittingOption, suggestedName);
          },
          showCheckbox: true,
          isCheckboxRequired: true,
          checkboxLabel: "I understand the risks and wish to proceed."
        });
        setShowConfirmModal(true);
      } else {
        setConfirmModalData({
          title: 'Import Failed',
          shortMessage: err.response?.data?.error || 'Failed to import text file.',
          onConfirm: () => setShowConfirmModal(false),
          showInput: false
        });
        setShowConfirmModal(true);
      }
    }
  };

/**
 * Commits a staged file to the project, making it permanent.
 * This function sends the staged file data to the backend to be saved in the database.
 * @param {object} fileData - The data of the staged file to be committed.
 * @returns {Promise<{success: boolean, error?: string}>} An object indicating the outcome of the commit operation.
 */
const handleCommitNewFile = async (fileData) => {
  const token = user?.token;
  if (!token) return { success: false, error: 'You must be logged in to save files.' };

  try {
    const res = await axios.post(
      `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/files/commit`,
      { ...fileData },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    setProject(res.data.project);
    
    const newlyCommittedFile = res.data.project.importedFiles.at(-1);
    if (newlyCommittedFile) {
      handleSelectFile(newlyCommittedFile);
    }

    return { success: true };
  } catch (err) {
    const error = err.response?.data?.error || 'Failed to save new file.';
    setError(error);
    setConfirmModalData({ title: 'Save Failed', message: error, onConfirm: () => setShowConfirmModal(false) });
    setShowConfirmModal(true);
    return { success: false, error };
  }
};

/**
   * Handles the import and transcription of an audio file.
   * Merges robust progress tracking with API key and duplicate checks.
   * * @param {File} file - The audio file to import.
   * @param {string} [splittingOption='turn'] - The method for splitting the resulting transcript.
   * @param {string|null} [overrideName=null] - An optional name to use for the transcript file.
   */
  const handleAudioImport = async (file, splittingOption = 'turn', overrideName = null) => {
    // 1. Initialization
    setTranscriptionStatus({ isActive: true, message: 'Uploading audio...', progress: 0 });
    
    const token = user?.token;
    if (!token) {
      setTranscriptionStatus({ isActive: false, message: 'Authentication Error.', progress: 0 });
      return;
    }

    // 2. Prepare Form Data
    const formData = new FormData();
    formData.append('audio', file);
    formData.append('splittingOption', splittingOption);
    if (overrideName) {
      formData.append('overrideName', overrideName);
    }

    try {
      // 3. Configure Axios with Progress Tracking
      const axiosConfig = {
        headers: { 
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}` 
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setTranscriptionStatus(prev => ({
            ...prev,
            progress: percentCompleted,
            message: percentCompleted < 100
              ? 'Uploading audio...'
              : (
                <>
                  Upload complete. Transcribing...
                  <br />
                  <span className="text-sm italic text-gray-500 dark:text-gray-400">
                    This may take a while...
                  </span>
                </>
              )
          }));
        },
      };

      // 4. Perform Request
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/projects/import-audio/${projectId}`, 
        formData, 
        axiosConfig
      );

      // 5. Handle Success
      setProject(res.data.project);
      
      const newlyImportedFile = res.data.project.importedFiles.at(-1);
      if (newlyImportedFile && onImportSuccess) {
        onImportSuccess(newlyImportedFile);
      }

      setTranscriptionStatus({ isActive: false, message: '', progress: 0 });

    } catch (err) {
      console.error('Audio import failed', err);
      setTranscriptionStatus({ isActive: false, message: '', progress: 0 });

      // --- ERROR HANDLING LOGIC ---

      // CASE A: Missing API Key (Status 428 - Precondition Required)
      if (err.response && err.response.status === 428) {
        if (onRequestApiKey) {
            onRequestApiKey(); // Open the settings modal
        }
        return; // Stop here, do not show generic error
      }

      // CASE B: Duplicate File (Status 409 - Conflict)
      if (err.response && err.response.status === 409 && err.response.data.promptRequired) {
        const { suggestedName } = err.response.data;
        const originalTranscriptName = file.name.replace(/\.[^/.]+$/, " (Transcript).txt");

        setConfirmModalData({
          title: 'Duplicate Transcript Detected',
          shortMessage: (
            <p>
              A transcript named <strong>{originalTranscriptName}</strong> already exists.
              <br /><br />
              <span className="font-bold text-red-500 dark:text-red-500">
                THIS MIGHT LEAD TO INCORRECT RESULTS IN STATISTICAL TESTS.
              </span>
            </p>
          ),
          detailedMessage: "The assumption of independence is crucial for many statistical tests (e.g., chi-squared, t-tests). It means each data point is unrelated to others. Importing the same file twice violates this by creating perfect dependency.",
          onConfirm: () => {
            setShowConfirmModal(false);
            // Recursive call with the new name
            handleAudioImport(file, splittingOption, suggestedName);
          },
          showCheckbox: true,
          checkboxLabel: "I understand the risks and wish to proceed."
        });
        setShowConfirmModal(true);
      } 
      
      // CASE C: Generic Error
      else {
        setConfirmModalData({
          title: 'Transcription Failed',
          shortMessage: err.response?.data?.error || 'Failed to import and transcribe audio file.',
          onConfirm: () => setShowConfirmModal(false),
          showInput: false,
          showCheckbox: false
        });
        setShowConfirmModal(true);
      }
    }
  };


  /**
   * Updates the content of an existing file on the backend.
   * @param {string} fileId - The ID of the file to update.
   * @param {string} content - The new content for the file.
   * @returns {Promise<void>}
   */
  const handleUpdateFileContent = async (fileId, content) => {
    const token = user?.token;
    if (!token) return setError('You must be logged in to save changes.');
    try {
      const res = await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/files/${fileId}`, { content }, { headers: { Authorization: `Bearer ${token}` } }
      );
      setProject(res.data.project);
      const updatedFile = res.data.project.importedFiles.find(f => f._id === fileId);
      if (updatedFile) {
        handleSelectFile(updatedFile, res.data.project.codedSegments, res.data.project.inlineHighlights, res.data.project.memos);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save document.');
      setConfirmModalData({ title: 'Save Failed', message: err.response?.data?.error || 'Could not save the document content.', onConfirm: () => setShowConfirmModal(false) });
      setShowConfirmModal(true);
    }
  };

  /**
   * Handles the file input change event, determining whether to process a text or audio file.
   * @param {React.ChangeEvent<HTMLInputElement>} e - The file input change event.
   * @returns {Promise<void>}
   */
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const audioTypes = /audio\/(mpeg|wav|ogg|x-m4a|flac|aac)/;
    if (audioTypes.test(file.type)) {
      handleAudioImport(file);
    } else {
      handleTextImport(file);
    }
    e.target.value = null;
  };

  /**
   * Renames a file in the project.
   */
  const handleRenameFile = async (file, newName) => {
    const { _id: fileId, name: originalName } = file;

    const getExtension = (filename) => {
      const lastDot = filename.lastIndexOf('.');
      if (lastDot === -1) return '';
      return filename.substring(lastDot);
    };

    const originalExtension = getExtension(originalName);
    const newExtension = getExtension(newName);

    if (originalExtension.toLowerCase() !== newExtension.toLowerCase()) {
      setConfirmModalData({
        title: 'Rename Error',
        shortMessage: 'Changing the file extension is not permitted. Please keep the original extension.',
        confirmText: 'OK',
        showCancelButton: false,
        onConfirm: () => setShowConfirmModal(false),
      });
      setShowConfirmModal(true);
      return { success: false, error: 'Cannot change file extension.' };
    }

    const token = user?.token;
    if (!token) return { success: false, error: 'You must be logged in to rename files.' };
    try {
      const res = await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/files/${fileId}/rename`,
        { name: newName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProject(res.data.project);
      return { success: true };
    } catch (err) {
      const error = err.response?.data?.error || 'Failed to rename file.';
      setError(error);
      return { success: false, error };
    }
  };

  /**
   * Toggles the pinned state of a file and saves it to localStorage.
   */
  const handlePinFile = (fileId) => {
    const isPinned = pinnedFiles.includes(fileId);

    if (!isPinned && pinnedFiles.length >= 3) {
      setConfirmModalData({
        title: 'Pin Limit Reached',
        shortMessage: 'You can only pin a maximum of 3 files. Please unpin another file to continue.',
        confirmText: 'OK',
        showCancelButton: false,
        onConfirm: () => setShowConfirmModal(false),
      });
      setShowConfirmModal(true);
      return;
    }
    
    setPinnedFiles(prev => {
      const newPinned = isPinned
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId];
      
      localStorage.setItem(`pinnedFiles_${projectId}`, JSON.stringify(newPinned));
      return newPinned;
    });
  };

  /**
   * Handles the direct export of a file in the specified format.
   */
  const handleExportFile = async (file, format) => {
      try {
        const token = user?.token;
        if (!token) throw new Error('Authentication required.');

        const response = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/files/${file._id}/export?format=${format}`, {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'blob',
          }
        );

        const contentDisposition = response.headers['content-disposition'];
        
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        let filename = `${baseName}.${format}`;

        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="(.+)"/);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1];
            }
        }
        
        FileSaver.saveAs(response.data, filename);

      } catch (err) {
        console.error(`Export as ${format} failed`, err);
        setConfirmModalData({
          title: 'Export Failed',
          shortMessage: err.response?.data?.error || `Could not export the file as ${format.toUpperCase()}.`,
          onConfirm: () => setShowConfirmModal(false),
          confirmText: 'OK',
          showCancelButton: false,
        });
        setShowConfirmModal(true);
      }
  };

  /**
   * Assigns a code to a new text selection or reassigns an existing coded segment to a new code.
   * This action is integrated with the undo/redo history.
   * @param {string} newCodeId - The ID of the code definition to assign.
   * @returns {Promise<void>}
   */
  const handleAssignCode = async (newCodeId) => {
    setShowFloatingAssignCode(false);
    const token = user?.token;
    if (!token) return;
    const info = segmentToReassign ?
      { ...segmentToReassign } :
      { ...currentSelectionInfo };
    if (segmentToReassign) {
      const originalCodeId = segmentToReassign.codeDefinition._id;
      const segmentId = segmentToReassign._id;
      const reassignAction = {
        execute: async () => {
          try {
            const res = await axios.put(`${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/code/${segmentId}`, { codeId: newCodeId }, { headers: { Authorization: `Bearer ${token}` } });
            setProject(res.data.project);
            return { success: true };
          } catch (error) {
            return { success: false, error };
          }
        },
        undo: {
          execute: async () => {
            try {
              const res = await axios.put(`${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/code/${segmentId}`, { codeId: originalCodeId }, { headers: { Authorization: `Bearer ${token}` } });
              setProject(res.data.project);
              return { success: true };
            } catch (error) {
              return { success: false, error };
            }
          },
        },
      };
      await executeAction(reassignAction);
      setSegmentToReassign(null);
    } else {
      const createSegmentAction = {
        execute: async () => {
          const data = { ...info, codeDefinitionId: newCodeId, fileId: selectedFileId, fileName: selectedFileName };
          try {
            const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/code`, data, { headers: { Authorization: `Bearer ${token}` } });
            setProject(res.data.project);
            return { success: true, newSegment: res.data.newSegment };
          } catch (error) {
            return { success: false, error };
          }
        },
        undo: {
          execute: async (context) => {
            const segmentIdToDelete = context.newSegment._id;
            try {
              const res = await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/code/${segmentIdToDelete}`, { headers: { Authorization: `Bearer ${token}` } });
              setProject(res.data.project);
              return { success: true };
            } catch (error) {
              return { success: false, error };
            }
          },
        },
      };
      await executeAction(createSegmentAction);
    }
    window.getSelection().removeAllRanges();
  };

  /**
   * Initiates the code reassignment process for an existing coded segment.
   * @param {object} codedSegment - The coded segment to reassign.
   * @returns {void}
   */
  const handleReassignCodeClick = (codedSegment) => {
    const segmentElement = viewerRef.current.querySelector(`[data-code-segment-id="${codedSegment._id}"]`);
    if (segmentElement) {
      const rect = segmentElement.getBoundingClientRect();
      setFloatingAssignCodePosition({
        top: rect.bottom + window.scrollY + 5,
        left: rect.left + window.scrollX
      });
    }
    setSegmentToReassign(codedSegment);
    setShowFloatingAssignCode(true);
  };

  /**
   * Prepares and opens the memo modal to create a new memo linked to a specific coded segment.
   * @param {object} segment - The coded segment object to which the memo will be attached.
   * @returns {void}
   */
  const handleCreateMemoForSegment = useCallback((segment) => {
    if (!segment || !selectedFileId) return;

    setCurrentMemoSelectionInfo({
      text: segment.text,
      startIndex: segment.startIndex,
      endIndex: segment.endIndex,
    });

    setMemoToEdit(null);

    setShowMemoModal(true);
  }, [selectedFileId]);

  /**
   * Saves or updates a code definition on the backend.
   * @param {object} codeData - The code definition data.
   * @param {string} codeData.name - The name of the code.
   * @param {string} codeData.description - The description of the code.
   * @param {string} codeData.color - The hex color for the code.
   * @param {string} [codeData._id] - The ID of the code if it's being edited.
   * @returns {Promise<void>}
   */
  const handleSaveCodeDefinition = async ({ name, description, color, _id }) => {
    if (setDefineModalBackendErrorRef.current) {
      setDefineModalBackendErrorRef.current('');
    }
    const token = user?.token;
    if (!token) {
      const msg = 'You must be logged in to save code definitions.';
      if (setDefineModalBackendErrorRef.current) {
        setDefineModalBackendErrorRef.current(msg);
      } else {
        setError(msg);
      }
      return;
    }
    try {
      const method = _id ? 'put' : 'post';
      const url = _id ?
        `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/code-definitions/${_id}` :
        `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/code-definitions`;
      const res = await axios[method](url, { name, description, color }, { headers: { Authorization: `Bearer ${token}` } });
      const updatedProject = res.data.project;
      setProject(updatedProject);
      setCodeDefinitions(updatedProject.codeDefinitions || []);
      if (selectedFileId && updatedProject.codedSegments) {
        const updatedSegmentsForFile = updatedProject.codedSegments.filter(s => s.fileId === selectedFileId);
        setCodedSegments(updatedSegmentsForFile);
      }
      setShowDefineCodeModal(false);
      setCodeDefinitionToEdit(null);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to save code definition.';
      if (setDefineModalBackendErrorRef.current) {
        setDefineModalBackendErrorRef.current(errorMessage);
      } else {
        setError(errorMessage);
        setShowConfirmModal(true);
        setConfirmModalData({
          title: 'Save Code Definition Failed',
          shortMessage: errorMessage,
          onConfirm: () => setShowConfirmModal(false),
        });
      }
    }
  };

  /**
   * Merges multiple source codes into a single new code.
   * @param {object} mergeData - The data for the merge operation.
   * @param {string[]} mergeData.sourceCodeIds - An array of code definition IDs to merge.
   * @param {string} mergeData.newCodeName - The name for the new merged code.
   * @param {string} mergeData.newCodeColor - The color for the new merged code.
   * @returns {Promise<{success: boolean, error?: string}>} An object indicating the outcome of the operation.
   */
  const handleMergeCodes = async ({ sourceCodeIds, newCodeName, newCodeColor }) => {
    const token = user?.token;
    if (!token) return { success: false, error: 'Authentication error.' };
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/codes/merge`, { sourceCodeIds, newCodeName, newCodeColor }, { headers: { Authorization: `Bearer ${token}` } }
      );
      const updatedProject = res.data.project;
      setProject(updatedProject);
      setCodeDefinitions(updatedProject.codeDefinitions || []);
      if (selectedFileId) {
        const updatedSegmentsForFile = updatedProject.codedSegments.filter(s => s.fileId === selectedFileId);
        setCodedSegments(updatedSegmentsForFile);
      }
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to merge codes.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  /**
   * Splits a single source code into multiple new codes and reassigns its segments.
   * @param {object} splitData - The data for the split operation.
   * @param {string} splitData.sourceCodeId - The ID of the code definition to split.
   * @param {object[]} splitData.newCodeDefinitions - An array of objects defining the new codes.
   * @param {object} splitData.assignments - An object mapping segment IDs to new code definition names.
   * @returns {Promise<{success: boolean, error?: string}>} An object indicating the outcome of the operation.
   */
  const handleSplitCodes = async ({ sourceCodeId, newCodeDefinitions, assignments }) => {
    const token = user?.token;
    if (!token) return { success: false, error: 'Authentication error.' };
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/codes/split`, { sourceCodeId, newCodeDefinitions, assignments }, { headers: { Authorization: `Bearer ${token}` } }
      );
      const updatedProject = res.data.project;
      setProject(updatedProject);
      setCodeDefinitions(updatedProject.codeDefinitions || []);
      if (selectedFileId) {
        const updatedSegmentsForFile = updatedProject.codedSegments.filter(s => s.fileId === selectedFileId);
        setCodedSegments(updatedSegmentsForFile);
      }
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to finalize code split.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  /**
   * Saves a new memo or updates an existing one. This action is integrated with the undo/redo history.
   * @param {object} memoData - The memo data.
   * @param {string} memoData.title - The title of the memo.
   * @param {string} memoData.content - The content of the memo.
   * @param {string} [memoData._id] - The ID of the memo if it is being edited.
   * @returns {Promise<void>}
   */
  const handleSaveMemo = async ({ title, content, _id }) => {
    const token = user?.token;
    if (!token) return;
    const isEditing = !!_id;
    const originalMemo = isEditing ? memos.find(m => m._id === _id) : null;
    const memoData = {
      title,
      content,
      fileId: selectedFileId,
      fileName: selectedFileName,
      text: _id ? originalMemo.text : (currentMemoSelectionInfo ? currentMemoSelectionInfo.text : ''),
      startIndex: _id ? originalMemo.startIndex : (currentMemoSelectionInfo ? currentMemoSelectionInfo.startIndex : -1),
      endIndex: _id ? originalMemo.endIndex : (currentMemoSelectionInfo ? currentMemoSelectionInfo.endIndex : -1),
    };
    const saveAction = {
      execute: async () => {
        try {
          const method = isEditing ? 'put' : 'post';
          const url = isEditing ?
            `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/memos/${_id}` :
            `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/memos`;
          const res = await axios[method](url, memoData, { headers: { Authorization: `Bearer ${token}` } });
          setProject(res.data.project);
          return { success: true, newMemo: res.data.newMemo, wasEditing: isEditing };
        } catch (error) {
          return { success: false, error };
        }
      },
      undo: {
        execute: async (context) => {
          if (context.wasEditing) {
            try {
              const res = await axios.put(`${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/memos/${_id}`, originalMemo, { headers: { Authorization: `Bearer ${token}` } });
              setProject(res.data.project);
              return { success: true };
            } catch (error) { return { success: false, error }; }
          } else {
            const memoIdToDelete = context.newMemo._id;
            try {
              const res = await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/memos/${memoIdToDelete}`, { headers: { Authorization: `Bearer ${token}` } });
              setProject(res.data.project);
              return { success: true };
            } catch (error) { return { success: false, error }; }
          }
        }
      }
    };
    const result = await executeAction(saveAction);
    if (result.success) {
      setShowMemoModal(false);
      setShowFloatingMemoInput(false);
      setMemoToEdit(null);
      window.getSelection().removeAllRanges();
    } else {
      setError(result.error?.response?.data?.error || 'Failed to save memo.');
    }
  };

  /**
   * Deletes a memo. This action is integrated with the undo/redo history.
   * @param {string} memoId - The ID of the memo to delete.
   * @returns {void}
   */
  const handleDeleteMemo = (memoId) => {
    const performDelete = async () => {
      const token = user?.token;
      if (!token) return;
      const memoToDelete = memos.find(m => m._id === memoId);
      if (!memoToDelete) return;
      const deleteAction = {
        execute: async () => {
          try {
            const res = await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/memos/${memoId}`, { headers: { Authorization: `Bearer ${token}` } });
            setProject(res.data.project);
            return { success: true };
          } catch (error) {
            return { success: false, error };
          }
        },
        undo: {
          execute: async () => {
            try {
              const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/memos`, memoToDelete, { headers: { Authorization: `Bearer ${token}` } });
              setProject(res.data.project);
              return { success: true, newMemo: res.data.newMemo };
            } catch (error) {
              return { success: false, error };
            }
          }
        }
      };
      await executeAction(deleteAction);
      setShowConfirmModal(false);
      setActiveMemoId(null);
    };

    setConfirmModalData({
      title: 'Confirm Memo Deletion',
      shortMessage: `Are you sure you want to delete this memo?`,
      onConfirm: performDelete,
    });
    setShowConfirmModal(true);
  };

   /**
   * Prompts the user and then permanently deletes an imported file and all its associated data.
   * This action is destructive and cannot be undone.
   * @param {string} fileId - The ID of the file to delete.
   * @param {string} fileName - The name of the file, used in the confirmation prompt.
   * @returns {void}
   */
  const handleDeleteFile = (fileId, fileName) => {
    setConfirmModalData({
      title: 'Confirm File Deletion',
      shortMessage: (
        <p>
          This will <strong>permanently remove "{fileName}" and all associated data.</strong>
          <br /><br />
          <span className="font-bold text-red-500">THIS ACTION CANNOT BE UNDONE.</span>
          <br /><br />
          To confirm, please type the file name below.
        </p>
      ),
      onConfirm: async () => {
        const token = user?.token;
        if (!token) return setError('Authentication error.');
        try {
          const res = await axios.delete(
            `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/files/${fileId}`, 
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (setFileInEditMode) setFileInEditMode(null);
          setProject(res.data.project);
          const remainingFiles = res.data.project.importedFiles;
          if (remainingFiles.length > 0) {
            handleSelectFile(remainingFiles[0]);
          } else {
            setSelectedFileId(null);
            setSelectedFileName('');
            setSelectedContent('');
            setSelectedFileAudioUrl(null);
          }
          setShowConfirmModal(false);
        } catch (err) {
          if (setFileInEditMode) setFileInEditMode(null);
          setError(err.response?.data?.error || 'Failed to delete file');
          setShowConfirmModal(false);
        }
      },
      showInput: true,
      promptText: fileName,
      confirmText: "Delete",
    });
    setShowConfirmModal(true);
  };

  /**
   * Prompts the user and then permanently deletes a code definition and all its coded segments.
   * This action is destructive and cannot be undone.
   * @param {string} codeDefId - The ID of the code definition to delete.
   * @returns {void}
   */
  const handleDeleteCodeDefinition = (codeDefId) => {
    const segmentCount = project.codedSegments.filter(
      (seg) => seg.codeDefinition?._id === codeDefId
    ).length;
    const segmentsMessage = (
      <>
        This will permanently remove the code and all{' '}
        <strong className="font-black text-red-500">
          {segmentCount}
        </strong>
        {' '}of its associated coded segment{segmentCount !== 1 ? 's' : ''} across all documents.
      </>
    );
    setConfirmModalData({
      title: 'Confirm Code Deletion',
      shortMessage: (
        <p>
          {segmentsMessage}
          <br /><br />
          <span className="font-bold text-red-500">
            THIS ACTION CANNOT BE UNDONE.
          </span>
          <br /><br />
          Are you sure you want to delete this code definition?
        </p>
      ),
      showInput: true,
      promptText: "I confirm",
      confirmText: "Delete",
      onConfirm: async () => {
        const token = user?.token;
        if (!token) return setError('Authentication error.');
        try {
          const res = await axios.delete(
            `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/code-definitions/${codeDefId}`, { headers: { Authorization: `Bearer ${token}` } }
          );
          const updatedProject = res.data.project;
          setProject(updatedProject);
          setCodeDefinitions(updatedProject.codeDefinitions || []);
          if (selectedFileId) {
            const updatedSegmentsForFile = updatedProject.codedSegments.filter(s => s.fileId === selectedFileId);
            setCodedSegments(updatedSegmentsForFile);
          }
          setShowConfirmModal(false);
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to delete code definition');
          setShowConfirmModal(false);
        }
      },
    });
    setShowConfirmModal(true);
  };

  /**
   * Deletes a single coded segment. This action is integrated with the undo/redo history.
   * @param {string} segmentId - The ID of the coded segment to delete.
   * @param {string} codeNameForConfirm - The name of the code, used in the confirmation prompt.
   * @returns {void}
   */
  const handleDeleteCodedSegment = (segmentId, codeNameForConfirm) => {
    const performDelete = async () => {
      const token = user?.token;
      if (!token) return;
      const segmentToDelete = codedSegments.find(s => s._id === segmentId);
      if (!segmentToDelete) return;
      const deleteAction = {
        execute: async () => {
          try {
            const res = await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/code/${segmentId}`, { headers: { Authorization: `Bearer ${token}` } });
            setProject(res.data.project);
            return { success: true };
          } catch (error) { return { success: false, error }; }
        },
        undo: {
          execute: async () => {
            const data = {
              text: segmentToDelete.text,
              startIndex: segmentToDelete.startIndex,
              endIndex: segmentToDelete.endIndex,
              codeDefinitionId: segmentToDelete.codeDefinition._id,
              fileId: segmentToDelete.fileId,
              fileName: segmentToDelete.fileName,
            };
            try {
              const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/code`, data, { headers: { Authorization: `Bearer ${token}` } });
              setProject(res.data.project);
              return { success: true, newSegment: res.data.newSegment };
            } catch (error) { return { success: false, error }; }
          }
        }
      };
      await executeAction(deleteAction);
      setShowConfirmModal(false);
    };

    setConfirmModalData({
      title: 'Confirm Coded Segment Deletion',
      shortMessage: `Are you sure you want to delete this coded segment ("${codeNameForConfirm}"...)?`,
      onConfirm: performDelete,
    });
    setShowConfirmModal(true);
  };

  /**
   * Exports table data from the project to an Excel file based on the specified format.
   * @param {string} format - The format of the export ('overall', 'byDocument', or 'overlaps').
   * @returns {Promise<void>}
   */
  const handleExportToExcel = async (format) => {
    if (!projectId) return;
    try {
      const token = user?.token;
      if (!token) return;

      let url;
      let defaultFilename;

      if (format === 'overlaps') {
        url = `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/export-overlaps`;
        defaultFilename = `${projectName}_overlaps.xlsx`;
      } else {
        url = `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/export-coded-segments?format=${format}`;
        defaultFilename = `${projectName}_coded_segments_${format}.xlsx`;
      }

      const response = await axios.get(url, { 
        headers: { Authorization: `Bearer ${token}` }, 
        responseType: 'blob' 
      });
      
      const contentDisposition = response.headers['content-disposition'];
      let filename = defaultFilename;
      if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch && filenameMatch[1]) {
              filename = filenameMatch[1];
          }
      }

      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error(`Error exporting ${format} data:`, err);
      let errorMessage = `Failed to export ${format} data.`;
       if (err.response && err.response.data) {
        try {
          const errorJson = JSON.parse(await err.response.data.text());
          errorMessage = errorJson.error || errorMessage;
        } catch (parseError) {
          errorMessage = err.response.statusText || errorMessage;
        }
      }
      setConfirmModalData({
        title: 'Export Failed',
        shortMessage: errorMessage,
        onConfirm: () => setShowConfirmModal(false),
      });
      setShowConfirmModal(true);
    }
  };

  /**
   * Exports coded segments for the currently selected file to an Excel file.
   * @returns {Promise<void>}
   */
  const handleExportFileCodedSegments = async () => {
    if (!selectedFileId) return;
    const fileCodedSegments = project?.codedSegments?.filter(segment => segment.fileId?.toString() === selectedFileId) || [];
    if (fileCodedSegments.length === 0) return;
    try {
      const token = user?.token;
      if (!token) return;
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/export-coded-segments-file/${selectedFileId}`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error((await response.json()).error || 'Export failed');
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'coded_segments.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) filename = filenameMatch[1];
      } else {
        const selectedFile = project?.importedFiles?.find(file => file._id.toString() === selectedFileId);
        if (selectedFile) filename = `${selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')}_coded_segments.xlsx`;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) { console.error('Export error:', error); }
  };

  /**
   * Exports all overlapping code segments from the project to an Excel file.
   * @returns {Promise<void>}
   */
  const handleExportOverlaps = async () => {
    if (!projectId) return;
    try {
      const token = user?.token;
      if (!token) return;

      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/export-overlaps`,
        { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' }
      );

      const contentDisposition = response.headers['content-disposition'];
      let filename = `${projectName}_overlaps.xlsx`;
      if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch && filenameMatch[1]) {
              filename = filenameMatch[1];
          }
      }

      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting overlaps:', err);
      let errorMessage = 'Failed to export overlaps.';
      if (err.response && err.response.data) {
        try {
          const errorJson = JSON.parse(await err.response.data.text());
          errorMessage = errorJson.error || errorMessage;
        } catch (parseError) {
          errorMessage = err.response.statusText || errorMessage;
        }
      }
      setConfirmModalData({
        title: 'Export Failed',
        shortMessage: errorMessage,
        onConfirm: () => setShowConfirmModal(false),
      });
      setShowConfirmModal(true);
    }
  };

  /**
   * Exports all memos from the currently selected file to an Excel file.
   * @returns {Promise<void>}
   */
  const handleExportMemos = async () => {
    if (!selectedFileId) return;
    try {
      const token = user?.token;
      if (!token) return;
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/files/${selectedFileId}/export-memos`, 
        { 
          headers: { Authorization: `Bearer ${token}` }, 
          responseType: 'blob' 
        }
      );
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const contentDisposition = response.headers['content-disposition'];
      let filename = 'memos.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch && filenameMatch.length > 1) {
          filename = filenameMatch[1];
        }
      } else {
        const selectedFile = project?.importedFiles.find(f => f._id === selectedFileId);
        filename = `${selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, "") : "Memos"}_memos.xlsx`;
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) { 
      console.error('Export memos failed:', err); 
      setConfirmModalData({
          title: 'Export Failed',
          shortMessage: err.response?.data?.error || 'Could not export memos for this file.',
          onConfirm: () => setShowConfirmModal(false),
      });
      setShowConfirmModal(true);
    }
  };

  /**
   * Navigates to the next search match in the viewer.
   * @returns {void}
   */
  const goToNextMatch = () => { if (viewerSearchMatches.length > 0) setCurrentMatchIndex(prev => (prev + 1) % viewerSearchMatches.length); };

  /**
   * Navigates to the previous search match in the viewer.
   * @returns {void}
   */
  const goToPrevMatch = () => { if (viewerSearchMatches.length > 0) setCurrentMatchIndex(prev => (prev - 1 + viewerSearchMatches.length) % viewerSearchMatches.length); };

  /**
   * Handles changes to the viewer's search input field.
   * @param {React.ChangeEvent<HTMLInputElement>} e - The input change event.
   * @returns {void}
   */
  const handleViewerSearchChange = (e) => {
    const query = e.target.value;
    setViewerSearchQuery(query);
    if (query) {
      setActiveCodedSegmentId(null);
      if (showCodeColors) setShowCodeColors(false);
    }
  };

  /**
   * Clears the current search in the viewer.
   * @returns {void}
   */
  const handleClearViewerSearch = () => {
    setViewerSearchQuery('');
    setViewerSearchMatches([]);
    setCurrentMatchIndex(-1);
    viewerSearchInputRef.current?.focus();
  };

  /**
   * Handles the action of applying a code to the current text selection.
   * @param {{text: string, startIndex: number, endIndex: number}|null} [selectionInfoOverride=null] - Optional selection info to use instead of the current window selection.
   * @returns {Promise<void>}
   */
  const handleCodeSelectionAction = useCallback(async (selectionInfoOverride = null) => {
    const info = selectionInfoOverride || getSelectionInfo();
    if (!info || !selectedFileId) {
      setShowConfirmModal(true);
      setConfirmModalData({ 
        title: 'Code Error', 
        shortMessage: 'Please select text in a document to apply a code.', 
        onConfirm: () => setShowConfirmModal(false),
        confirmText: 'OK',
        showCancelButton: false
      });
      return;
    }
    setCurrentSelectionInfo(info);
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const rects = range.getClientRects();
    if (rects.length === 0) return;
    const firstRect = rects[0];
    const lastRect = rects[rects.length - 1];
    const panelWidth = 240;
    const panelHeight = 250;
    const margin = 10;
    let desiredTop = lastRect.bottom + window.scrollY + 8;
    let desiredLeft = lastRect.right + window.scrollX;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    if (desiredLeft + panelWidth > viewportWidth - margin) {
      desiredLeft = lastRect.right + window.scrollX - panelWidth;
    }
    if (desiredTop + panelHeight > viewportHeight - margin) {
      desiredTop = firstRect.top + window.scrollY - panelHeight - 8;
    }
    if (desiredTop < window.scrollY + margin) {
      desiredTop = window.scrollY + margin;
    }
    if (desiredLeft < window.scrollX + margin) {
      desiredLeft = window.scrollX + margin;
    }
    setFloatingAssignCodePosition({ top: desiredTop, left: desiredLeft });
    setShowFloatingAssignCode(true);
    window.getSelection().removeAllRanges();
  }, [selectedFileId, getSelectionInfo]);

  /**
   * Handles the action of applying a highlight to the current text selection.
   * @param {{text: string, startIndex: number, endIndex: number}|null} [selectionInfoOverride=null] - Optional selection info to use instead of the current window selection.
   * @returns {Promise<void>}
   */
  const handleHighlightSelectionAction = useCallback(async (selectionInfoOverride = null) => {
    const info = selectionInfoOverride || getSelectionInfo();
    if (!info || !selectedFileId) {
      setShowConfirmModal(true);
      setConfirmModalData({ 
        title: 'Highlight Error', 
        shortMessage: 'Please select text in a document.', 
        onConfirm: () => setShowConfirmModal(false),
        confirmText: 'OK',
        showCancelButton: false
      });
      return;
    }
    const token = user?.token;
    if (!token) return;
    const createHighlightAction = {
      execute: async () => {
        try {
          const data = { fileName: selectedFileName, fileId: selectedFileId, text: info.text, color: selectedHighlightColor, startIndex: info.startIndex, endIndex: info.endIndex };
          const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/highlight`, data, { headers: { Authorization: `Bearer ${token}` } });
          setProject(res.data.project);
          return { success: true, newHighlight: res.data.newHighlight };
        } catch (error) { return { success: false, error }; }
      },
      undo: {
        execute: async (context) => {
          try {
            const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/highlight/delete-bulk`, { ids: [context.newHighlight._id] }, { headers: { Authorization: `Bearer ${token}` } });
            setProject(res.data.project);
            return { success: true };
          } catch (error) { return { success: false, error }; }
        }
      }
    };
    await executeAction(createHighlightAction);
    window.getSelection().removeAllRanges();
  }, [selectedFileId, selectedHighlightColor, projectId, selectedFileName, getSelectionInfo, user, executeAction]);

  /**
   * Handles the action of creating a memo for the current text selection.
   * @param {{text: string, startIndex: number, endIndex: number}|null} [selectionInfoOverride=null] - Optional selection info to use instead of the current window selection.
   * @returns {Promise<void>}
   */
  const handleMemoSelectionAction = useCallback(async (selectionInfoOverride = null) => {
    const info = selectionInfoOverride || getSelectionInfo();
    if (!selectedFileId) {
      setShowConfirmModal(true);
      setConfirmModalData({ 
        title: 'Memo Error', 
        shortMessage: 'Please select a document to create a memo.', 
        onConfirm: () => setShowConfirmModal(false),
        confirmText: 'OK',
        showCancelButton: false
      });
      return;
    }
    setCurrentMemoSelectionInfo(info || { text: '', startIndex: -1, endIndex: -1 });
    setMemoToEdit(null);
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const rects = range.getClientRects();
    if (rects.length === 0) return;
    const firstRect = rects[0];
    const lastRect = rects[rects.length - 1];
    const panelWidth = 320;
    const panelHeight = 300;
    const margin = 10;
    let desiredTop = lastRect.bottom + window.scrollY + 8;
    let desiredLeft = lastRect.right + window.scrollX;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    if (desiredLeft + panelWidth > viewportWidth - margin) {
      desiredLeft = lastRect.right + window.scrollX - panelWidth;
    }
    if (desiredTop + panelHeight > viewportHeight - margin) {
      desiredTop = firstRect.top + window.scrollY - panelHeight - 8;
    }
    if (desiredTop < window.scrollY + margin) {
      desiredTop = window.scrollY + margin;
    }
    if (desiredLeft < window.scrollX + margin) {
      desiredLeft = window.scrollX + margin;
    }
    setFloatingMemoInputPosition({ top: desiredTop, left: desiredLeft });
    setShowFloatingMemoInput(true);
    window.getSelection().removeAllRanges();
  }, [selectedFileId, getSelectionInfo]);

  /**
   * Handles the action of erasing highlights within the current text selection.
   * @returns {Promise<void>}
   */
  const handleEraseSelectionAction = useCallback(async () => {
    const selectionInfo = getSelectionInfo();
    if (!selectionInfo || !selectedFileId) return;
    const { startIndex, endIndex } = selectionInfo;
    const highlightsToDelete = inlineHighlights
      .filter(highlight => Math.max(startIndex, highlight.startIndex) < Math.min(endIndex, highlight.endIndex));
    if (highlightsToDelete.length === 0) {
      window.getSelection().removeAllRanges();
      return;
    }
    const token = user?.token;
    if (!token) return;
    const eraseAction = {
      execute: async () => {
        try {
          const idsToDelete = highlightsToDelete.map(h => h._id);
          const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/highlight/delete-bulk`, { ids: idsToDelete }, { headers: { Authorization: `Bearer ${token}` } });
          setProject(res.data.project);
          return { success: true };
        } catch (error) { return { success: false, error }; }
      },
      undo: {
        execute: async () => {
          try {
            const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/highlight/create-bulk`, { highlights: highlightsToDelete }, { headers: { Authorization: `Bearer ${token}` } });
            setProject(res.data.project);
            return { success: true };
          } catch (error) { return { success: false, error }; }
        }
      }
    };
    await executeAction(eraseAction);
    window.getSelection().removeAllRanges();
  }, [selectedFileId, inlineHighlights, projectId, getSelectionInfo, user, executeAction]);

  /**
   * Handles the mouse up event in the viewer, triggering the floating toolbar or an active tool's action.
   * @returns {void}
   */
  const handleViewerMouseUp = useCallback(() => {

    if (isInEditMode) {
      return;
    }
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const selectedText = selection.toString();
    setShowFloatingAssignCode(false);
    setShowFloatingMemoInput(false);
    setShowFloatingToolbar(false);
    if (selectedText.trim().length === 0 || !selectedFileId || !viewerRef.current || !viewerRef.current.contains(selection.anchorNode)) {
      return;
    }
    const trimmedText = selectedText.trimEnd();
    const trailingWhitespaceLength = selectedText.length - trimmedText.length;
    let adjustedRange = range;
    if (trailingWhitespaceLength > 0) {
      adjustedRange = range.cloneRange();
      adjustedRange.setEnd(adjustedRange.endContainer, adjustedRange.endOffset - trailingWhitespaceLength);
    }
    const selectionInfo = getSelectionInfo(adjustedRange);
    if (!selectionInfo) return;
    setCurrentSelectionRange(adjustedRange);
    if (activeTool === 'code') {
      handleCodeSelectionAction(selectionInfo);
    } else if (activeTool === 'memo') {
      handleMemoSelectionAction(selectionInfo);
    } else if (activeTool === 'highlight') {
      handleHighlightSelectionAction(selectionInfo);
    } else if (activeTool === 'erase') {
      handleEraseSelectionAction();
    } else {
      const rects = adjustedRange.getClientRects();
      if (rects.length === 0) return;
      const lastRect = rects[rects.length - 1];
      const toolbarWidth = 150;
      const toolbarHeight = 36;
      const margin = 10;
      let desiredTop = lastRect.bottom + window.scrollY + 8;
      let desiredLeft = lastRect.right + window.scrollX - 10;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      if (desiredLeft + toolbarWidth > viewportWidth - margin) {
        desiredLeft = lastRect.right + window.scrollX - toolbarWidth;
      }
      if (desiredTop + toolbarHeight > viewportHeight - margin) {
        const firstRect = rects[0];
        desiredTop = firstRect.top + window.scrollY - toolbarHeight - 8;
      }
      if (desiredTop < window.scrollY + margin) {
        desiredTop = window.scrollY + margin;
      }
      if (desiredLeft < window.scrollX + margin) {
        desiredLeft = window.scrollX + margin;
      }
      setFloatingToolbarPosition({ top: desiredTop, left: desiredLeft });
      setShowFloatingToolbar(true);
    }
  }, [activeTool, selectedFileId, handleCodeSelectionAction, handleMemoSelectionAction, handleHighlightSelectionAction, handleEraseSelectionAction, getSelectionInfo]);

  /**
   * Handles closing the "Define Code" modal and resetting related state.
   * @returns {void}
   */
  const handleDefineCodeModalClose = () => {
    setShowDefineCodeModal(false);
    setCodeDefinitionToEdit(null);
    if (setDefineModalBackendErrorRef.current) {
      setDefineModalBackendErrorRef.current('');
    }
  };

  /**
   * Groups coded segments by code name for display in the side panel.
   * @type {Array<object>}
   */
  const groupedCodedSegments = useMemo(() => {
    const groups = {};
    codedSegments.forEach(segment => {
      const codeName = segment.codeDefinition?.name || 'Uncategorized';
      const codeColor = segment.codeDefinition?.color || '#cccccc';
      if (!groups[codeName]) {
        groups[codeName] = { color: codeColor, segments: [] };
      }
      groups[codeName].segments.push(segment);
    });
    return Object.keys(groups).sort().map(codeName => ({
      name: codeName,
      color: groups[codeName].color,
      segments: groups[codeName].segments
    }));
  }, [codedSegments]);

  /**
   * Processes memos for display, adding computed properties like `displayTitle`.
   * @type {Array<object>}
   */
  const groupedMemos = useMemo(() => {
    return memos.map(memo => ({
      ...memo,
      displayTitle: memo.title || (memo.text ? `Memo on "${memo.text.substring(0, 30)}..."` : 'Document Memo'),
      isSegmentMemo: memo.startIndex !== -1 && memo.endIndex !== -1,
    })).sort((a, b) => a.startIndex - b.startIndex);
  }, [memos]);

  /**
   * Effect to handle clicks outside of floating UI elements to close them.
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      const isModalClick = event.target.closest('.define-code-modal-content, .confirmation-modal-content, .memo-modal-content');
      const isFloatingUiClick = event.target.closest('.floating-toolbar, .floating-assign-code, .floating-memo-input, .color-dropdown-menu, .code-dropdown-menu');
      if (!isModalClick && !isFloatingUiClick) {
        setShowFloatingToolbar(false);
        setShowFloatingAssignCode(false);
        setShowFloatingMemoInput(false);
        setShowHighlightColorDropdown(false);
        setShowCodeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Effect to focus the search input when the left panel is expanded.
   */
  useEffect(() => {
    if (!isLeftPanelCollapsed && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isLeftPanelCollapsed]);

  /**
   * Effect to scroll the left panel to the top when the search query changes.
   */
  useEffect(() => {
    if (leftPanelRef.current) {
      leftPanelRef.current.scrollTop = 0;
    }
  }, [searchQuery]);

  /**
   * Effect to fetch project data when the component mounts or the project ID changes.
   */
  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    fetchProject();
  }, [projectId, fetchProject]);

  /**
   * Effect to synchronize the selected file state when the project data updates.
   * It ensures the correct file's content and annotations are displayed.
   */
  useEffect(() => {
    if (project && selectedFileId) {
      const currentFile = project.importedFiles.find(f => f._id === selectedFileId);
      if (currentFile) {
        handleSelectFile(currentFile);
      }
    } else if (project && project.importedFiles?.length > 0 && !selectedFileId) {
      handleSelectFile(project.importedFiles[0]);
    }
  }, [project, selectedFileId, handleSelectFile]);

  /**
   * Effect to scroll to a specific annotation in the viewer when its ID is set.
   */
  useEffect(() => {
    if (annotationToScrollToId && viewerRef.current) {
      let element = viewerRef.current.querySelector(`[data-code-segment-id="${annotationToScrollToId}"], [data-memo-id="${annotationToScrollToId}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setAnnotationToScrollToId(null);
      }
    }
  }, [annotationToScrollToId]);

  /**
   * Effect to find and update search matches in the viewer content whenever the search query changes.
   */
  useEffect(() => {
    if (!viewerSearchQuery || !selectedContent) {
      setViewerSearchMatches([]);
      setCurrentMatchIndex(-1);
      return;
    }
    const searchRegex = new RegExp(viewerSearchQuery, 'gi');
    const matches = Array.from(selectedContent.matchAll(searchRegex)).map(match => ({
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      text: match[0],
    }));
    setViewerSearchMatches(matches);
    setCurrentMatchIndex(matches.length > 0 ? 0 : -1);
  }, [viewerSearchQuery, selectedContent]);

  /**
   * Effect to scroll the active search match into view when the current match index changes.
   */
  useEffect(() => {
    if (viewerSearchMatches.length > 0 && currentMatchIndex !== -1 && viewerRef.current) {
      const activeHighlightElement = viewerRef.current.querySelector('.viewer-search-highlight-active');
      if (activeHighlightElement) {
        activeHighlightElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentMatchIndex, viewerSearchMatches]);

  return {
    projectName,
    navigate,
    project,
    projectId,
    loading,
    error,
    setError,
    transcriptionStatus,
    handleAudioImport,
    handleTextImport,
    selectedContent,
    setSelectedContent,
    selectedFileName,
    setSelectedFileName,
    selectedFileId,
    setSelectedFileId,
    selectedFileAudioUrl,
    codedSegments,
    setCodedSegments,
    inlineHighlights,
    setInlineHighlights,
    codeDefinitions,
    setCodeDefinitions,
    memos,
    setMemos,
    handleReassignCodeClick,
    setSegmentToReassign,
    leftPanelRef,
    isLeftPanelCollapsed,
    setIsLeftPanelCollapsed,
    showImportedFiles,
    setShowImportedFiles,
    showCodeDefinitions,
    setShowCodeDefinitions,
    showCodedSegments,
    setShowCodedSegments,
    handleMergeCodes,
    handleSplitCodes,
    showMemosPanel,
    setShowMemosPanel,
    selectedHighlightColor,
    setSelectedHighlightColor,
    showHighlightColorDropdown,
    setShowHighlightColorDropdown,
    highlightColors,
    showCodeColors,
    setShowCodeColors,
    showCodeDropdown,
    setShowCodeDropdown,
    selectedCodeColor,
    setSelectedCodeColor,
    showDefineCodeModal,
    setShowDefineCodeModal,
    codeDefinitionToEdit,
    setCodeDefinitionToEdit,
    currentSelectionInfo,
    setCurrentSelectionInfo,
    currentSelectionRange,
    setCurrentSelectionRange,
    isInEditMode, 
    activeTool,
    setActiveTool,
    showMemoModal,
    setShowMemoModal,
    memoToEdit,
    setMemoToEdit,
    currentMemoSelectionInfo,
    setCurrentMemoSelectionInfo,
    showFloatingToolbar,
    setShowFloatingToolbar,
    floatingToolbarPosition,
    setFloatingToolbarPosition,
    showFloatingAssignCode,
    setShowFloatingAssignCode,
    floatingAssignCodePosition,
    setFloatingAssignCodePosition,
    showFloatingMemoInput,
    setShowFloatingMemoInput,
    floatingMemoInputPosition,
    setFloatingMemoInputPosition,
    showConfirmModal,
    setShowConfirmModal,
    confirmModalData,
    setConfirmModalData,
    showCodedSegmentsTableModal,
    setShowCodedSegmentsTableModal,
    searchQuery,
    setSearchQuery,
    searchInputRef,
    viewerSearchQuery,
    setViewerSearchQuery,
    viewerSearchInputRef,
    viewerSearchMatches,
    setViewerSearchMatches,
    currentMatchIndex,
    setCurrentMatchIndex,
    activeCodedSegmentId,
    setActiveCodedSegmentId,
    activeMemoId,
    setActiveMemoId,
    annotationToScrollToId,
    setAnnotationToScrollToId,
    expandedCodes,
    setExpandedCodes,
    expandedMemos,
    setExpandedMemos,
    viewerRef,
    setDefineModalBackendErrorRef,
    toggleCodeGroup,
    toggleMemoGroup,
    handleDefineModalErrorSetter,
    fetchProject,
    createRangeFromOffsets,
    handleFileChange,
    handleSelectFile,
    goToNextMatch,
    goToPrevMatch,
    handleViewerSearchChange,
    handleClearViewerSearch,
    getSelectionInfo,
    handleCodeSelectionAction,
    handleHighlightSelectionAction,
    handleMemoSelectionAction,
    handleEraseSelectionAction,
    handleViewerMouseUp,
    handleAssignCode,
    handleSaveCodeDefinition,
    handleDefineCodeModalClose,
    handleSaveMemo,
    handleDeleteMemo,
    handleDeleteFile,
    handleRenameFile,
    handlePinFile,
    pinnedFiles,
    handleExportFile,
    handleDeleteCodeDefinition,
    handleDeleteCodedSegment,
    handleExportToExcel,
    handleExportFileCodedSegments,
    handleExportOverlaps,
    handleExportMemos,
    handleCommitNewFile,
    handleUpdateFileContent,
    groupedCodedSegments,
    groupedMemos,
    handleCreateMemoForSegment,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}