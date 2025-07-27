import express from 'express';
import multer from 'multer';
import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

import Project from '../models/Project.js';
import { requireAuth } from '../controllers/projectController.js';
import mongoose from 'mongoose';

const router = express.Router();

// --- MIDDLEWARE SETUP ---

/**
 * @description Multer disk storage configuration.
 * - destination: Ensures the 'uploads/' directory exists and sets it as the destination for uploaded files.
 * - filename: Creates a unique filename for each uploaded file by prepending the current timestamp.
 */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

/**
 * @description Multer upload instance with file filtering.
 * - storage: Uses the defined disk storage configuration.
 * - fileFilter: Restricts file uploads to '.txt' and '.docx' extensions.
 */
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.txt', '.docx'].includes(ext)) cb(null, true);
    else cb(new Error('Unsupported file type'));
  },
});

// --- PROJECT CRUD ROUTES ---

/**
 * @route   POST /api/projects/create
 * @desc    Create a new project.
 * @access  Private
 * @body    { name: String, data: any }
 * @returns {Object} The newly created project document.
 */
router.post('/create', requireAuth, async (req, res) => {
  const { name, data } = req.body;
  try {
    const newProject = new Project({ name, data, owner: req.userId });
    await newProject.save();
    res.status(201).json(newProject);
  } catch (err) {
    res.status(500).json({ error: 'Project creation failed', details: err.message });
  }
});

/**
 * @route   PUT /api/projects/:id
 * @desc    Update an existing project.
 * @access  Private
 * @param   {String} id - The ID of the project to update.
 * @body    { name: String, data: any }
 * @returns {Object} The updated project document.
 */
router.put('/:id', requireAuth, async (req, res) => {
  const { name, data } = req.body;
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId },
      { $set: { name, data } },
      { new: true, runValidators: true }
    );
    if (!project) {
      return res.status(404).json({ error: 'Project not found or unauthorized' });
    }
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: 'Project update failed', details: err.message });
  }
});

/**
 * @route   GET /api/projects/my-projects
 * @desc    Get all projects owned by the authenticated user.
 * @access  Private
 * @returns {Array<Object>} An array of project documents.
 */
router.get('/my-projects', requireAuth, async (req, res) => {
  try {
    const projects = await Project.find({ owner: req.userId }).sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch projects', details: err.message });
  }
});

/**
 * @route   GET /api/projects/:id
 * @desc    Get a single project by its ID.
 * @access  Private
 * @param   {String} id - The ID of the project to retrieve.
 * @returns {Object} The project document.
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.userId }).lean();
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

/**
 * @route   DELETE /api/projects/:id
 * @desc    Delete a project by its ID.
 * @access  Private
 * @param   {String} id - The ID of the project to delete.
 * @returns {Object} A confirmation message.
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await Project.findOneAndDelete({ _id: req.params.id, owner: req.userId });
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed', details: err.message });
  }
});

// --- CODE DEFINITION ROUTES ---

/**
 * @route   POST /api/projects/:projectId/code-definitions
 * @desc    Create a new code definition within a project.
 * @access  Private
 * @param   {String} projectId - The ID of the project.
 * @body    { name: String, description: String, color: String }
 * @returns {Object} The updated project document with the new code definition.
 */
router.post('/:projectId/code-definitions', requireAuth, async (req, res) => {
  const { name, description, color } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Code definition name is required.' });
  }

  try {
    const project = await Project.findOne({ _id: req.params.projectId, owner: req.userId });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.codeDefinitions.some(cd => cd.name === name)) {
      return res.status(400).json({ error: 'Code definition already exists' });
    }

    project.codeDefinitions.push({ name, description, color, owner: req.userId });

    const updatedProject = await project.save();

    res.status(201).json(updatedProject);

  } catch (err) {
    res.status(500).json({ error: 'Create failed', details: err.message });
  }
});

/**
 * @route   PUT /api/projects/:projectId/code-definitions/:codeDefId
 * @desc    Update a code definition within a project.
 * @access  Private
 * @param   {String} projectId - The ID of the project.
 * @param   {String} codeDefId - The ID of the code definition to update.
 * @body    { name: String, description: String, color: String }
 * @returns {Object} The updated code definition.
 */
router.put('/:projectId/code-definitions/:codeDefId', requireAuth, async (req, res) => {
  const { name, description, color } = req.body;
  try {
    const project = await Project.findOne({ _id: req.params.projectId, owner: req.userId });
    const code = project?.codeDefinitions.id(req.params.codeDefId);
    if (!code) return res.status(404).json({ error: 'Code definition not found' });
    code.set({ name, description, color });
    await project.save();
    res.json({ codeDefinition: code });
  } catch (err) {
    res.status(500).json({ error: 'Update failed', details: err.message });
  }
});

/**
 * @route   DELETE /api/projects/:projectId/code-definitions/:codeDefId
 * @desc    Delete a code definition and all associated coded segments.
 * @access  Private
 * @param   {String} projectId - The ID of the project.
 * @param   {String} codeDefId - The ID of the code definition to delete.
 * @returns {Object} A confirmation message and the updated project document.
 */
router.delete('/:projectId/code-definitions/:codeDefId', requireAuth, async (req, res) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.projectId, owner: req.userId },
      {
        $pull: {
          codeDefinitions: { _id: req.params.codeDefId },
          codedSegments: { 'codeDefinition._id': req.params.codeDefId },
        },
      },
      { new: true }
    );
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json({ message: 'Code definition deleted', project });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed', details: err.message });
  }
});

// --- FILE MANAGEMENT ROUTES ---

/**
 * @route   POST /api/projects/import/:id
 * @desc    Import a file (.txt or .docx) into a project.
 * @access  Private
 * @param   {String} id - The ID of the project.
 * @form    { file: File }
 * @returns {Object} The updated project document with the imported file.
 */
router.post('/import/:id', upload.single('file'), requireAuth,  async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    let text = '';
    const buffer = fs.readFileSync(file.path);
    if (file.mimetype.includes('text')) text = buffer.toString();
    else if (file.mimetype.includes('word')) text = (await mammoth.extractRawText({ buffer })).value;
    fs.unlinkSync(file.path);
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId },
      { $push: { importedFiles: { name: file.originalname, content: text } } },
      { new: true }
    );
    res.json({ project });
  } catch (err) {
    if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    res.status(500).json({ error: 'File import failed', details: err.message });
  }
});

/**
 * @route   DELETE /api/projects/:projectId/files/:fileId
 * @desc    Delete a file and its associated data (coded segments, highlights, memos) from a project.
 * @access  Private
 * @param   {String} projectId - The ID of the project.
 * @param   {String} fileId - The ID of the file to delete.
 * @returns {Object} A confirmation message and the updated project document.
 */
router.delete('/:projectId/files/:fileId', requireAuth, async (req, res) => {
  try {
    const { projectId, fileId } = req.params;

    const project = await Project.findOneAndUpdate(
      { _id: projectId, owner: req.userId },
      {
        $pull: {
          importedFiles: { _id: fileId },
          codedSegments: { fileId },
          inlineHighlights: { fileId },
          memos: { fileId },
        },
      },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found or you do not have permission' });
    }

    res.json({ message: 'File and related data deleted', project });

  } catch (err) {
    res.status(500).json({ error: 'Delete failed', details: err.message });
  }
});

// --- CODED SEGMENT ROUTES ---

/**
 * @route   POST /api/projects/:projectId/code
 * @desc    Create a new coded segment in a project.
 * @access  Private
 * @param   {String} projectId - The ID of the project.
 * @body    { fileId: String, fileName: String, text: String, codeDefinitionId: String, startIndex: Number, endIndex: Number }
 * @returns {Object} The updated project document.
 */
router.post('/:projectId/code', requireAuth, async (req, res) => {
  const { fileId, fileName, text, codeDefinitionId, startIndex, endIndex } = req.body;
  try {
    const project = await Project.findOne({ _id: req.params.projectId, owner: req.userId });

    if (!project) {
        return res.status(404).json({ error: 'Project not found' });
    }

    const codeDef = project?.codeDefinitions.id(codeDefinitionId);
    if (!codeDef) return res.status(400).json({ error: 'Code definition not found' });
    project.codedSegments.push({
      fileId,
      fileName,
      text,
      startIndex,
      endIndex,
      codeDefinition: {
        _id: codeDef._id,
        name: codeDef.name,
        description: codeDef.description,
        color: codeDef.color,
      },
    });
    await project.save();
    res.json({ project });
  } catch (err) {
    res.status(500).json({ error: 'Add segment failed', details: err.message });
  }
});

/**
 * @route   DELETE /api/projects/:projectId/code/:codeId
 * @desc    Delete a coded segment from a project.
 * @access  Private
 * @param   {String} projectId - The ID of the project.
 * @param   {String} codeId - The ID of the coded segment to delete.
 * @returns {Object} A confirmation message and the updated project document.
 */
router.delete('/:projectId/code/:codeId', requireAuth, async (req, res) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.projectId, owner: req.userId },
      { $pull: { codedSegments: { _id: req.params.codeId } } },
      { new: true }
    );
    res.json({ message: 'Segment deleted', project });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed', details: err.message });
  }
});

// --- HIGHLIGHT ROUTES ---

/**
 * @route   POST /api/projects/:projectId/highlight
 * @desc    Create a new highlight in a project.
 * @access  Private
 * @param   {String} projectId - The ID of the project.
 * @body    { fileId: String, fileName: String, text: String, color: String, startIndex: Number, endIndex: Number }
 * @returns {Object} The updated project document.
 */
router.post('/:projectId/highlight', requireAuth, async (req, res) => {
  const { fileId, fileName, text, color, startIndex, endIndex } = req.body;
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.projectId, owner: req.userId },
      { $push: { inlineHighlights: { fileId, fileName, text, color, startIndex, endIndex } } },
      { new: true }
    );
    res.json({ project });
  } catch (err) {
    res.status(500).json({ error: 'Add highlight failed', details: err.message });
  }
});

/**
 * @route   DELETE /api/projects/:projectId/highlight/:highlightId
 * @desc    Delete a highlight from a project.
 * @access  Private
 * @param   {String} projectId - The ID of the project.
 * @param   {String} highlightId - The ID of the highlight to delete.
 * @returns {Object} A confirmation message and the updated project document.
 */
router.delete('/:projectId/highlight/:highlightId', requireAuth, async (req, res) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.projectId, owner: req.userId },
      { $pull: { inlineHighlights: { _id: req.params.highlightId } } },
      { new: true }
    );
    res.json({ message: 'Highlight deleted', project });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed', details: err.message });
  }
});

/**
 * @route   POST /api/projects/:projectId/highlight/delete-bulk
 * @desc    Delete multiple highlights from a project in bulk.
 * @access  Private
 * @param   {String} projectId - The ID of the project.
 * @body    { ids: Array<String> } - An array of highlight IDs to delete.
 * @returns {Object} A confirmation message and the updated project document.
 */
router.post('/:projectId/highlight/delete-bulk', requireAuth, async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ error: 'Invalid request: "ids" array is required.' });
  }
  
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.projectId, owner: req.userId },
      { $pull: { inlineHighlights: { _id: { $in: ids } } } },
      { new: true }
    );
    
    if (!project) {
        return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ message: `${ids.length} highlights deleted`, project });
  } catch (err) {
    res.status(500).json({ error: 'Bulk delete failed', details: err.message });
  }
});

// --- MEMO ROUTES ---

/**
 * @route   PUT /api/projects/:projectId/memos/:memoId
 * @desc    Update a memo in a project.
 * @access  Private
 * @param   {String} projectId - The ID of the project.
 * @param   {String} memoId - The ID of the memo to update.
 * @body    { title: String, content: String, text: String, startIndex: Number, endIndex: Number }
 * @returns {Object} A confirmation message and the updated memo.
 */
// router.put('/:projectId/memos/:memoId', requireAuth, async (req, res) => {
//   const { title, content, text, startIndex, endIndex } = req.body;
//   try {
//     const project = await Project.findOne({ _id: req.params.projectId, owner: req.userId });
//     if (!project) return res.status(404).json({ error: 'Project not found' });

//     const memo = project.memos.id(req.params.memoId);
//     if (!memo) return res.status(404).json({ error: 'Memo not found' });

//     memo.set({ title, content, text, startIndex, endIndex, updatedAt: new Date() });

//     await project.save();
//     res.json({ message: 'Memo updated', memo });
//   } catch (err) {
//     console.error('Update memo error:', err);
//     res.status(500).json({ error: 'Update memo failed', details: err.message });
//   }
// });
router.put('/:projectId/memos/:memoId', requireAuth, async (req, res) => {
  const { title, content, text, startIndex, endIndex } = req.body;
  try {
    const project = await Project.findOne({ _id: req.params.projectId, owner: req.userId });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const memo = project.memos.id(req.params.memoId);
    if (!memo) return res.status(404).json({ error: 'Memo not found' });

    memo.set({ title, content, text, startIndex, endIndex, updatedAt: new Date() });

    // Save the entire project document
    const updatedProject = await project.save();
    
    // Return the updated project object
    res.json({ message: 'Memo updated', project: updatedProject });
  } catch (err) {
    console.error('Update memo error:', err);
    res.status(500).json({ error: 'Update memo failed', details: err.message });
  }
});

/**
 * @route   POST /api/projects/:projectId/memos
 * @desc    Create a new memo in a project.
 * @access  Private
 * @param   {String} projectId - The ID of the project.
 * @body    { fileId: String, fileName: String, text: String, title: String, content: String, startIndex: Number, endIndex: Number }
 * @returns {Object} The newly created memo and the updated project document.
 */
router.post('/:projectId/memos', requireAuth, async (req, res) => {
  const { fileId, fileName, text, title, content, startIndex, endIndex } = req.body;
  try {
    const project = await Project.findOne({ _id: req.params.projectId, owner: req.userId });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const User = mongoose.model('User');
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ error: 'User not found or unauthorized' });

    project.memos.push({
      fileId,
      fileName,
      text,
      title,
      content,
      startIndex,
      endIndex,
      author: user.name,
      authorId: req.userId,
      createdAt: new Date(),
    });
    await project.save();
    res.status(201).json({ memo: project.memos.at(-1), project });
  } catch (err) {
    console.error('Add memo error:', err);
    res.status(500).json({ error: 'Add memo failed', details: err.message });
  }
});

/**
 * @route   DELETE /api/projects/:projectId/memos/:memoId
 * @desc    Delete a memo from a project.
 * @access  Private
 * @param   {String} projectId - The ID of the project.
 * @param   {String} memoId - The ID of the memo to delete.
 * @returns {Object} A confirmation message and the updated project document.
 */
router.delete('/:projectId/memos/:memoId', requireAuth, async (req, res) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.projectId, owner: req.userId },
      { $pull: { memos: { _id: req.params.memoId } } },
      { new: true }
    );
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json({ message: 'Memo deleted', project });
  } catch (err) {
    res.status(500).json({ error: 'Delete memo failed', details: err.message });
  }
});

// --- EXPORT ROUTES ---

/**
 * @description Utility function to ensure a valid ARGB hex color string.
 * @param {String} hexColor - The hex color string (e.g., '#RRGGBB').
 * @returns {String} A valid ARGB hex string (without '#'). Returns 'CCCCCC' as a fallback.
 */
function safeARGB(hexColor) {
  if (!hexColor || typeof hexColor !== 'string' || !/^#?[0-9A-Fa-f]{6}$/.test(hexColor)) {
    return 'CCCCCC'; // fallback gray
  }
  return hexColor.replace('#', '').toUpperCase();
}

/**
 * @route   GET /api/projects/:projectId/export-coded-segments
 * @desc    Export a project's coded segments to an Excel file.
 * @access  Private
 * @param   {String} projectId - The ID of the project.
 * @returns {File} An .xlsx file containing the coded segments.
 */
router.get('/:projectId/export-coded-segments', requireAuth, async (req, res) => {
  const { projectId } = req.params;
  const userId = req.userId;

  try {
    const project = await Project.findOne({ _id: projectId, owner: userId }).lean();

    if (!project) {
      return res.status(404).json({ error: 'Project not found or unauthorized' });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Coded Segments');

    worksheet.columns = [
      { header: 'File Name', key: 'fileName', width: 30 },
      { header: 'Code Definition', key: 'codeName', width: 25 },
      { header: 'Code Description', key: 'codeDescription', width: 40 },
      { header: 'Coded Segment Text', key: 'text', width: 60 },
      { header: 'Frequency', key: 'frequency', width: 15 },
    ];

    worksheet.getRow(1).eachCell(cell => {
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.font = { bold: true };
    });

    worksheet.columns.forEach(col => {
      if (['codeDescription', 'text'].includes(col.key)) {
        col.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      } else {
        col.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      }
    });

    let totalFrequency = 0;
    let currentRow = 2;

    const groupedByFile = {};
    project.codedSegments.forEach(segment => {
      const fileName = segment.fileName || 'Unknown File';
      if (!groupedByFile[fileName]) groupedByFile[fileName] = [];
      groupedByFile[fileName].push(segment);
    });

    for (const [fileName, segments] of Object.entries(groupedByFile)) {
      const groupedByCode = {};
      segments.forEach(segment => {
        const defId = segment.codeDefinition?._id?.toString() || 'undefined';
        if (!groupedByCode[defId]) {
          groupedByCode[defId] = {
            definition: segment.codeDefinition,
            segments: [],
          };
        }
        groupedByCode[defId].segments.push(segment);
      });

      const fileStartRow = currentRow;

      for (const { definition, segments } of Object.values(groupedByCode)) {
        const codeColor = safeARGB(definition?.color);

        const defRow = worksheet.addRow({
          fileName: '',
          codeName: definition?.name || 'Unknown Code',
          codeDescription: definition?.description || 'No description',
          text: '',
          frequency: segments.length,
        });

        totalFrequency += segments.length;

        defRow.eachCell((cell, colNumber) => {
          if (colNumber === 1 || colNumber === 2) {
            cell.font = { bold: true };
          }
          if (colNumber !== 1) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: codeColor },
            };
          }
        });

        currentRow++;

        for (const segment of segments) {
          const segRow = worksheet.addRow({
            fileName: '',
            codeName: '',
            codeDescription: '',
            text: segment.text || '',
            frequency: '',
          });

          segRow.getCell('text').fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: codeColor },
          };

          currentRow++;
        }

        worksheet.addRow({});
        currentRow++;
      }

      const fileEndRow = currentRow - 1;
      if (fileEndRow >= fileStartRow) {
        const cell = worksheet.getCell(`A${fileStartRow}`);
        cell.value = fileName;
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        worksheet.mergeCells(`A${fileStartRow}:A${fileEndRow}`);
      }
    }

    const totalRow = worksheet.addRow({
      fileName: '',
      codeName: '',
      codeDescription: '',
      text: 'Total',
      frequency: totalFrequency,
    });

    totalRow.getCell('text').alignment = { horizontal: 'center', vertical: 'middle' };
    totalRow.getCell('frequency').alignment = { horizontal: 'center', vertical: 'middle' };
    totalRow.getCell('text').font = { bold: true };
    totalRow.getCell('frequency').font = { bold: true };

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${project.name}_coded_segments.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('[EXPORT ERROR]', err);
    res.status(500).json({ error: 'Failed to export coded segments', details: err.message });
  }
});

/**
 * @route   GET /api/projects/:projectId/export-memos
 * @desc    Export a project's memos to an Excel file.
 * @access  Private
 * @param   {String} projectId - The ID of the project.
 * @returns {File} An .xlsx file containing the memos.
 */
router.get('/:projectId/export-memos', requireAuth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Memos');

    worksheet.columns = [
      { header: 'File Name', key: 'fileName', width: 25 },
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Content', key: 'content', width: 50 },
      { header: 'Author', key: 'author', width: 20 },
      { header: 'Created At', key: 'createdAt', width: 25 },
    ];

    project.memos.forEach(memo => {
      worksheet.addRow({
        fileName: memo.fileName,
        title: memo.title || '',
        content: memo.content,
        author: memo.author,
        createdAt: memo.createdAt
        ? memo.createdAt.toLocaleString('en-GB', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })
        : '',
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename=memos.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to export memos.' });
  }
});

export default router;