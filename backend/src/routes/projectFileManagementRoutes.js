import express from 'express';
import multer from 'multer';
import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';
import { PDFParse } from 'pdf-parse';
import Project from '../models/Project.js';
import User from '../models/Users.js';
import { decrypt } from '../utils/encryption.js';
import { FILE_LIMITS_BYTES } from '../constants.js'; 

// --- Configuration ---
dotenv.config();

// --- Router Initialization ---
const router = express.Router();

/**
 * Verifies if the project size, inclusive of any new content, exceeds the defined file storage limits.
 *
 * @param {Object} project - The project object to be evaluated.
 * @param {number} [newContentLength=0] - The byte size of new content being added to the project.
 * @returns {void}
 * @throws {Error} Throws an error if the total size exceeds FILE_LIMITS_BYTES.PROJECT.
 */
const checkProjectLimit = (project, newContentLength = 0) => {
    // --- Size Calculation ---
    const currentSize = Buffer.byteLength(JSON.stringify(project));
    
    // --- Limit Validation ---
    if ((currentSize + newContentLength) > FILE_LIMITS_BYTES.PROJECT) {
        throw new Error('Project storage limit reached');
    }
};

/**
 * Configures the Multer disk storage engine to handle file uploads.
 * This configuration dynamically sets the upload directory based on the file's MIME type
 * (sorting into 'audio' or 'text' subdirectories) and the current environment.
 * It also renames files by prefixing a timestamp to ensure uniqueness.
 */
const fileStorage = multer.diskStorage({
  /**
   * Sets the destination directory for the uploaded file.
   * Creates the directory if it does not already exist.
   *
   * @param {Object} req - The HTTP request object.
   * @param {Object} file - The file object containing metadata (mimetype, originalname, etc.).
   * @param {Function} cb - Callback to signal completion (error, destination).
   */
  destination: (req, file, cb) => {
    // --- MIME Type Analysis ---
    const isAudio = /audio\/(mp3|mpeg|wav|ogg|m4a|mp4|aac|webm|flac)/.test(file.mimetype);

    // --- Directory Path Construction ---
    const baseDir = process.env.NODE_ENV === 'test' ? 'test_uploads' : 'uploads';
    const subDir = isAudio ? `${baseDir}/audio` : `${baseDir}/text`;

    // --- Directory Initialization ---
    if (!fs.existsSync(subDir)) {
      fs.mkdirSync(subDir, { recursive: true });
    }

    cb(null, subDir);
  },

  /**
   * Generates a custom filename for the uploaded file.
   *
   * @param {Object} req - The HTTP request object.
   * @param {Object} file - The file object.
   * @param {Function} cb - Callback to signal completion (error, filename).
   */
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

/**
 * Configures a Multer middleware instance for processing text file uploads.
 * Stores files in memory and enforces strict file type validation and size limits.
 *
 * Supported extensions: .txt, .docx, .rtf, .pdf.
 *
 * @constant
 * @type {Object}
 */
const textUpload = multer({
  // --- Storage Strategy ---
  storage: multer.memoryStorage(),

  // --- File Validation ---
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.txt', '.docx', '.rtf', '.pdf'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported text file type'), false);
    }
  },

  // --- Upload Constraints ---
  limits: {
    fileSize: FILE_LIMITS_BYTES.TEXT,
  }
});

/**
 * Configures the Multer middleware specifically for handling audio file uploads.
 * This configuration applies storage settings, strictly filters files based on audio MIME types,
 * and enforces file size limits.
 *
 * Supported MIME types include: mp3, mpeg, wav, ogg, m4a, mp4, aac, webm, flac.
 *
 * @constant
 * @type {Object}
 */
const audioUpload = multer({
  // --- Storage Configuration ---
  storage: fileStorage,

  // --- File Type Validation ---
  fileFilter: (req, file, cb) => {
    const allowedTypes = /audio\/(mp3|mpeg|wav|ogg|m4a|mp4|aac|webm|flac)/;
    if (allowedTypes.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported audio file type'), false);
    }
  },

  // --- Upload Limits ---
  limits: {
    fileSize: FILE_LIMITS_BYTES.AUDIO,
  }
});

/**
 * Express middleware to intercept and handle errors thrown by the Multer file upload library.
 * Specifically checks for file size limit violations and returns a structured 413 response.
 *
 * @param {Error} err - The error object caught by the middleware.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 * @param {Function} next - The next middleware function in the application stack.
 * @returns {Object|void} Returns a JSON response for specific Multer errors, otherwise passes the error to the next handler.
 */
const handleMulterError = (err, req, res, next) => {
  // --- Multer Error Check ---
  if (err instanceof multer.MulterError) {
    // --- File Size Limit Validation ---
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: `File is too large. Please ensure it is under the size limit.` });
    }
  }
  // --- Propagate Error ---
  next(err);
};

/**
 * Formats a duration in milliseconds into a standardized time string (HH:MM:SS).
 *
 * @param {number} ms - The duration to format, in milliseconds.
 * @returns {string} The formatted time string in "HH:MM:SS" format.
 */
const formatTimestamp = (ms) => {
  // --- Component Calculation ---
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');

  // --- Format Assembly ---
  return `${hours}:${minutes}:${seconds}`;
};

/**
 * Handles the staging of uploaded files for a specific project.
 * * This handler processes an uploaded file (Text, RTF, Word, or PDF), extracts its raw text content,
 * and optionally applies sentence-level splitting logic. It also performs checks for duplicate 
 * filenames within the project and suggests alternative names if a conflict exists.
 *
 * @param {Object} req - The Express request object.
 * @param {string} req.params.projectId - The ID of the project to stage the file for.
 * @param {Object} req.file - The file object uploaded via Multer.
 * @param {Object} req.body - The request body.
 * @param {string} [req.body.splittingOption='sentence'] - The text splitting strategy to apply.
 * @param {string} [req.body.overrideName] - A custom name to use for the staged file, bypassing duplicate checks.
 * @param {Object} res - The Express response object.
 * @returns {void}
 */
router.post('/:projectId/files/stage', textUpload.single('file'), handleMulterError, async (req, res) => {
  const file = req.file;
  const { splittingOption = 'sentence', overrideName } = req.body;

  // --- Input Validation ---
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    // --- Project Retrieval ---
    const project = await Project.findOne({ _id: req.params.projectId, owner: req.userId });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const finalFileName = overrideName || file.originalname;

    // --- Duplicate Name Validation ---
    if (!overrideName) {
        const fileExists = project.importedFiles.some(
            importedFile => importedFile.name.toLowerCase() === file.originalname.toLowerCase()
        );

        if (fileExists) {
            let suggestedName;
            let counter = 1;
            const ext = path.extname(file.originalname);
            const baseName = path.basename(file.originalname, ext);
            do {
                suggestedName = `${baseName} (${counter})${ext}`;
                counter++;
            } while (project.importedFiles.some(f => f.name.toLowerCase() === suggestedName.toLowerCase()));
            
            return res.status(409).json({
                error: `A file named "${file.originalname}" already exists.`,
                promptRequired: true,
                suggestedName: suggestedName,
            });
        }
    }
    
    let rawText = '';
    const buffer = file.buffer; 
    const ext = path.extname(file.originalname).toLowerCase();

    // --- Text Extraction ---
    if (file.mimetype.includes('text') || ext === '.rtf' || ext === '.txt') {
      rawText = buffer.toString('utf8');
    } else if (file.mimetype.includes('word') || ext === '.docx') {
      rawText = (await mammoth.extractRawText({ buffer })).value;
    } else if (file.mimetype === 'application/pdf' || ext === '.pdf') {
       try {
           const uint8Array = new Uint8Array(buffer);
           const parser = new PDFParse(uint8Array); 
           const result = await parser.getText(); 
           rawText = result.text;
       } catch (pdfError) {
           console.error('PDF parsing error:', pdfError);
           throw new Error(`Failed to parse PDF: ${pdfError.message}`);
       }
    }

    let processedText = rawText;
    
    // --- Content Processing ---
    if (splittingOption === 'sentence') {
      const allProcessedSentences = [];
      const lines = rawText.split(/\r?\n/).filter(line => line.trim() !== '');

      for (const line of lines) {
        const speakerMatch = line.match(/^([^:]+:\s*)(.*)/s);

        if (speakerMatch) {
          const identifier = speakerMatch[1];
          const dialogue = speakerMatch[2].trim();
          const sentences = dialogue.split(/(?<=[.!?])\s+/).filter(s => s.trim());

          if (sentences.length > 0) {
            sentences.forEach(sentence => {
              allProcessedSentences.push(`${identifier}${sentence.trim()}`);
            });
          } else if (dialogue) {
            allProcessedSentences.push(line.trim());
          }
        } else {
           const sentences = line.split(/(?<=[.!?])\s+/).filter(s => s.trim());
           if (sentences.length > 0) {
                sentences.forEach(sentence => {
                    allProcessedSentences.push(sentence.trim());
                });
            } else if (line.trim()){
                allProcessedSentences.push(line.trim());
            }
        }
      }

      if (allProcessedSentences.length > 0) {
        processedText = allProcessedSentences.join('\n\n');
      }
    }

    // --- Response Construction ---
    res.json({
      stagedFile: {
        name: finalFileName,
        content: processedText,
        sourceType: 'text',
      }
    });

  } catch (err) {
    // --- Error Handling ---
    console.error('File staging error:', err);
    res.status(500).json({ error: 'File staging failed', details: err.message });
  }
});

/**
 * Handles the HTTP POST request to commit a new file to a specific project.
 * Validates the project existence, checks storage limits, creates a file object,
 * and persists it to the project's imported files array.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.params - The route parameters.
 * @param {string} req.params.projectId - The unique identifier of the target project.
 * @param {Object} req.body - The request payload containing file details.
 * @param {string} req.body.name - The name of the file to be committed.
 * @param {string} req.body.content - The string content of the file.
 * @param {string} [req.body.sourceType] - The source origin type of the file.
 * @param {string} [req.body.audioUrl] - Optional URL for associated audio.
 * @param {Array} [req.body.words] - Optional array of word objects or metadata.
 * @param {string} req.userId - The ID of the authenticated user (attached by middleware).
 * @param {Object} res - The Express response object.
 * @returns {Object} JSON response containing the updated project object or an error message.
 */
router.post('/:projectId/files/commit', async (req, res) => {
  const { projectId } = req.params;
  const { name, content, sourceType, audioUrl, words } = req.body;

  // --- Input Validation ---
  if (!name || typeof content !== 'string') {
    return res.status(400).json({ error: 'File name and content are required.' });
  }

  try {
    // --- Project Retrieval & Authorization ---
    const project = await Project.findOne({ _id: projectId, owner: req.userId });

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    // --- Quota Verification ---
    try {
        const newContentSize = Buffer.byteLength(content);
        checkProjectLimit(project, newContentSize);
    } catch (limitErr) {
        return res.status(400).json({ 
            error: "Project storage limit reached. Please create a new project for additional files." 
        });
    }

    // --- Payload Construction ---
    const fileData = {
      name,
      content,
      sourceType,
      isLocked: false,
      ...(audioUrl && { audioUrl }),
      ...(words && { words }),
    };

    // --- Persistence ---
    project.importedFiles.push(fileData);
    project.syncVersion += 1;
    await project.save();

    res.json({ project });
  } catch (err) {
    // --- Error Handling ---
    console.error('File commit error:', err);
    res.status(500).json({ error: 'Failed to save the file.', details: err.message });
  }
});

/**
 * Express route handler to upload an audio file, transcribe it using AssemblyAI, and save the result to a project.
 * Handles file validation, storage limit checks, API key decryption, and transcript formatting based on user preferences.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.file - The uploaded audio file object from Multer.
 * @param {Object} req.params - Route parameters containing the project ID.
 * @param {string} req.params.id - The unique identifier of the target project.
 * @param {Object} req.body - The request body.
 * @param {string} [req.body.splittingOption='turn'] - The method for splitting transcript text ('turn' or 'sentence').
 * @param {string} [req.body.overrideName] - Optional name to override the default transcript filename.
 * @param {string} req.userId - The ID of the authenticated user (attached by middleware).
 * @param {Object} res - The Express response object.
 * @returns {Promise<void>} Sends a JSON response with the updated project or an error message.
 */
router.post('/import-audio/:id', audioUpload.single('audio'), handleMulterError, async (req, res) => {
  const file = req.file;
  const { splittingOption = 'turn', overrideName } = req.body;

  // --- Initial Validation ---
  if (!file) {
    return res.status(400).json({ error: 'No audio file uploaded.' });
  }

  try {
    // --- Project Retrieval ---
    const project = await Project.findOne({ _id: req.params.id, owner: req.userId });
    if (!project) {
        fs.unlinkSync(file.path);
        return res.status(404).json({ error: 'Project not found' });
    }

    // --- Pre-Transcription Limit Check ---
    try {
        checkProjectLimit(project, 0); 
    } catch (limitErr) {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return res.status(400).json({ 
            error: "Project storage limit reached. Please create a new project for additional files." 
        });
    }

    // --- API Key Retrieval ---
    const user = await User.findById(req.userId);
    let ASSEMBLYAI_API_KEY = null;

    if (user?.apiKeys?.assemblyAI?.encryptedData) {
        try {
            ASSEMBLYAI_API_KEY = decrypt(user.apiKeys.assemblyAI);
        } catch (decryptErr) {
            console.error('Failed to decrypt API key:', decryptErr);
        }
    }

    if (!ASSEMBLYAI_API_KEY) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      
      return res.status(428).json({ 
        error: 'AssemblyAI API Key required. Please configure it in your settings.',
        requiresApiKey: true 
      });
    }

    // --- Naming Conflict Resolution ---
    const originalTranscriptName = file.originalname.replace(/\.[^/.]+$/, " (Transcript).txt");
    let finalTranscriptName = overrideName || originalTranscriptName;

    if (!overrideName) {
        const fileExists = project.importedFiles.some(
            importedFile => importedFile.name.toLowerCase() === finalTranscriptName.toLowerCase()
        );

        if (fileExists) {
            fs.unlinkSync(file.path);
            let suggestedName;
            let counter = 1;
            const ext = path.extname(originalTranscriptName);
            const baseName = path.basename(originalTranscriptName, ext);

            do {
                suggestedName = `${baseName} (${counter})${ext}`;
                counter++;
            } while (project.importedFiles.some(f => f.name.toLowerCase() === suggestedName.toLowerCase()));

            return res.status(409).json({
                error: `A transcript named "${originalTranscriptName}" already exists. Renaming is suggested.`,
                promptRequired: true,
                suggestedName: suggestedName,
            });
        }
    }

    // --- AssemblyAI Upload ---
    const filePath = file.path;
    const audioUrl = `/${filePath.replace(/\\/g, '/')}`;

    const fileStream = fs.createReadStream(filePath);
    
    const uploadResponse = await axios({
      method: 'post',
      url: 'https://api.assemblyai.com/v2/upload',
      data: fileStream,
      headers: { 'authorization': ASSEMBLYAI_API_KEY, 'Content-Type': 'application/octet-stream' },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    
    const uploadUrl = uploadResponse.data.upload_url;
    if (!uploadUrl) throw new Error('No upload URL returned from AssemblyAI');
    
    // --- Transcription Request ---
    const transcriptParams = { audio_url: uploadUrl, speaker_labels: true, disfluencies: true, punctuate: true, format_text: true, };
    const transcriptResponse = await axios({
      method: 'post',
      url: 'https://api.assemblyai.com/v2/transcript',
      data: transcriptParams,
      headers: { 'authorization': ASSEMBLYAI_API_KEY, 'Content-Type': 'application/json' }
    });
    
    const transcriptId = transcriptResponse.data.id;
    if (!transcriptId) throw new Error('No transcript ID returned from AssemblyAI');
    
    // --- Status Polling ---
    let transcriptData;
    let pollAttempts = 0;
    const maxPollAttempts = 100;
    
    while (pollAttempts < maxPollAttempts) {
      const pollResponse = await axios({
        method: 'get',
        url: `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        headers: { 'authorization': ASSEMBLYAI_API_KEY }
      });
      transcriptData = pollResponse.data;
      if (transcriptData.status === 'completed') break;
      if (transcriptData.status === 'error') throw new Error(`Transcription failed: ${transcriptData.error || 'Unknown error'}`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      pollAttempts++;
    }
    
    if (pollAttempts >= maxPollAttempts) throw new Error('Transcription polling timeout - took too long to complete');
    
    // --- Transcript Formatting & Processing ---
    let formattedTranscript = '';
    const processedWords = [];
    let currentIndex = 0;
    
    if (transcriptData.words && transcriptData.words.length > 0) {
      if (splittingOption === 'sentence') {
        // --- Sentence-Based Splitting ---
        let fullText = '';
        transcriptData.words.forEach((word, index) => {
          const wordText = word.text + (index < transcriptData.words.length - 1 ? ' ' : '');
          processedWords.push({ text: word.text, startTime: word.start / 1000.0, endTime: word.end / 1000.0, startIndex: fullText.length, endIndex: fullText.length + word.text.length, speaker: word.speaker || 'Unknown', });
          fullText += wordText;
        });
        const sentences = fullText.match(/[^.!?]+[.!?]+/g) || [fullText];
        sentences.forEach((sentence, sentenceIndex) => {
          const trimmedSentence = sentence.trim();
          if (!trimmedSentence) return;
          const sentenceStart = fullText.indexOf(trimmedSentence, sentenceIndex > 0 ? fullText.indexOf(sentences[sentenceIndex - 1]) + sentences[sentenceIndex - 1].length : 0);
          const firstWordInSentence = processedWords.find(word => word.startIndex >= sentenceStart && word.startIndex < sentenceStart + trimmedSentence.length);
          const speaker = firstWordInSentence?.speaker || 'Unknown';
          const timestamp = firstWordInSentence ? formatTimestamp(firstWordInSentence.startTime * 1000) : '00:00:00';
          formattedTranscript += `[${timestamp}] Speaker ${speaker}: ${trimmedSentence}\n\n`;
        });
        currentIndex = formattedTranscript.length;
      } else {
        // --- Utterance/Turn-Based Splitting ---
        if (transcriptData.utterances && transcriptData.utterances.length > 0) {
          transcriptData.utterances.forEach((utterance, utteranceIndex) => {
            const timestamp = formatTimestamp(utterance.start);
            const speaker = utterance.speaker || 'A';
            const header = `[${timestamp}] Speaker ${speaker}: `;
            formattedTranscript += header;
            currentIndex += header.length;
            const utteranceWords = transcriptData.words.filter(word => word.start >= utterance.start && word.end <= utterance.end);
            utteranceWords.forEach((word, wordIndex) => {
              const wordText = word.text + (wordIndex < utteranceWords.length - 1 ? ' ' : '');
              processedWords.push({ text: word.text, startTime: word.start / 1000.0, endTime: word.end / 1000.0, startIndex: currentIndex, endIndex: currentIndex + word.text.length, speaker: word.speaker || speaker, });
              formattedTranscript += wordText;
              currentIndex += wordText.length;
            });
            if (utteranceIndex < transcriptData.utterances.length - 1) {
              formattedTranscript += '\n\n';
              currentIndex += 2;
            }
          });
        } else {
          // --- Fallback: Linear Processing ---
          transcriptData.words.forEach((word, index) => {
            const wordText = word.text + (index < transcriptData.words.length - 1 ? ' ' : '');
            processedWords.push({ text: word.text, startTime: word.start / 1000.0, endTime: word.end / 1000.0, startIndex: currentIndex, endIndex: currentIndex + word.text.length, speaker: word.speaker || 'Unknown', });
            formattedTranscript += wordText;
            currentIndex += wordText.length;
          });
        }
      }
    } else {
      formattedTranscript = transcriptData.text || 'No transcript available';
    }

    // --- Post-Transcription Limit Check ---
    try {
        const transcriptSize = Buffer.byteLength(JSON.stringify(processedWords)) + Buffer.byteLength(formattedTranscript);
        checkProjectLimit(project, transcriptSize);
    } catch (limitErr) {
         return res.status(400).json({ 
             error: "Project storage limit reached. Please create a new project for additional files." 
        });
    }

    // --- Database Update ---
    project.importedFiles.push({ 
        name: finalTranscriptName, 
        content: formattedTranscript, 
        sourceType: 'audio', 
        audioUrl: audioUrl, 
        words: processedWords, 
        isLocked: false 
    });
    project.syncVersion += 1;
    await project.save();
    
    res.json({ project });

  } catch (error) {
    // --- Error Handling ---
    console.error('Audio import error:', error);
    if (file && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    if (error.response) {
      console.error('AssemblyAI API Error Response:', { status: error.response.status, statusText: error.response.statusText, data: error.response.data, headers: error.response.headers });
    }
    res.status(500).json({ error: 'Audio transcription failed.', details: error.response?.data || error.message });
  }
});

/**
 * Handles the HTTP PUT request to rename a specific file within a project.
 * * This handler performs several checks:
 * 1. Validates that the project exists and belongs to the authenticated user.
 * 2. Ensures the file exists within the project.
 * 3. Prevents the file extension from being changed during the rename process.
 * 4. Checks for naming conflicts (duplicates) within the same project.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.params - The route parameters.
 * @param {string} req.params.projectId - The unique identifier of the project.
 * @param {string} req.params.fileId - The unique identifier of the file sub-document.
 * @param {Object} req.body - The request payload.
 * @param {string} req.body.name - The new desired filename.
 * @param {Object} res - The Express response object used to send back the status and JSON data.
 * @returns {Promise<void>} Sends a JSON response with the updated project or an error object.
 */
router.put('/:projectId/files/:fileId/rename', async (req, res) => {
  const { name } = req.body;
  const { projectId, fileId } = req.params;

  // --- Input Validation ---
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'A valid new file name is required.' });
  }

  try {
    // --- Project Retrieval ---
    const project = await Project.findOne({ _id: projectId, owner: req.userId });
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    // --- File Identification ---
    const fileToUpdate = project.importedFiles.id(fileId);
    if (!fileToUpdate) {
      return res.status(404).json({ error: 'File not found in this project.' });
    }

    // --- Extension Integrity Check ---
    const getExtension = (filename) => {
        const lastDot = filename.lastIndexOf('.');
        if (lastDot === -1) return '';
        return filename.substring(lastDot);
    };

    const originalExtension = getExtension(fileToUpdate.name);
    const newExtension = getExtension(name.trim());

    if (originalExtension.toLowerCase() !== newExtension.toLowerCase()) {
        return res.status(400).json({ error: 'Changing the file extension is not allowed.' });
    }

    // --- Uniqueness Validation ---
    const fileExists = project.importedFiles.some(
      file => file.name.toLowerCase() === name.toLowerCase() && file._id.toString() !== fileId
    );
    if (fileExists) {
      return res.status(409).json({ error: `A file named "${name}" already exists.` });
    }

    // --- Update Operation ---
    fileToUpdate.name = name.trim();
    
    project.syncVersion += 1;
    await project.save();

    res.json({ project });
  } catch (err) {
    console.error('Error renaming file:', err);
    res.status(500).json({ error: 'Server error while renaming the file.' });
  }
});

/**
 * Express route handler to retrieve a specific file from a project's imported files.
 * Ensures the project belongs to the authenticated user before accessing the file.
 *
 * @param {Object} req - The Express request object, containing projectId and fileId in params.
 * @param {Object} res - The Express response object used to send back the file data or error.
 * @returns {void} Sends a JSON response containing the file object or an error status.
 */
router.get('/:projectId/files/:fileId', async (req, res) => {
  // --- Parameter Extraction ---
  const { projectId, fileId } = req.params;

  try {
    // --- Project Lookup & Ownership Verification ---
    const project = await Project.findOne({ _id: projectId, owner: req.userId });
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    // --- Sub-document Retrieval ---
    const file = project.importedFiles.id(fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found.' });
    }

    // --- Response ---
    res.json(file);
  } catch (err) {
    // --- Error Handling ---
    console.error('Error fetching file:', err);
    res.status(500).json({ error: 'Server error fetching file.' });
  }
});

/**
 * Updates the content of a specific file within a project.
 * Performs validation on file locking status and project storage limits before saving.
 *
 * @route PUT /:projectId/files/:fileId
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The request body.
 * @param {string} req.body.content - The new text content for the file.
 * @param {Object} req.params - The route parameters.
 * @param {string} req.params.projectId - The unique identifier of the project.
 * @param {string} req.params.fileId - The unique identifier of the file to update.
 * @param {string} req.userId - The ID of the authenticated user (injected by middleware).
 * @param {Object} res - The Express response object.
 * @returns {void} Sends a JSON response with the updated project object or an error status.
 */
router.put('/:projectId/files/:fileId', async (req, res) => {
  // --- Input Extraction ---
  const { content } = req.body;
  const { projectId, fileId } = req.params;
  
  // --- Input Validation ---
  if (typeof content !== 'string') {
    return res.status(400).json({ error: 'Content is required and must be a string.' });
  }
  
  try {
    // --- Project Authorization & Retrieval ---
    const project = await Project.findOne({ _id: projectId, owner: req.userId });
    if (!project) {
      return res.status(404).json({ error: 'Project not found or you do not have permission.' });
    }
    
    // --- File Retrieval ---
    const fileToUpdate = project.importedFiles.id(fileId);
    if (!fileToUpdate) {
      return res.status(404).json({ error: 'File not found in this project.' });
    }

    // --- Lock Status Validation ---
    if (fileToUpdate.isLocked) {
      return res.status(403).json({ error: 'Cannot edit a locked file. This file has been finalized and is ready for annotation.' });
    }

    // --- Storage Limit Validation ---
    try {
        const currentContentSize = Buffer.byteLength(fileToUpdate.content);
        const newContentSize = Buffer.byteLength(content);
        const netChange = newContentSize - currentContentSize;
        
        if (netChange > 0) {
            checkProjectLimit(project, netChange);
        }
    } catch (limitErr) {
        return res.status(400).json({ 
             error: "Project storage limit reached. Please create a new project to add more text." 
        });
    }
    
    // --- Update & Persistence ---
    fileToUpdate.content = content;
    project.syncVersion += 1;
    await project.save();
    
    res.json({ project });
  } catch (err) {
    // --- Error Handling ---
    console.error('Error updating file content:', err);
    res.status(500).send('Server Error');
  }
});

/**
 * Deletes a file from a project, removes physical assets from disk, and cleans up all related database references.
 *
 * @route DELETE /:projectId/files/:fileId
 * @param {Object} req - The Express request object.
 * @param {string} req.params.projectId - The unique identifier of the project.
 * @param {string} req.params.fileId - The unique identifier of the file to delete.
 * @param {string} req.userId - The ID of the authenticated user (expected from middleware).
 * @param {Object} res - The Express response object.
 * @returns {Object} A JSON response indicating success with the updated project, or an error message.
 */
router.delete('/:projectId/files/:fileId', async (req, res) => {
  try {
    const { projectId, fileId } = req.params;

    // --- Ownership Verification & Retrieval ---
    const project = await Project.findOne({ _id: projectId, owner: req.userId });
    if (!project) {
      return res.status(404).json({ error: 'Project not found or you do not have permission' });
    }
    const fileToDelete = project.importedFiles.id(fileId);
    if (!fileToDelete) {
      return res.status(404).json({ error: 'File not found in project' });
    }

    // --- Physical Asset Cleanup ---
    if (fileToDelete.sourceType === 'audio' && fileToDelete.audioUrl) {
      try {
        const relativePath = fileToDelete.audioUrl.startsWith('/') ? fileToDelete.audioUrl.substring(1) : fileToDelete.audioUrl;
        const fullPath = path.resolve(relativePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        } else {
          console.warn(`Audio file not found on disk: ${fullPath}`);
        }
      } catch (fileError) {
        console.error('Error deleting physical audio file:', fileError);
      }
    }
    
    // --- Database Cleanup & Sync Update ---
    const updatedProject = await Project.findOneAndUpdate({ _id: projectId, owner: req.userId }, {
      $pull: {
        importedFiles: { _id: fileId },
        codedSegments: { fileId },
        inlineHighlights: { fileId },
        memos: { fileId },
      },
      $inc: { syncVersion: 1 } 
    }, { new: true });

    if (!updatedProject) {
      return res.status(404).json({ error: 'Project not found or you do not have permission' });
    }
    res.json({ message: 'File and related data deleted successfully', project: updatedProject });
  } catch (err) {
    console.error('Delete file error:', err);
    res.status(500).json({ error: 'Delete failed', details: err.message });
  }
});

/**
 * Route handler to lock a specific file within a project.
 * If the file is an audio source, its physical file is deleted from the disk and the URL is cleared.
 *
 * @param {Object} req - The Express request object, containing projectId and fileId in params.
 * @param {Object} res - The Express response object.
 * @returns {Promise<void>} Sends a JSON response with the updated project object or an error.
 */
router.put('/:projectId/files/:fileId/lock', async (req, res) => {
  const { projectId, fileId } = req.params;

  try {
    // --- Project and File Retrieval ---
    const project = await Project.findOne({ _id: projectId, owner: req.userId });
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const fileToLock = project.importedFiles.id(fileId);
    if (!fileToLock) {
      return res.status(404).json({ error: 'File not found in this project.' });
    }

    // --- Validation ---
    if (fileToLock.isLocked) {
      return res.status(400).json({ error: 'File is already locked.' });
    }

    // --- Audio Resource Cleanup ---
    if (fileToLock.sourceType === 'audio' && fileToLock.audioUrl) {
      try {
        const relativePath = fileToLock.audioUrl.startsWith('/') 
          ? fileToLock.audioUrl.substring(1) 
          : fileToLock.audioUrl;
        
        const fullPath = path.resolve(relativePath);

        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          console.log(`Audio file deleted on lock: ${fullPath}`);
        } else {
          console.warn(`Audio file not found on disk during lock: ${fullPath}`);
        }

        fileToLock.audioUrl = null; 

      } catch (fileError) {
        console.error('Error deleting physical audio file during lock:', fileError);
      }
    }

    // --- Persistence and Versioning ---
    fileToLock.isLocked = true;
    
    project.syncVersion += 1;
    await project.save();

    res.json({ project, message: 'File locked and audio deleted successfully.' });
  } catch (err) {
    console.error('Error locking file:', err);
    res.status(500).json({ error: 'Server error while locking the file.' });
  }
});

export default router;