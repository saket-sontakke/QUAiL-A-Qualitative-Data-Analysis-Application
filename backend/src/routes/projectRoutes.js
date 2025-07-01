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

// -- MIDDLEWARE --
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
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.txt', '.docx'].includes(ext)) cb(null, true);
    else cb(new Error('Unsupported file type'));
  },
});

// -- CREATE PROJECT --
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

// -- GET MY PROJECTS --
router.get('/my-projects', requireAuth, async (req, res) => {
  try {
    const projects = await Project.find({ owner: req.userId }).sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch projects', details: err.message });
  }
});

// -- GET PROJECT BY ID --
router.get('/:id', requireAuth, async (req, res) => {
  try {
    // Ensure memos are included in the fetched project data
    const project = await Project.findOne({ _id: req.params.id, owner: req.userId }).lean();
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// -- DELETE PROJECT --
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await Project.findOneAndDelete({ _id: req.params.id, owner: req.userId });
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed', details: err.message });
  }
});

// -- GLOBAL CODE DEFINITIONS --
router.post('/:projectId/code-definitions', requireAuth, async (req, res) => {
  const { name, description, color } = req.body;
  try {
    const project = await Project.findOne({ _id: req.params.projectId, owner: req.userId });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.codeDefinitions.some(cd => cd.name === name)) {
      return res.status(400).json({ error: 'Code definition already exists' });
    }
    project.codeDefinitions.push({ name, description, color, owner: req.userId });
    await project.save();
    res.status(201).json({ codeDefinition: project.codeDefinitions.at(-1) });
  } catch (err) {
    res.status(500).json({ error: 'Create failed', details: err.message });
  }
});

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

// -- IMPORT FILE --
router.post('/import/:id', requireAuth, upload.single('file'), async (req, res) => {
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

// -- DELETE FILE --
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
          memos: { fileId } // NEW: Also delete memos associated with the file
        },
      },
      { new: true }
    );
    res.json({ message: 'File and related data deleted', project });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed', details: err.message });
  }
});

// -- CODE SEGMENTS --
router.post('/:projectId/code', requireAuth, async (req, res) => {
  const { fileId, fileName, text, codeDefinitionId, startIndex, endIndex } = req.body;
  try {
    const project = await Project.findOne({ _id: req.params.projectId, owner: req.userId });
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

// -- HIGHLIGHTS --
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

// -- MEMOS (NEW ROUTES) --

// Add this PUT route for updating memos
router.put('/:projectId/memos/:memoId', requireAuth, async (req, res) => {
  const { title, content, text, startIndex, endIndex } = req.body; // Include other fields as needed for update
  try {
    const project = await Project.findOne({ _id: req.params.projectId, owner: req.userId });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const memo = project.memos.id(req.params.memoId);
    if (!memo) return res.status(404).json({ error: 'Memo not found' });

    // Update memo fields
    memo.set({ title, content, text, startIndex, endIndex, updatedAt: new Date() }); // Add updatedAt if your schema supports it

    await project.save();
    res.json({ message: 'Memo updated', memo });
  } catch (err) {
    console.error('Update memo error:', err);
    res.status(500).json({ error: 'Update memo failed', details: err.message });
  }
});


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
    console.error('Add memo error:', err); // Add this line to see full error in backend logs
    res.status(500).json({ error: 'Add memo failed', details: err.message });
  }
});


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

// Utility: Ensure valid ARGB from hex color
function safeARGB(hexColor) {
  if (!hexColor || typeof hexColor !== 'string' || !/^#?[0-9A-Fa-f]{6}$/.test(hexColor)) {
    return 'CCCCCC'; // fallback gray
  }
  return hexColor.replace('#', '').toUpperCase();
}

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

    // Define headers
    worksheet.columns = [
      { header: 'File Name', key: 'fileName', width: 30 },
      { header: 'Code Definition', key: 'codeName', width: 25 },
      { header: 'Code Description', key: 'codeDescription', width: 40 },
      { header: 'Coded Segment Text', key: 'text', width: 60 },
      { header: 'Frequency', key: 'frequency', width: 15 },
    ];

    // Set header row alignment to center
    worksheet.getRow(1).eachCell(cell => {
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.font = { bold: true };
    });

    // Set alignment rules for content rows
    worksheet.columns.forEach(col => {
      if (['codeDescription', 'text'].includes(col.key)) {
        col.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      } else {
        col.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      }
    });

    let totalFrequency = 0;
    let currentRow = 2; // Start after header row

    // Group segments by file
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

    // Add TOTAL row under "Coded Segment Text"
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

    // Set response headers
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