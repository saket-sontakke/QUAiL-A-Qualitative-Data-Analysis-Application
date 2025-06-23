import express from 'express';
import multer from 'multer';
import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';

import Project from '../models/Project.js';
import { requireAuth, getProjectById } from '../controllers/projectController.js';

const router = express.Router();

// -----------------------------
// Multer config for file upload
// -----------------------------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
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
// Routes
// -------------------------

// Create new project
router.post('/create', requireAuth, async (req, res) => {
  const { name, data } = req.body;

  try {
    const project = await Project.create({
      name,
      data,
      owner: req.userId,
    });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: 'Project creation failed' });
  }
});

// Get all projects for logged-in user
router.get('/my-projects', requireAuth, async (req, res) => {
  try {
    const projects = await Project.find({ owner: req.userId });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get project by ID
router.get('/:id', requireAuth, getProjectById);

// Delete project
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await Project.findOneAndDelete({ _id: req.params.id, owner: req.userId });
    if (!result) return res.status(404).json({ error: "Project not found or not yours" });
    res.json({ message: "Project deleted" });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

// Update (edit) project
router.put('/:id', requireAuth, async (req, res) => {
  const { name, data } = req.body;
  try {
    const updated = await Project.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId },
      { name, data },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Project not found or not yours" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
});

// -------------------------
// Import file (.txt or .docx only)
// -------------------------
router.post('/import/:id', requireAuth, upload.single('file'), async (req, res) => {
  const { id } = req.params;
  const file = req.file;

  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const buffer = fs.readFileSync(file.path);
    let textContent = '';

    if (file.mimetype === 'text/plain') {
      textContent = buffer.toString();
    } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      textContent = result.value;
    } else {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    fs.unlinkSync(file.path); 

    const project = await Project.findOneAndUpdate(
      { _id: id, owner: req.userId },
      {
        $push: {
          importedFiles: {
            name: file.originalname,
            content: textContent,
          },
        },
      },
      { new: true }
    );

    res.json({ project });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error processing file' });
  }
});

export default router;



