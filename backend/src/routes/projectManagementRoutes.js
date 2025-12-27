import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import Project from '../models/Project.js';
import { FILE_LIMITS_BYTES } from '../constants.js';

// --- Router Initialization ---
const router = express.Router();

/**
 * Configures the Multer disk storage engine for handling temporary uploads.
 * Determines the upload destination directory and generates unique filenames
 * based on the current timestamp.
 *
 * @constant
 * @type {Object}
 */
const tempStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = 'temp_uploads';

    // --- Directory Validation & Creation ---
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    // --- Filename Formatting ---
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

/**
 * Multer middleware configuration for handling '.quail' file uploads.
 * Defines storage strategy, file size limits, and validation logic to ensure
 * only specific file types and MIME types are processed.
 *
 * @constant
 * @type {Object}
 */
const uploadQuail = multer({ 
  // --- Configuration ---
  storage: tempStorage,
  limits: { fileSize: FILE_LIMITS_BYTES.PROJECT },

  // --- Validation ---
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.quail') || file.mimetype.includes('zip') || file.mimetype.includes('octet-stream')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .quail files are allowed.'), false);
    }
  }
});

/**
 * Iterates through a project's imported files and deletes associated local physical audio files.
 * Skips files with remote URLs (starting with 'http').
 *
 * @param {Object} project - The project object containing imported files.
 * @param {Array} project.importedFiles - List of file objects to process.
 * @param {string} project.name - The name of the project, used for logging errors.
 * @returns {void}
 */
const deleteProjectFiles = (project) => {
  // --- Input Validation ---
  if (!project.importedFiles || project.importedFiles.length === 0) return;

  // --- File Cleanup Loop ---
  project.importedFiles.forEach(file => {
    if (file.sourceType === 'audio' && file.audioUrl && !file.audioUrl.startsWith('http')) {
      try {
        // --- Path Resolution & Deletion ---
        const relativePath = file.audioUrl.startsWith('/') ? file.audioUrl.slice(1) : file.audioUrl;
        const filePath = path.resolve(relativePath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`[Cleanup] Deleted physical file: ${filePath}`);
        }
      } catch (err) {
        // --- Error Handling ---
        console.error(`[Cleanup] Failed to delete file for project ${project.name}:`, err);
      }
    }
  });
};

/**
 * Generates a unique name for a project by appending an incremented numeric suffix
 * if the provided name already exists for the specific user.
 *
 * @param {string} inputName - The desired name for the project.
 * @param {string|Object} userId - The unique identifier of the project owner.
 * @returns {Promise<string>} A promise that resolves to the original name or a new unique name with a suffix (e.g., "Name (1)").
 */
const generateUniqueName = async (inputName, userId) => {
  // --- Name Sanitization & Regex Preparation ---
  const nameWithoutSuffix = inputName.replace(/ \(\d+\)$/, '');
  const escapedName = nameWithoutSuffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  const regex = new RegExp(`^${escapedName}( \\(\\d+\\))?$`, 'i');

  // --- Database Query ---
  const matches = await Project.find({ owner: userId, name: regex }).select('name');
  
  // --- Existence Check ---
  const isNameTaken = matches.some(p => p.name.toLowerCase() === inputName.toLowerCase());

  if (!isNameTaken) return inputName;

  // --- Suffix Calculation ---
  let maxNum = 0;
  matches.forEach(p => {
    const match = p.name.match(/ \((\d+)\)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });

  return `${nameWithoutSuffix} (${maxNum + 1})`;
};

/**
 * Handles the import of a compressed project archive (.quail format).
 * Extracts project metadata and assets, remaps database identifiers,
 * saves physical files to the server, and creates a new Project document.
 * * Includes transaction-like rollback for file system operations on failure.
 *
 * @param {Object} req - The Express request object, containing the uploaded file and user context.
 * @param {Object} res - The Express response object.
 * @returns {Promise<void>} Resolves when the response is sent.
 */
router.post('/import-quail', uploadQuail.single('file'), async (req, res) => {
  // --- Validation ---
  if (!req.file) return res.status(400).json({ error: 'No .quail file uploaded' });

  // --- Initialization & Tracking ---
  const createdAudioFiles = []; 
  const tempZipPath = req.file.path; 

  try {
    // --- Archive Extraction ---
    const zip = new AdmZip(tempZipPath);
    const zipEntries = zip.getEntries();

    const projectJsonEntry = zipEntries.find(entry => entry.entryName === 'project.json');
    if (!projectJsonEntry) throw new Error('Invalid .quail file: project.json missing');

    const projectData = JSON.parse(projectJsonEntry.getData().toString('utf8'));

    // --- Destination Setup ---
    const newName = await generateUniqueName(projectData.name, req.userId);
    const baseUploadDir = process.env.NODE_ENV === 'test' ? 'test_uploads' : 'uploads';
    const audioTargetDir = path.join(baseUploadDir, 'audio');
    
    if (!fs.existsSync(audioTargetDir)) fs.mkdirSync(audioTargetDir, { recursive: true });

    const fileIdMap = {}; 
    const codeIdMap = {}; 

    // --- Asset Processing ---
    if (projectData.importedFiles) {
      projectData.importedFiles = await Promise.all(projectData.importedFiles.map(async (f) => {
        const oldId = f._id;
        const newId = new mongoose.Types.ObjectId();
        fileIdMap[oldId] = newId.toString(); 

        if (f.sourceType === 'audio' && f.audioUrl && f.audioUrl.startsWith('assets/')) {
          const assetName = path.basename(f.audioUrl);
          
          const fileEntry = zipEntries.find(entry => entry.entryName === `assets/${assetName}`);
          
          if (fileEntry) {
            const newFileName = `${Date.now()}-${Math.floor(Math.random() * 10000)}-${assetName}`;
            const targetPath = path.join(audioTargetDir, newFileName);
            
            fs.writeFileSync(targetPath, fileEntry.getData());
            createdAudioFiles.push(targetPath);

            const relativeStoragePath = path.join(process.env.NODE_ENV === 'test' ? 'test_uploads' : 'uploads', 'audio', newFileName);
            f.audioUrl = '/' + relativeStoragePath.replace(/\\/g, '/');
          }
        }
        return { ...f, _id: newId };
      }));
    }

    // --- ID Remapping ---
    if (projectData.codeDefinitions) {
      projectData.codeDefinitions = projectData.codeDefinitions.map(c => {
        const oldId = c._id;
        const newId = new mongoose.Types.ObjectId();
        codeIdMap[oldId] = newId.toString();
        return { ...c, _id: newId, owner: req.userId };
      });
    }

    if (projectData.codedSegments) {
      projectData.codedSegments = projectData.codedSegments.map(s => {
        const newFileId = fileIdMap[s.fileId];
        const newCodeId = codeIdMap[s.codeDefinition?._id];
        return {
          ...s,
          _id: new mongoose.Types.ObjectId(),
          fileId: newFileId || s.fileId, 
          codeDefinition: {
            ...s.codeDefinition,
            _id: newCodeId || s.codeDefinition._id
          }
        };
      }).filter(s => s.fileId && s.codeDefinition?._id);
    }

    if (projectData.inlineHighlights) {
      projectData.inlineHighlights = projectData.inlineHighlights.map(h => ({
        ...h,
        _id: new mongoose.Types.ObjectId(),
        fileId: fileIdMap[h.fileId] || h.fileId
      })).filter(h => h.fileId);
    }

    if (projectData.memos) {
      projectData.memos = projectData.memos.map(m => ({
        ...m,
        _id: new mongoose.Types.ObjectId(),
        fileId: fileIdMap[m.fileId] || m.fileId,
        authorId: req.userId
      })).filter(m => m.fileId);
    }

    // --- Project Persistence ---
    const newProject = new Project({
      ...projectData,
      name: newName,
      owner: req.userId,
      isImported: true,
      createdAt: undefined,
      updatedAt: undefined
    });

    await newProject.save();

    // --- Cleanup & Response ---
    try {
          if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath);
      } catch (cleanupErr) {
          console.warn('Failed to clean up temp zip file:', cleanupErr);
      }

      res.status(201).json(newProject);

    } catch (err) {
      // --- Error Handling & Rollback ---
      console.error('Import failed:', err);

      try {
          if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath);
      } catch (cleanupErr) { /* ignore */ }

      if (createdAudioFiles.length > 0) {
        createdAudioFiles.forEach(filePath => {
            try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { }
        });
      }

      res.status(500).json({ error: 'Import failed', details: err.message });
    }
  });

/**
 * Handles the HTTP POST request to create a new project.
 * Validates uniqueness of the project name for the user before creation.
 *
 * @param {Object} req - The Express request object, containing project details in the body and authenticated user ID.
 * @param {Object} res - The Express response object used to return status and JSON data.
 * @returns {Promise<void>} Returns a JSON response with the created project or an error message.
 */
router.post('/create', async (req, res) => {
  // --- Input Extraction ---
  const { name, data } = req.body;

  try {
    // --- Duplication Check ---
    const existingProject = await Project.findOne({
      owner: req.userId,
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });
    if (existingProject) {
      return res.status(409).json({ error: 'A project with this name already exists.' });
    }

    // --- Project Creation ---
    const newProject = new Project({ name, data, owner: req.userId, isImported: false });
    await newProject.save();
    res.status(201).json(newProject);
  } catch (err) {
    // --- Error Handling ---
    if (err.code === 11000) {
      return res.status(409).json({ error: 'A project with this name already exists.' });
    }
    res.status(500).json({ error: 'Project creation failed', details: err.message });
  }
});

/**
 * Handles the HTTP GET request to retrieve all projects owned by the authenticated user.
 * Fetches project documents from the database, sorts them by creation date (descending),
 * and returns them as a JSON array.
 *
 * @param {Object} req - The Express request object, containing the authenticated `userId`.
 * @param {Object} res - The Express response object used to send the project data or error message.
 * @returns {Promise<void>} Returns a JSON response containing the list of projects or an error object.
 */
router.get('/my-projects', async (req, res) => {
  try {
    // --- Database Retrieval ---
    const projects = await Project.find({ owner: req.userId }).sort({ createdAt: -1 });

    // --- Response Success ---
    res.json(projects);
  } catch (err) {
    // --- Error Handling ---
    res.status(500).json({ error: 'Failed to fetch projects', details: err.message });
  }
});

/**
 * Handles GET requests to retrieve a specific project by ID.
 * Ensures the requesting user owns the project before returning data.
 *
 * @param {Object} req - The Express request object.
 * @param {string} req.params.id - The unique identifier of the project.
 * @param {string} req.userId - The ID of the authenticated user (assumed attached by prior middleware).
 * @param {Object} res - The Express response object.
 * @returns {void} Sends a JSON response containing the project data or an error message.
 */
router.get('/:id', async (req, res) => {
  try {
    // --- Database Query ---
    const project = await Project.findOne({ _id: req.params.id, owner: req.userId }).lean();

    // --- Validation ---
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // --- Success Response ---
    res.json(project);
  } catch (err) {
    // --- Error Handling ---
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

/**
 * Handles the PUT request to update an existing project's metadata.
 * Performs a uniqueness check on the project name and increments the synchronization version.
 *
 * @param {Object} req - The Express request object containing body and params.
 * @param {string} req.params.id - The unique identifier of the project to update.
 * @param {string} [req.body.name] - The new name for the project.
 * @param {Object} [req.body.data] - The new data payload for the project.
 * @param {string} req.userId - The authenticated user's ID attached to the request.
 * @param {Object} res - The Express response object used to send the status and JSON payload.
 * @returns {Promise<void>} Sends a JSON response with the updated project or an error message.
 */
router.put('/:id', async (req, res) => {
  const { name, data } = req.body;
  const projectId = req.params.id;
  try {
    // --- Duplicate Name Validation ---
    if (name) {
      const existingProject = await Project.findOne({
        owner: req.userId,
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: projectId }
      });
      if (existingProject) {
        return res.status(409).json({ error: 'Another project with this name already exists.' });
      }
    }

    // --- Database Update ---
    const project = await Project.findOneAndUpdate(
      { _id: projectId, owner: req.userId }, 
      { 
        $set: { name, data },
        $inc: { syncVersion: 1 }
      }, 
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found or unauthorized' });
    }
    res.json(project);
  } catch (err) {
    // --- Error Handling ---
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Another project with this name already exists.' });
    }
    res.status(500).json({ error: 'Project update failed', details: err.message });
  }
});

/**
 * Express route handler to delete a project by its ID.
 * Verifies ownership before deletion and cleans up associated files.
 *
 * @param {Object} req - The Express request object, containing route params and authenticated userId.
 * @param {Object} res - The Express response object used to return status and JSON data.
 * @returns {Promise<void>} Sends a JSON response indicating success or failure.
 */
router.delete('/:id', async (req, res) => {
  try {
    // --- Verification & Lookup ---
    const project = await Project.findOne({ _id: req.params.id, owner: req.userId });
    if (!project) return res.status(404).json({ error: 'Not found' });

    // --- Resource Cleanup ---
    deleteProjectFiles(project);

    // --- Database Deletion ---
    await Project.deleteOne({ _id: project._id });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    // --- Error Handling ---
    res.status(500).json({ error: 'Delete failed', details: err.message });
  }
});

/**
 * Creates a duplicate of an existing project, including its configuration, files, and optional annotations.
 * This process involves generating a unique name, physically copying audio assets on the disk,
 * and re-mapping references to internal project components.
 *
 * @route POST /:projectId/copy
 * @param {Object} req - The Express request object.
 * @param {string} req.params.projectId - The unique identifier of the source project.
 * @param {boolean} [req.body.includeAnnotations] - If true, copies code definitions, segments, highlights, and memos.
 * @param {Object} res - The Express response object.
 * @returns {Promise<void>} Sends a JSON response containing the new project object or an error status.
 */
router.post('/:projectId/copy', async (req, res) => {
  const { projectId } = req.params;
  const { includeAnnotations } = req.body;

  try {
    // --- Source Project Validation ---
    const originalProject = await Project.findOne({ _id: projectId, owner: req.userId }).lean();
    if (!originalProject) {
      return res.status(404).json({ error: 'Source project not found.' });
    }

    // --- Initialization & Name Generation ---
    const newName = await generateUniqueName(originalProject.name, req.userId);

    const newProjectData = {
      name: newName,
      owner: req.userId,
      isImported: false,
      importedFiles: [],
      codeDefinitions: [],
      codedSegments: [],
      inlineHighlights: [],
      memos: [],
    };

    const oldFileIdToNewFileIdMap = {};

    // --- File Replication & Physical Asset Copying ---
    if (originalProject.importedFiles) {
        const tempProjectForFiles = new Project({ importedFiles: originalProject.importedFiles.map(f => ({...f, _id: undefined})) });
        
        originalProject.importedFiles.forEach((oldFile, index) => {
            const newFile = tempProjectForFiles.importedFiles[index];
            
            // Handles physical replication of audio files on the filesystem
            if (oldFile.sourceType === 'audio' && oldFile.audioUrl) {
                try {
                    const relativePath = oldFile.audioUrl.startsWith('/') ? oldFile.audioUrl.slice(1) : oldFile.audioUrl;
                    const sourcePath = path.resolve(relativePath);

                    if (fs.existsSync(sourcePath)) {
                        const ext = path.extname(sourcePath);
                        const originalName = path.basename(sourcePath, ext);
                        const newFileName = `${Date.now()}-${Math.floor(Math.random() * 10000)}-${originalName}${ext}`;
                        const targetDir = path.dirname(sourcePath);
                        const targetPath = path.join(targetDir, newFileName);

                        fs.copyFileSync(sourcePath, targetPath);

                        const urlDir = path.dirname(oldFile.audioUrl);
                        newFile.audioUrl = `${urlDir}/${newFileName}`;
                    }
                } catch (copyErr) {
                  console.error("Failed to clone audio file:", copyErr);
                }
            }
            
            oldFileIdToNewFileIdMap[oldFile._id.toString()] = newFile._id.toString();
            newProjectData.importedFiles.push(newFile.toObject());
        });
    }

    // --- Annotation Replication (Conditional) ---
    if (includeAnnotations) {
      const oldCodeDefIdToNewCodeDefMap = {};

      // Clone Code Definitions
      if (originalProject.codeDefinitions) {
          const tempProjectForDefs = new Project({ codeDefinitions: originalProject.codeDefinitions.map(d => ({...d, _id: undefined})) });
          originalProject.codeDefinitions.forEach((oldDef, index) => {
              const newDef = tempProjectForDefs.codeDefinitions[index];
              oldCodeDefIdToNewCodeDefMap[oldDef._id.toString()] = newDef.toObject();
              newProjectData.codeDefinitions.push(newDef.toObject());
          });
      }

      // Clone Coded Segments with mapped references
      if (originalProject.codedSegments) {
          newProjectData.codedSegments = originalProject.codedSegments.map(segment => {
              const newSegment = { ...segment, _id: undefined };
              newSegment.fileId = oldFileIdToNewFileIdMap[segment.fileId.toString()];
              if (segment.codeDefinition?._id) {
                  newSegment.codeDefinition = oldCodeDefIdToNewCodeDefMap[segment.codeDefinition._id.toString()];
              }
              return newSegment;
          }).filter(s => s.fileId && s.codeDefinition);
      }

      // Clone Highlights and Memos with mapped file references
      if (originalProject.inlineHighlights) {
          newProjectData.inlineHighlights = originalProject.inlineHighlights.map(highlight => ({
              ...highlight, _id: undefined, fileId: oldFileIdToNewFileIdMap[highlight.fileId.toString()]
          })).filter(h => h.fileId);
      }
      if (originalProject.memos) {
          newProjectData.memos = originalProject.memos.map(memo => ({
              ...memo, _id: undefined, fileId: oldFileIdToNewFileIdMap[memo.fileId.toString()]
          })).filter(m => m.fileId);
      }
    }

    // --- Persistence ---
    const newProject = new Project(newProjectData);
    await newProject.save();

    res.status(201).json(newProject);
  } catch (err) {
    console.error('Project copy failed:', err);
    res.status(500).json({ error: 'Project copy failed', details: err.message });
  }
});

export default router;