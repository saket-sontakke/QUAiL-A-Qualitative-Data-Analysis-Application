import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import Project from '../models/Project.js';

const router = express.Router();

// --- Configuration for .quail Import ---

const importStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = 'temp_uploads';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const uploadQuail = multer({ 
  storage: importStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.quail') || file.mimetype.includes('zip') || file.mimetype.includes('octet-stream')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .quail files are allowed.'), false);
    }
  }
});

// --- Utility Functions ---

/**
 * UTILITY: Garbage Collector
 * Deletes physical audio files from the disk when a project is deleted.
 */
const deleteProjectFiles = (project) => {
  if (!project.importedFiles || project.importedFiles.length === 0) return;

  project.importedFiles.forEach(file => {
    if (file.sourceType === 'audio' && file.audioUrl && !file.audioUrl.startsWith('http')) {
      try {
        const relativePath = file.audioUrl.startsWith('/') ? file.audioUrl.slice(1) : file.audioUrl;
        const filePath = path.resolve(relativePath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`[Cleanup] Deleted physical file: ${filePath}`);
        }
      } catch (err) {
        console.error(`[Cleanup] Failed to delete file for project ${project.name}:`, err);
      }
    }
  });
};

/**
 * UTILITY: Name Generator
 * Smartly handles duplicates.
 * "Project" -> "Project (1)"
 * "Project (1)" -> "Project (2)" (Not "Project (1) (1)")
 */
const generateUniqueName = async (inputName, userId) => {
  const nameWithoutSuffix = inputName.replace(/ \(\d+\)$/, '');

  const escapedName = nameWithoutSuffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  const regex = new RegExp(`^${escapedName}( \\(\\d+\\))?$`, 'i');
  const matches = await Project.find({ owner: userId, name: regex }).select('name');
  
  const isNameTaken = matches.some(p => p.name.toLowerCase() === inputName.toLowerCase());

  if (!isNameTaken) return inputName;

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


// --- Routes ---

/**
 * Imports a project from a .quail (ZIP) archive.
 */
router.post('/import-quail', uploadQuail.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No .quail file uploaded' });

  const zipPath = file.path;
  const extractionPath = path.join(file.destination, `ext-${file.filename}`);

  try {
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractionPath, true);

    const projectJsonPath = path.join(extractionPath, 'project.json');
    if (!fs.existsSync(projectJsonPath)) throw new Error('Invalid .quail file: project.json missing.');

    const rawData = fs.readFileSync(projectJsonPath, 'utf8');
    const projectData = JSON.parse(rawData);

    // 1. Resolve Project Name using new (N) logic
    const newName = await generateUniqueName(projectData.name, req.userId);

    // --- ID MAPPING INITIALIZATION ---
    const fileIdMap = {}; 
    const codeIdMap = {}; 

    const baseUploadDir = process.env.NODE_ENV === 'test' ? 'test_uploads' : 'uploads';
    const audioTargetDir = path.join(baseUploadDir, 'audio');
    if (!fs.existsSync(audioTargetDir)) fs.mkdirSync(audioTargetDir, { recursive: true });

    // 2. Process Files & Create New IDs
    if (projectData.importedFiles) {
      projectData.importedFiles = projectData.importedFiles.map(f => {
        const oldId = f._id;
        const newId = new mongoose.Types.ObjectId();
        fileIdMap[oldId] = newId.toString(); 

        if (f.sourceType === 'audio' && f.audioUrl && f.audioUrl.startsWith('assets/')) {
          const assetName = path.basename(f.audioUrl);
          const sourcePath = path.join(extractionPath, 'assets', assetName);
          
          if (fs.existsSync(sourcePath)) {
            const newFileName = `${Date.now()}-${Math.floor(Math.random() * 1000)}-${assetName}`;
            const targetPath = path.join(audioTargetDir, newFileName);
            fs.renameSync(sourcePath, targetPath);
            
            const relativeStoragePath = path.join(process.env.NODE_ENV === 'test' ? 'test_uploads' : 'uploads', 'audio', newFileName);
            f.audioUrl = '/' + relativeStoragePath.replace(/\\/g, '/');
          }
        }
        
        return { ...f, _id: newId };
      });
    }

    // 3. Process Code Definitions
    if (projectData.codeDefinitions) {
      projectData.codeDefinitions = projectData.codeDefinitions.map(c => {
        const oldId = c._id;
        const newId = new mongoose.Types.ObjectId();
        codeIdMap[oldId] = newId.toString();
        return { ...c, _id: newId, owner: req.userId };
      });
    }

    // 4. Update References
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

    // 5. Update Highlights
    if (projectData.inlineHighlights) {
      projectData.inlineHighlights = projectData.inlineHighlights.map(h => ({
        ...h,
        _id: new mongoose.Types.ObjectId(),
        fileId: fileIdMap[h.fileId] || h.fileId
      }));
    }

    // 6. Update Memos
    if (projectData.memos) {
      projectData.memos = projectData.memos.map(m => ({
        ...m,
        _id: new mongoose.Types.ObjectId(),
        fileId: fileIdMap[m.fileId] || m.fileId,
        authorId: req.userId
      }));
    }

    // 7. Save Project
    const newProject = new Project({
      ...projectData,
      name: newName,
      owner: req.userId,
      isImported: true, // <--- EXPLICIT FLAG FOR FRONTEND
      createdAt: undefined,
      updatedAt: undefined
    });

    await newProject.save();
    res.status(201).json(newProject);

  } catch (err) {
    console.error('Import failed:', err);
    res.status(500).json({ error: 'Import failed', details: err.message });
  } finally {
    try {
      if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
      if (fs.existsSync(extractionPath)) fs.rmSync(extractionPath, { recursive: true, force: true });
    } catch (e) { console.error('Cleanup error', e); }
  }
});

/**
 * Creates a new project for the authenticated user.
 */
router.post('/create', async (req, res) => {
  const { name, data } = req.body;
  try {
    const existingProject = await Project.findOne({
      owner: req.userId,
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });
    if (existingProject) {
      return res.status(409).json({ error: 'A project with this name already exists.' });
    }
    const newProject = new Project({ name, data, owner: req.userId, isImported: false });
    await newProject.save();
    res.status(201).json(newProject);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'A project with this name already exists.' });
    }
    res.status(500).json({ error: 'Project creation failed', details: err.message });
  }
});

// ... [Fetch Routes Remain Same] ...
router.get('/my-projects', async (req, res) => {
  try {
    const projects = await Project.find({ owner: req.userId }).sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch projects', details: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.userId }).lean();
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { name, data } = req.body;
  const projectId = req.params.id;
  try {
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
    const project = await Project.findOneAndUpdate({ _id: projectId, owner: req.userId }, { $set: { name, data } }, { new: true, runValidators: true });
    if (!project) {
      return res.status(404).json({ error: 'Project not found or unauthorized' });
    }
    res.json(project);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Another project with this name already exists.' });
    }
    res.status(500).json({ error: 'Project update failed', details: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.userId });
    if (!project) return res.status(404).json({ error: 'Not found' });
    deleteProjectFiles(project);
    await Project.deleteOne({ _id: project._id });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed', details: err.message });
  }
});

/**
 * Creates a copy of an existing project.
 */
router.post('/:projectId/copy', async (req, res) => {
  const { projectId } = req.params;
  const { includeAnnotations } = req.body;

  try {
    const originalProject = await Project.findOne({ _id: projectId, owner: req.userId }).lean();
    if (!originalProject) {
      return res.status(404).json({ error: 'Source project not found.' });
    }

    // 1. Resolve Unique Name using new (N) logic
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

    // 2. Process Files
    if (originalProject.importedFiles) {
        const tempProjectForFiles = new Project({ importedFiles: originalProject.importedFiles.map(f => ({...f, _id: undefined})) });
        
        originalProject.importedFiles.forEach((oldFile, index) => {
            const newFile = tempProjectForFiles.importedFiles[index];
            
            // Physical File Isolation
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
                  // Don't throw, just continue, user might lose one audio file but project survives
                }
            }
            
            oldFileIdToNewFileIdMap[oldFile._id.toString()] = newFile._id.toString();
            newProjectData.importedFiles.push(newFile.toObject());
        });
    }

    // 3. Process Annotations
    if (includeAnnotations) {
      const oldCodeDefIdToNewCodeDefMap = {};

      if (originalProject.codeDefinitions) {
          const tempProjectForDefs = new Project({ codeDefinitions: originalProject.codeDefinitions.map(d => ({...d, _id: undefined})) });
          originalProject.codeDefinitions.forEach((oldDef, index) => {
              const newDef = tempProjectForDefs.codeDefinitions[index];
              oldCodeDefIdToNewCodeDefMap[oldDef._id.toString()] = newDef.toObject();
              newProjectData.codeDefinitions.push(newDef.toObject());
          });
      }

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

    const newProject = new Project(newProjectData);
    await newProject.save();

    res.status(201).json(newProject);
  } catch (err) {
    console.error('Project copy failed:', err);
    res.status(500).json({ error: 'Project copy failed', details: err.message });
  }
});

export default router;