import axios from 'axios';
import FileSaver from 'file-saver';

/**
 * File management hook.
 * Handles file imports, exports, updates, deletions, and related operations.
 */
export const useFileManager = ({
  projectId,
  user,
  setProject,
  setError,
  setConfirmModalData,
  setShowConfirmModal,
  setTranscriptionStatus,
  onImportSuccess,
  onRequestApiKey,
  handleSelectFile,
  setFileInEditMode,
}) => {
  /**
   * Handles the import of a text file, sending it to the backend for processing.
   * @param {File} file - The text file to import.
   * @param {string} [splittingOption='sentence'] - The method for splitting the text content.
   * @param {string|null} [overrideName=null] - An optional name to use for the file.
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
   * @param {object} fileData - The data of the staged file to be committed.
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
        handleSelectFile(newlyCommittedFile, res.data.project);
      }

      return { success: true };
    } catch (err) {
      const error = err.response?.data?.error || 'Failed to save new file.';
      setError(error);
      setConfirmModalData({ 
        title: 'Save Failed', 
        message: error, 
        onConfirm: () => setShowConfirmModal(false) 
      });
      setShowConfirmModal(true);
      return { success: false, error };
    }
  };

  /**
   * Handles the import and transcription of an audio file.
   * @param {File} file - The audio file to import.
   * @param {string} [splittingOption='turn'] - The method for splitting the resulting transcript.
   * @param {string|null} [overrideName=null] - An optional name to use for the transcript file.
   */
  const handleAudioImport = async (file, splittingOption = 'turn', overrideName = null) => {
    setTranscriptionStatus({ isActive: true, message: 'Uploading audio...', progress: 0 });
    
    const token = user?.token;
    if (!token) {
      setTranscriptionStatus({ isActive: false, message: 'Authentication Error.', progress: 0 });
      return;
    }

    const formData = new FormData();
    formData.append('audio', file);
    formData.append('splittingOption', splittingOption);
    if (overrideName) {
      formData.append('overrideName', overrideName);
    }

    try {
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

      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/projects/import-audio/${projectId}`, 
        formData, 
        axiosConfig
      );

      setProject(res.data.project);
      
      const newlyImportedFile = res.data.project.importedFiles.at(-1);
      if (newlyImportedFile && onImportSuccess) {
        onImportSuccess(newlyImportedFile);
      }

      setTranscriptionStatus({ isActive: false, message: '', progress: 0 });

    } catch (err) {
      console.error('Audio import failed', err);
      setTranscriptionStatus({ isActive: false, message: '', progress: 0 });

      // Missing API Key
      if (err.response && err.response.status === 428) {
        if (onRequestApiKey) {
            onRequestApiKey();
        }
        return;
      }

      // Duplicate File
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
            handleAudioImport(file, splittingOption, suggestedName);
          },
          showCheckbox: true,
          checkboxLabel: "I understand the risks and wish to proceed."
        });
        setShowConfirmModal(true);
      } 
      // Generic Error
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
   */
  const handleUpdateFileContent = async (fileId, content) => {
    const token = user?.token;
    if (!token) return setError('You must be logged in to save changes.');
    try {
      const res = await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}/files/${fileId}`, 
        { content }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProject(res.data.project);
      const updatedFile = res.data.project.importedFiles.find(f => f._id === fileId);
      if (updatedFile) {
        handleSelectFile(updatedFile, res.data.project);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save document.');
      setConfirmModalData({ 
        title: 'Save Failed', 
        message: err.response?.data?.error || 'Could not save the document content.', 
        onConfirm: () => setShowConfirmModal(false) 
      });
      setShowConfirmModal(true);
    }
  };

  /**
   * Handles the file input change event, determining whether to process a text or audio file.
   * @param {React.ChangeEvent<HTMLInputElement>} e - The file input change event.
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
   * Prompts the user and then permanently deletes an imported file.
   * @param {string} fileId - The ID of the file to delete.
   * @param {string} fileName - The name of the file, used in the confirmation prompt.
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
            handleSelectFile(null);
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

  return {
    handleTextImport,
    handleCommitNewFile,
    handleAudioImport,
    handleUpdateFileContent,
    handleFileChange,
    handleRenameFile,
    handleExportFile,
    handleDeleteFile,
  };
};