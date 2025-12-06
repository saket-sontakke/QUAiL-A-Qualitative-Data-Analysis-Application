import express from 'express';
import multer from 'multer';
import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';
import Project from '../models/Project.js';
import { PDFParse } from 'pdf-parse';

dotenv.config();
const router = express.Router();

// --- Multer and File Handling Configuration ---

const MAX_TEXT_SIZE_MB = 25;
const MAX_AUDIO_SIZE_MB = 25;
const MAX_TEXT_SIZE_BYTES = MAX_TEXT_SIZE_MB * 1024 * 1024;
const MAX_AUDIO_SIZE_BYTES = MAX_AUDIO_SIZE_MB * 1024 * 1024;

/**
 * Multer disk storage configuration for handling file uploads.
 */
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isAudio = /audio\/(mp3|wav|ogg|m4a|aac)/.test(file.mimetype);
    const baseDir = process.env.NODE_ENV === 'test' ? 'test_uploads' : 'uploads';
    const subDir = isAudio ? `${baseDir}/audio` : `${baseDir}/text`;
    if (!fs.existsSync(subDir)) {
      fs.mkdirSync(subDir, { recursive: true });
    }
    cb(null, subDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

/**
 * Multer middleware instance configured for text file uploads.
 */
const textUpload = multer({
  storage: fileStorage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.txt', '.docx', '.rtf', '.pdf'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported text file type'), false);
    }
  },
  limits: {
    fileSize: MAX_TEXT_SIZE_BYTES,
  }
});

/**
 * Multer middleware instance configured for audio file uploads.
 */
const audioUpload = multer({
  storage: fileStorage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /audio\/(mp3|wav|ogg|m4a||aac)/;
    if (allowedTypes.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported audio file type'), false);
    }
  },
  limits: {
    fileSize: MAX_AUDIO_SIZE_BYTES,
  }
});

const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: `File is too large. Please ensure it is under the size limit.` });
    }
  }
  next(err);
};

// --- Helper Functions ---

const formatTimestamp = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};


// --- File Management Routes ---

/**
 * Stages a text file for editing without saving it to the project.
 */
router.post('/:projectId/files/stage', textUpload.single('file'), handleMulterError, async (req, res) => {
  const file = req.file;
  const { splittingOption = 'sentence', overrideName } = req.body;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const project = await Project.findOne({ _id: req.params.projectId, owner: req.userId });

    if (!project) {
      fs.unlinkSync(file.path);
      return res.status(404).json({ error: 'Project not found' });
    }

    const finalFileName = overrideName || file.originalname;

    if (!overrideName) {
        const fileExists = project.importedFiles.some(
            importedFile => importedFile.name.toLowerCase() === file.originalname.toLowerCase()
        );

        if (fileExists) {
            fs.unlinkSync(file.path);
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
    const buffer = fs.readFileSync(file.path);
    const ext = path.extname(file.originalname).toLowerCase();

    // PROCESSING LOGIC
    if (file.mimetype.includes('text') || ext === '.rtf' || ext === '.txt') {
      rawText = buffer.toString('utf8');
    } else if (file.mimetype.includes('word') || ext === '.docx') {
      rawText = (await mammoth.extractRawText({ buffer })).value;
    } else if (file.mimetype === 'application/pdf' || ext === '.pdf') {
       try {
           const parser = new PDFParse({ data: buffer });
           const result = await parser.getText();
           rawText = result.text;
           await parser.destroy();
       } catch (pdfError) {
           console.error('PDF parsing error:', pdfError);
           throw new Error(`Failed to parse PDF: ${pdfError.message}`);
       }
    }

    fs.unlinkSync(file.path);

    let processedText = rawText;
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

    res.json({
      stagedFile: {
        name: finalFileName,
        content: processedText,
        sourceType: 'text',
      }
    });

  } catch (err) {
    if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    console.error('File staging error:', err);
    res.status(500).json({ error: 'File staging failed', details: err.message });
  }
});

router.post('/:projectId/files/commit', async (req, res) => {
  const { projectId } = req.params;
  const { name, content, sourceType, audioUrl, words } = req.body;

  if (!name || typeof content !== 'string') {
    return res.status(400).json({ error: 'File name and content are required.' });
  }

  try {
    const fileData = {
      name,
      content,
      sourceType,
      ...(audioUrl && { audioUrl }),
      ...(words && { words }),
    };

    const updatedProject = await Project.findOneAndUpdate(
      { _id: projectId, owner: req.userId },
      { $push: { importedFiles: fileData } },
      { new: true }
    );

    if (!updatedProject) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    res.json({ project: updatedProject });
  } catch (err) {
    console.error('File commit error:', err);
    res.status(500).json({ error: 'Failed to save the file.', details: err.message });
  }
});

router.post('/import-audio/:id', audioUpload.single('audio'), handleMulterError, async (req, res) => {
  const file = req.file;
  const { splittingOption = 'turn', overrideName } = req.body;

  if (!file) {
    return res.status(400).json({ error: 'No audio file uploaded.' });
  }

  const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;
  if (!ASSEMBLYAI_API_KEY) {
    fs.unlinkSync(file.path);
    return res.status(500).json({ error: 'AssemblyAI API key not configured on the server.' });
  }

  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.userId });
    if (!project) {
        fs.unlinkSync(file.path);
        return res.status(404).json({ error: 'Project not found' });
    }

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
    
    const transcriptParams = { audio_url: uploadUrl, speaker_labels: true, disfluencies: true, punctuate: true, format_text: true, };
    const transcriptResponse = await axios({
      method: 'post',
      url: 'https://api.assemblyai.com/v2/transcript',
      data: transcriptParams,
      headers: { 'authorization': ASSEMBLYAI_API_KEY, 'Content-Type': 'application/json' }
    });
    
    const transcriptId = transcriptResponse.data.id;
    if (!transcriptId) throw new Error('No transcript ID returned from AssemblyAI');
    
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
    
    let formattedTranscript = '';
    const processedWords = [];
    let currentIndex = 0;
    
    if (transcriptData.words && transcriptData.words.length > 0) {
      if (splittingOption === 'sentence') {
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

    const updatedProject = await Project.findOneAndUpdate(
        { _id: req.params.id, owner: req.userId }, 
        { $push: { importedFiles: { name: finalTranscriptName, content: formattedTranscript, sourceType: 'audio', audioUrl: audioUrl, words: processedWords } } }, 
        { new: true }
    ).populate('importedFiles');
    
    res.json({ project: updatedProject });

  } catch (error) {
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

router.put('/:projectId/files/:fileId/rename', async (req, res) => {
  const { name } = req.body;
  const { projectId, fileId } = req.params;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'A valid new file name is required.' });
  }

  try {
    const project = await Project.findOne({ _id: projectId, owner: req.userId });
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const fileToUpdate = project.importedFiles.id(fileId);
    if (!fileToUpdate) {
      return res.status(404).json({ error: 'File not found in this project.' });
    }

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

    const fileExists = project.importedFiles.some(
      file => file.name.toLowerCase() === name.toLowerCase() && file._id.toString() !== fileId
    );
    if (fileExists) {
      return res.status(409).json({ error: `A file named "${name}" already exists.` });
    }

    fileToUpdate.name = name.trim();
    await project.save();

    res.json({ project });
  } catch (err) {
    console.error('Error renaming file:', err);
    res.status(500).json({ error: 'Server error while renaming the file.' });
  }
});

router.put('/:projectId/files/:fileId', async (req, res) => {
  const { content } = req.body;
  const { projectId, fileId } = req.params;
  if (typeof content !== 'string') {
    return res.status(400).json({ error: 'Content is required and must be a string.' });
  }
  try {
    const project = await Project.findOne({ _id: projectId, owner: req.userId });
    if (!project) {
      return res.status(404).json({ error: 'Project not found or you do not have permission.' });
    }
    const fileToUpdate = project.importedFiles.id(fileId);
    if (!fileToUpdate) {
      return res.status(404).json({ error: 'File not found in this project.' });
    }
    fileToUpdate.content = content;
    await project.save();
    res.json({ project });
  } catch (err) {
    console.error('Error updating file content:', err);
    res.status(500).send('Server Error');
  }
});

router.delete('/:projectId/files/:fileId', async (req, res) => {
  try {
    const { projectId, fileId } = req.params;
    const project = await Project.findOne({ _id: projectId, owner: req.userId });
    if (!project) {
      return res.status(404).json({ error: 'Project not found or you do not have permission' });
    }
    const fileToDelete = project.importedFiles.id(fileId);
    if (!fileToDelete) {
      return res.status(404).json({ error: 'File not found in project' });
    }
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
    const updatedProject = await Project.findOneAndUpdate({ _id: projectId, owner: req.userId }, {
      $pull: {
        importedFiles: { _id: fileId },
        codedSegments: { fileId },
        inlineHighlights: { fileId },
        memos: { fileId },
      },
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

export default router;