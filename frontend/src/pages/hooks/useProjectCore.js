import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext.jsx';

/**
 * Core project state management hook.
 * Handles project data fetching, basic state, and UI panel states.
 */
export const useProjectCore = (idFromProp = null) => {
  const { user } = useAuth();
  const { id: idFromParams } = useParams();
  const projectId = idFromProp || idFromParams;

  // Project data state
  const [project, setProject] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [transcriptionStatus, setTranscriptionStatus] = useState({
    isActive: false,
    message: '',
    progress: 0,
  });

  // 🔄 Sync State (New)
  const [lastSeenSyncVersion, setLastSeenSyncVersion] = useState(null);
  const isRefetchingRef = useRef(false); // Guard to prevent double fetches

  // File selection state
  const [selectedContent, setSelectedContent] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [selectedFileAudioUrl, setSelectedFileAudioUrl] = useState(null);

  // Annotation data state
  const [codedSegments, setCodedSegments] = useState([]);
  const [inlineHighlights, setInlineHighlights] = useState([]);
  const [codeDefinitions, setCodeDefinitions] = useState([]);
  const [memos, setMemos] = useState([]);

  // UI panel states
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [showImportedFiles, setShowImportedFiles] = useState(true);
  const [showCodeDefinitions, setShowCodeDefinitions] = useState(true);
  const [showCodedSegments, setShowCodedSegments] = useState(true);
  const [showMemosPanel, setShowMemosPanel] = useState(true);

  // Color and dropdown states
  const [selectedHighlightColor, setSelectedHighlightColor] = useState('#00FF00');
  const [showHighlightColorDropdown, setShowHighlightColorDropdown] = useState(false);
  const [showCodeColors, setShowCodeColors] = useState(true);
  const [showCodeDropdown, setShowCodeDropdown] = useState(false);
  const [selectedCodeColor, setSelectedCodeColor] = useState('#FFA500');

  // Modal states
  const [showDefineCodeModal, setShowDefineCodeModal] = useState(false);
  const [codeDefinitionToEdit, setCodeDefinitionToEdit] = useState(null);
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [memoToEdit, setMemoToEdit] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState({
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [showCodedSegmentsTableModal, setShowCodedSegmentsTableModal] = useState(false);

  const [showFloatingMemoInput, setShowFloatingMemoInput] = useState(false);
  const [floatingMemoInputPosition, setFloatingMemoInputPosition] = useState({ top: 0, left: 0 });

  // Active state tracking
  const [activeCodedSegmentId, setActiveCodedSegmentId] = useState(null);
  const [activeMemoId, setActiveMemoId] = useState(null);
  const [annotationToScrollToId, setAnnotationToScrollToId] = useState(null);

  // Expansion states
  const [expandedCodes, setExpandedCodes] = useState({});
  const [expandedMemos, setExpandedMemos] = useState({});

  // Refs
  const leftPanelRef = useRef(null);
  const viewerRef = useRef(null);
  const setDefineModalBackendErrorRef = useRef(null);

  // Pinned files state
  const [pinnedFiles, setPinnedFiles] = useState([]);

  // Highlight color definitions
  const highlightColors = [
    { name: 'Yellow', value: '#FFFF00', cssClass: 'bg-yellow-300' },
    { name: 'Green', value: '#00FF00', cssClass: 'bg-green-300' },
    { name: 'Blue', value: '#ADD8E6', cssClass: 'bg-blue-300' },
    { name: 'Pink', value: '#FFC0CB', cssClass: 'bg-pink-300' },
  ];

  // =========================================================================
  // 🟢 FIX START: Keep Sync Version Updated
  // =========================================================================
  // Whenever 'project' updates (whether from fetch, file manager commit, or sync),
  // we must update lastSeenSyncVersion. This prevents the "Version Mismatch"
  // loop when useFileManager updates the project state directly.
  useEffect(() => {
    if (project && project.syncVersion !== undefined) {
      setLastSeenSyncVersion(project.syncVersion);
    }
  }, [project]);
  // =========================================================================
  // 🟢 FIX END
  // =========================================================================

  /**
   * Synchronizes local optimistic updates with the global project cache.
   * This ensures data persists when switching files without a full refetch.
   */
  const syncGlobalProjectState = useCallback((collection, action, payload) => {
    setProject(prev => {
      if (!prev) return prev;
      const clone = { ...prev };
      const list = clone[collection]; // e.g., 'codedSegments', 'memos'
      
      if (!list) return prev;

      if (action === 'add') {
         // FIXED: Prevent duplicates by checking if ID already exists
         if (!list.find(item => item._id === payload._id)) {
           clone[collection] = [...list, payload];
         }
      } else if (action === 'update') {
         // payload is the updated item
         clone[collection] = list.map(item => item._id === payload._id ? payload : item);
      } else if (action === 'delete') {
         // payload is the ID string
         clone[collection] = list.filter(item => item._id !== payload);
      } else if (action === 'delete-bulk') {
         // payload is an array of ID strings
         clone[collection] = list.filter(item => !payload.includes(item._id));
      }
      
      // 🔄 Sync Update: If we mutate locally, we assume version incremented on server.
      // We bump it locally so the next focus check doesn't false-positive refetch.
      if (clone.syncVersion !== undefined) {
          clone.syncVersion += 1;
          // The new useEffect will handle updating lastSeenSyncVersion state
      }

      return clone;
    });
  }, []);

  /**
   * Toggles the expanded/collapsed state of a coded segment group in the UI.
   * @param {string} codeName - The name of the code group to toggle.
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
   */
  const toggleMemoGroup = (memoId) => {
    setExpandedMemos(prev => ({
      ...prev,
      [memoId]: !prev[memoId]
    }));
  };

  /**
   * Registers a state setter function from a child modal component.
   * @param {function} setter - The state setter function for the modal's error message state.
   */
  const handleDefineModalErrorSetter = useCallback((setter) => {
    setDefineModalBackendErrorRef.current = setter;
  }, []);

  /**
   * Handles the selection of a file from the list, updating the viewer and related annotation states.
   * @param {object} file - The file object to display.
   */
  const handleSelectFile = useCallback((file, projectOverride = null) => {

    const currentProject = projectOverride || project;

    if (!file || !currentProject) {
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

    const filteredCodes = currentProject.codedSegments?.filter(seg => seg.fileId === file._id) || [];
    filteredCodes.sort((a, b) => a.startIndex - b.startIndex);
    setCodedSegments(filteredCodes);

    const filteredHighlights = currentProject.inlineHighlights?.filter(hl => hl.fileId === file._id) || [];
    filteredHighlights.sort((a, b) => a.startIndex - b.startIndex);
    setInlineHighlights(filteredHighlights);

    const filteredMemos = currentProject.memos?.filter(memo => memo.fileId === file._id) || [];
    filteredMemos.sort((a, b) => a.startIndex - b.startIndex);
    setMemos(filteredMemos);

    setActiveCodedSegmentId(null);
    setActiveMemoId(null);
  }, [project]);

  /**
   * Fetches the full project data from the backend API.
   */
  const fetchProject = useCallback(async () => {
    // Guard against rapid re-entries
    if (isRefetchingRef.current) return;
    
    isRefetchingRef.current = true;
    setLoading(true);
    setError('');
    
    const token = user?.token;
    if (!token) {
      setError('Authentication error. Please log in.');
      setLoading(false);
      isRefetchingRef.current = false;
      return;
    }

    try {
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}`, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const fetchedProject = res.data;
      setProject(fetchedProject);
      setProjectName(fetchedProject.name);
      setCodeDefinitions(fetchedProject.codeDefinitions || []);
      
      // The new useEffect will handle syncVersion logic here automatically

      const savedPinnedFiles = localStorage.getItem(`pinnedFiles_${projectId}`);
      if (savedPinnedFiles) {
        setPinnedFiles(JSON.parse(savedPinnedFiles));
      }

    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load project');
    } finally {
      setLoading(false);
      isRefetchingRef.current = false; // Release the lock
    }
  }, [projectId, user]);

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
   * Handles closing the "Define Code" modal and resetting related state.
   */
  const handleDefineCodeModalClose = () => {
    setShowDefineCodeModal(false);
    setCodeDefinitionToEdit(null);
    if (setDefineModalBackendErrorRef.current) {
      setDefineModalBackendErrorRef.current('');
    }
  };

  // Effect to fetch project data when the component mounts or the project ID changes
  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    fetchProject();
  }, [projectId, fetchProject]);

  // ⚡️ NEW: Focus Effect for Auto-Sync
  useEffect(() => {
    const onFocus = async () => {
      if (!projectId || !user?.token || isRefetchingRef.current) return;
      
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/meta`,
          { headers: { Authorization: `Bearer ${user.token}` } }
        );
        
        const serverVersion = res.data.syncVersion;
        
        // Only refetch if we have a version, and it doesn't match what we see
        if (lastSeenSyncVersion !== null && serverVersion !== lastSeenSyncVersion) {
           console.log(`[Sync] Version mismatch (Local: ${lastSeenSyncVersion}, Server: ${serverVersion}). Refetching...`);
           fetchProject();
        }
      } catch (error) {
         console.warn("[Sync] Failed to check project version:", error);
      }
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [projectId, user, lastSeenSyncVersion, fetchProject]);


  // Effect to synchronize the selected file state when the project data updates
  useEffect(() => {
      // ✅ FIX: If the current file is "staged" (unsaved), stop here.
      if (selectedFileId === 'staged-file') return;

      // Scenario 1: We have a file selected, let's see if it still exists in the new data
      if (project && selectedFileId) {
        const currentFile = project.importedFiles.find(f => f._id === selectedFileId);
        
        if (currentFile) {
          // ✅ Case A: File still exists (maybe content changed). Update the view.
          handleSelectFile(currentFile);
        } else {
          // ⚠️ Case B: File was deleted remotely!
          if (project.importedFiles.length > 0) {
            handleSelectFile(project.importedFiles[0]); 
          } else {
            handleSelectFile(null); // Clear the viewer
          }
        }
      } 
      // Scenario 2: Nothing selected yet, but we have files. Select the first one.
      else if (project && project.importedFiles?.length > 0 && !selectedFileId) {
        handleSelectFile(project.importedFiles[0]);
      }
    }, [project, selectedFileId, handleSelectFile]);

  // Effect to scroll to a specific annotation in the viewer when its ID is set
  useEffect(() => {
    if (annotationToScrollToId && viewerRef.current) {
      let element = viewerRef.current.querySelector(
        `[data-code-segment-id="${annotationToScrollToId}"], [data-memo-id="${annotationToScrollToId}"]`
      );
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setAnnotationToScrollToId(null);
      }
    }
  }, [annotationToScrollToId]);

  return {
    // State
    projectId,
    project,
    setProject,
    projectName,
    setProjectName,
    loading,
    error,
    setError,
    transcriptionStatus,
    setTranscriptionStatus,
    selectedContent,
    setSelectedContent,
    selectedFileName,
    setSelectedFileName,
    selectedFileId,
    setSelectedFileId,
    selectedFileAudioUrl,
    setSelectedFileAudioUrl,
    codedSegments,
    setCodedSegments,
    inlineHighlights,
    setInlineHighlights,
    codeDefinitions,
    setCodeDefinitions,
    memos,
    setMemos,
    
    // UI States
    isLeftPanelCollapsed,
    setIsLeftPanelCollapsed,
    showImportedFiles,
    setShowImportedFiles,
    showCodeDefinitions,
    setShowCodeDefinitions,
    showCodedSegments,
    setShowCodedSegments,
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
    
    // Modal States
    showDefineCodeModal,
    setShowDefineCodeModal,
    codeDefinitionToEdit,
    setCodeDefinitionToEdit,
    showMemoModal,
    setShowMemoModal,
    memoToEdit,
    setMemoToEdit,
    showConfirmModal,
    setShowConfirmModal,
    confirmModalData,
    setConfirmModalData,
    showCodedSegmentsTableModal,
    setShowCodedSegmentsTableModal,

    // Floating UI States
    showFloatingMemoInput,
    setShowFloatingMemoInput,
    floatingMemoInputPosition,
    setFloatingMemoInputPosition,
    
    // Active States
    activeCodedSegmentId,
    setActiveCodedSegmentId,
    activeMemoId,
    setActiveMemoId,
    annotationToScrollToId,
    setAnnotationToScrollToId,
    
    // Expansion States
    expandedCodes,
    setExpandedCodes,
    expandedMemos,
    setExpandedMemos,
    
    // Refs
    leftPanelRef,
    viewerRef,
    setDefineModalBackendErrorRef,
    
    // Pinned Files
    pinnedFiles,
    setPinnedFiles,
    
    // Functions
    toggleCodeGroup,
    toggleMemoGroup,
    handleDefineModalErrorSetter,
    handleSelectFile,
    fetchProject,
    handlePinFile,
    handleDefineCodeModalClose,
    
    // Auth
    user,

    // Sync function
    syncGlobalProjectState,
  };
};