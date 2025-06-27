import express from 'express';
import multer from 'multer';
import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';

import Project from '../models/Project.js';
import { requireAuth } from '../controllers/projectController.js';

const router = express.Router();

// -----------------------------
// Multer config for file upload
// -----------------------------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    // Ensure the uploads directory exists
    // This part ensures the directory is available before Multer writes the file
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.txt', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  },
});

// -------------------------
// Project Routes
// -------------------------

// Create new project
router.post('/create', requireAuth, async (req, res) => {
  const { name, data } = req.body;
  const owner = req.userId;

  try {
    const newProject = new Project({ name, data, owner });
    await newProject.save();
    res.status(201).json(newProject);
  } catch (err) {
    console.error('Error creating project:', err);
    res.status(500).json({ error: 'Project creation failed', details: err.message });
  }
});

// Get all projects for logged-in user
router.get('/my-projects', requireAuth, async (req, res) => {
  try {
    const projects = await Project.find({ owner: req.userId }).sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.status(500).json({ error: 'Failed to fetch projects', details: err.message });
  }
});

// Get project by ID - MODIFIED TO ENSURE CODED SEGMENTS HAVE EMBEDDED COLOR
router.get('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;

  try {
    // Use .lean() to get a plain JavaScript object, making modifications easier
    const project = await Project.findOne({ _id: id, owner: userId }).lean();

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Ensure importedFiles and codedSegments exist as arrays to prevent errors
    project.importedFiles = project.importedFiles || [];
    project.codedSegments = project.codedSegments || [];

    // Iterate through codedSegments and ensure 'codeDefinition' is fully embedded
    project.codedSegments = project.codedSegments.map(segment => {
      // Check if 'codeDefinition' is entirely missing, or if 'color' or 'name' within it are missing
      if (!segment.codeDefinition || !segment.codeDefinition.color || !segment.codeDefinition.name) {
        // Find the file that this segment belongs to
        const file = project.importedFiles.find(f => f._id.toString() === segment.fileId?.toString());

        // Use segment.codeDefinitionId to find the original code definition
        const codeDefinitionIdentifier = segment.codeDefinition?._id || segment.codeDefinitionId;

        if (file && codeDefinitionIdentifier) {
          // Find the actual code definition from the file's codeDefinitions array
          const codeDefInFile = file.codeDefinitions.find(cd => cd._id.toString() === codeDefinitionIdentifier.toString());

          if (codeDefInFile) {
            // Reconstruct the embedded codeDefinition with complete details
            return {
              ...segment,
              codeDefinition: {
                _id: codeDefInFile._id,
                name: codeDefInFile.name,
                description: codeDefInFile.description,
                color: codeDefInFile.color || '#cccccc', // Ensure a fallback color if original is missing
              }
            };
          }
        }
      }
      return segment; // Return segment as is if it's already complete or no matching codeDef found
    });

    res.json(project); // Send the potentially modified project
  } catch (err) {
    console.error('Error fetching project by ID:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Delete project
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await Project.findOneAndDelete({ _id: req.params.id, owner: req.userId });
    if (!result) return res.status(404).json({ error: "Project not found or not yours" });
    res.status(200).json({ message: "Project deleted" });
  } catch (err) {
    console.error('Error deleting project:', err);
    res.status(500).json({ error: "Delete failed", details: err.message });
  }
});

// Update (edit) project name/data
router.put('/:id', requireAuth, async (req, res) => {
  const { name, data } = req.body;
  try {
    const updated = await Project.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId },
      { name, data },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ error: "Project not found or not yours" });
    res.json(updated);
  } catch (err) {
    console.error('Error updating project:', err);
    res.status(500).json({ error: "Update failed", details: err.message });
  }
});

// -------------------------
// File Import/Deletion Routes
// -------------------------

router.post('/import/:id', requireAuth, upload.single('file'), async (req, res) => {
  const { id: projectId } = req.params;
  const file = req.file;
  const userId = req.userId;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    let textContent = '';
    const buffer = fs.readFileSync(file.path);

    if (file.mimetype === 'text/plain') {
      textContent = buffer.toString();
    } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      textContent = result.value;
    } else {
      // Delete the temporary file for unsupported types before returning
      fs.unlinkSync(file.path);
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    // Delete the temporary file after content is extracted
    fs.unlinkSync(file.path);

    const project = await Project.findOneAndUpdate(
      { _id: projectId, owner: userId }, // Ensure the project belongs to the user
      {
        $push: {
          importedFiles: {
            name: file.originalname,
            content: textContent,
            codeDefinitions: [], // Initialize with an empty array as per schema
          },
        },
      },
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found or unauthorized' });
    }

    res.json({ project });
  } catch (err) {
    console.error('Error processing imported file:', err); // Keep a single error log for server-side debugging

    // Attempt to delete the temporary file if an error occurs during processing but after upload
    if (file && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
        // console.error('Temporary file cleaned up after error:', file.path); // Optional: log cleanup success/failure
      } catch (unlinkErr) {
        console.error('Failed to clean up temporary file:', unlinkErr);
      }
    }
    res.status(500).json({ error: 'Error processing file', details: err.message });
  }
});

// Delete Imported File
router.delete('/:projectId/files/:fileId', requireAuth, async (req, res) => {
  const { projectId, fileId } = req.params;
  const userId = req.userId;

  try {
    // Remove the file itself
    let project = await Project.findOneAndUpdate(
      { _id: projectId, owner: userId },
      { $pull: { importedFiles: { _id: fileId } } },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ error: "Project or file not found or not authorized to modify." });
    }

    // Remove all coded segments associated with this fileId
    project = await Project.findOneAndUpdate(
      { _id: projectId, owner: userId },
      { $pull: { codedSegments: { fileId: fileId } } },
      { new: true }
    );

    // Remove all inline highlights associated with this fileId
    project = await Project.findOneAndUpdate(
      { _id: projectId, owner: userId },
      { $pull: { inlineHighlights: { fileId: fileId } } },
      { new: true }
    );

    res.status(200).json({ message: "Imported file and its associated data deleted successfully", project });
  } catch (err) {
    console.error('Error deleting imported file and associated data:', err);
    res.status(500).json({ error: "Failed to delete imported file and associated data.", details: err.message });
  }
});

// -------------------------
// Code Definition Routes (Document-Specific)
// -------------------------

// Add a new code definition to a specific file within a project
router.post('/:projectId/files/:fileId/code-definitions', requireAuth, async (req, res) => {
  const { projectId, fileId } = req.params;
  const { name, description, color } = req.body;
  const owner = req.userId;

  try {
    // Find the project and the specific file within it
    const project = await Project.findOne(
      { _id: projectId, owner: owner, 'importedFiles._id': fileId },
    );

    if (!project) {
      return res.status(404).json({ error: 'Project or file not found or unauthorized.' });
    }

    const file = project.importedFiles.id(fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found within the project.' });
    }

    // Check for duplicate code definition name within THIS specific file
    const duplicateCode = file.codeDefinitions.find(def => def.name === name);
    if (duplicateCode) {
      return res.status(400).json({ error: `A code definition with the name "${name}" already exists for this document.` });
    }

    file.codeDefinitions.push({ name, description, color, owner });
    await project.save(); // Save the whole project to persist changes to the embedded file subdocument

    const newCodeDefinition = file.codeDefinitions[file.codeDefinitions.length - 1];
    res.status(201).json({ codeDefinition: newCodeDefinition });
  } catch (err) {
    console.error('Error adding code definition to file:', err);
    res.status(500).json({ error: 'Failed to add code definition to file', details: err.message });
  }
});

// Get all code definitions for a specific file within a project
router.get('/:projectId/files/:fileId/code-definitions', requireAuth, async (req, res) => {
  const { projectId, fileId } = req.params;
  const userId = req.userId;

  try {
    const project = await Project.findOne(
      { _id: projectId, owner: userId, 'importedFiles._id': fileId },
      { 'importedFiles.$': 1 } // Retrieve only the matching imported file
    );

    if (!project || !project.importedFiles || project.importedFiles.length === 0) {
      return res.status(404).json({ error: 'Project or file not found or unauthorized.' });
    }

    const file = project.importedFiles[0];
    res.status(200).json({ codeDefinitions: file.codeDefinitions || [] });
  } catch (err) {
    console.error('Error fetching file-specific code definitions:', err);
    res.status(500).json({ error: 'Failed to fetch code definitions for file', details: err.message });
  }
});

// Update a specific code definition within a specific file
router.put('/:projectId/files/:fileId/code-definitions/:codeDefId', requireAuth, async (req, res) => {
  const { projectId, fileId, codeDefId } = req.params;
  const { name, description, color } = req.body;
  const userId = req.userId;

  try {
    const project = await Project.findOne(
      { _id: projectId, owner: userId, 'importedFiles._id': fileId, 'importedFiles.codeDefinitions._id': codeDefId }
    );

    if (!project) {
      return res.status(404).json({ error: 'Project, file, or code definition not found or unauthorized.' });
    }

    const file = project.importedFiles.id(fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found within the project.' });
    }

    const codeDefinition = file.codeDefinitions.id(codeDefId);
    if (!codeDefinition) {
      return res.status(404).json({ error: 'Code definition not found within the file.' });
    }

    // Check for duplicate name if the name is being changed
    if (codeDefinition.name !== name) {
        const duplicateCode = file.codeDefinitions.find(def => def.name === name && def._id.toString() !== codeDefId);
        if (duplicateCode) {
            return res.status(400).json({ error: `A code definition with the name "${name}" already exists for this document.` });
        }
    }

    codeDefinition.name = name;
    codeDefinition.description = description;
    codeDefinition.color = color;
    await project.save(); // Save the whole project

    res.status(200).json({ codeDefinition });
  } catch (err) {
    console.error('Error updating file-specific code definition:', err);
    res.status(500).json({ error: 'Failed to update code definition for file', details: err.message });
  }
});

// Delete a specific code definition within a specific file (Cascading Deletion)
router.delete('/:projectId/files/:fileId/code-definitions/:codeDefId', requireAuth, async (req, res) => {
  const { projectId, fileId, codeDefId } = req.params;
  const userId = req.userId;

  try {
    // 1. Find the project and the specific file
    const project = await Project.findOne(
      { _id: projectId, owner: userId, 'importedFiles._id': fileId }
    );

    if (!project) {
      return res.status(404).json({ error: 'Project or file not found or unauthorized.' });
    }

    const file = project.importedFiles.id(fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found within the project.' });
    }

    // 2. Remove the code definition from the file's codeDefinitions array
    file.codeDefinitions.pull(codeDefId);
    await project.save(); // Save project after modifying embedded array

    // 3. Remove all coded segments associated with this code definition and fileId
    const updatedProject = await Project.findOneAndUpdate(
      { _id: projectId, owner: userId },
      { $pull: { codedSegments: { fileId: fileId, 'codeDefinition._id': codeDefId } } },
      { new: true }
    );

    res.status(200).json({ message: 'Code definition and associated segments deleted successfully', project: updatedProject });
  } catch (err) {
    console.error('Error deleting file-specific code definition and associated segments:', err);
    res.status(500).json({ error: 'Failed to delete code definition and associated segments', details: err.message });
  }
});


// -------------------------
// Coded Segment Routes (UPDATED for fileId)
// -------------------------

// Add coded segment (now requires fileId and embeds codeDefinition details)
router.post('/:projectId/code', requireAuth, async (req, res) => {
  const { fileName, fileId, text, codeDefinitionId, startIndex, endIndex } = req.body;
  const { projectId } = req.params; // Use projectId from URL

  try {
    // Find the project and the specific file to get the embedded code definition details
    const projectWithFileAndCodeDef = await Project.findOne(
      { _id: projectId, owner: req.userId, 'importedFiles._id': fileId, 'importedFiles.codeDefinitions._id': codeDefinitionId },
      { 'importedFiles.$': 1 } // Only retrieve the matching imported file subdocument
    );

    if (!projectWithFileAndCodeDef || !projectWithFileAndCodeDef.importedFiles || projectWithFileAndCodeDef.importedFiles.length === 0) {
      return res.status(400).json({ error: 'Invalid file ID or code definition ID provided for this project.' });
    }

    const file = projectWithFileAndCodeDef.importedFiles[0];
    const embeddedCodeDef = file.codeDefinitions.id(codeDefinitionId);

    if (!embeddedCodeDef) {
        return res.status(400).json({ error: 'Code definition not found within the specified file.' });
    }

    const project = await Project.findOneAndUpdate(
      { _id: projectId, owner: req.userId },
      {
        $push: {
          codedSegments: {
            fileName,
            fileId, // Include fileId
            text,
            codeDefinition: { // Embed the details
              _id: embeddedCodeDef._id,
              name: embeddedCodeDef.name,
              description: embeddedCodeDef.description,
              color: embeddedCodeDef.color, // <-- This is where the color is pulled from embeddedCodeDef
            },
            startIndex,
            endIndex,
          },
        },
      },
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found or unauthorized' });
    }

    res.status(200).json({ project });
  } catch (err) {
    console.error('Error saving coded segment:', err);
    res.status(500).json({ error: 'Failed to save coded segment', details: err.message });
  }
});

// Delete Coded Segment
router.delete('/:projectId/code/:codeId', requireAuth, async (req, res) => {
  const { projectId, codeId } = req.params;
  const userId = req.userId;

  try {
    const project = await Project.findOneAndUpdate(
      { _id: projectId, owner: userId },
      {
        $pull: {
          codedSegments: { _id: codeId }
        }
      },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ error: "Project not found or not authorized to modify." });
    }

    res.status(200).json({ message: "Coded segment deleted successfully", project });
  } catch (err) {
    console.error('Error deleting coded segment:', err);
    res.status(500).json({ error: "Failed to delete coded segment.", details: err.message });
  }
});


// -------------------------
// Inline Highlight Routes (UPDATED for fileId)
// -------------------------

// Add an inline highlight (now requires fileId)
router.post('/:projectId/highlight', requireAuth, async (req, res) => {
  const { fileName, fileId, text, color, startIndex, endIndex } = req.body;
  const { projectId } = req.params; // Use projectId from URL
  const userId = req.userId;

  try {
    const project = await Project.findOneAndUpdate(
      { _id: projectId, owner: userId, 'importedFiles._id': fileId }, // Ensure fileId exists in project
      { $push: { inlineHighlights: { fileName, fileId, text, color, startIndex, endIndex } } },
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({ error: "Project or file not found or unauthorized to highlight." });
    }

    res.status(200).json({ project });
  } catch (err) {
    console.error('Error saving inline highlight:', err);
    res.status(500).json({ error: 'Failed to save inline highlight', details: err.message });
  }
});

// Delete an inline highlight
router.delete('/:projectId/highlight/:highlightId', requireAuth, async (req, res) => {
  const { projectId, highlightId } = req.params;
  const userId = req.userId;

  try {
    const project = await Project.findOneAndUpdate(
      { _id: projectId, owner: userId },
      { $pull: { inlineHighlights: { _id: highlightId } } },
      { new: true }
    );
    if (!project) return res.status(404).json({ error: "Project or highlight not found" });
    res.status(200).json({ message: "Inline highlight deleted successfully", project });
  } catch (err) {
    console.error('Error deleting inline highlight:', err);
    res.status(500).json({ error: 'Failed to delete inline highlight', details: err.message });
  }
  });

export default router;
