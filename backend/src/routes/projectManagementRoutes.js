import express from 'express';
import mongoose from 'mongoose';
import Project from '../models/Project.js';

const router = express.Router();

/**
 * Creates a new project for the authenticated user.
 * @param {string} req.body.name - The name of the new project.
 * @param {object} [req.body.data] - Optional initial data for the project.
 * @returns {object} 201 - The newly created project object.
 * @returns {object} 409 - An error object if a project with the same name already exists.
 * @returns {object} 500 - An error object if the project creation fails.
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
    const newProject = new Project({ name, data, owner: req.userId });
    await newProject.save();
    res.status(201).json(newProject);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'A project with this name already exists.' });
    }
    res.status(500).json({ error: 'Project creation failed', details: err.message });
  }
});

/**
 * Fetches all projects owned by the authenticated user.
 * @returns {Array<object>} 200 - An array of project objects.
 * @returns {object} 500 - An error object if fetching fails.
 */
router.get('/my-projects', async (req, res) => {
  try {
    const projects = await Project.find({ owner: req.userId }).sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch projects', details: err.message });
  }
});

/**
 * Fetches a single project by its ID for the authenticated user.
 * @param {string} req.params.id - The ID of the project to fetch.
 * @returns {object} 200 - The project object.
 * @returns {object} 404 - An error object if the project is not found.
 * @returns {object} 500 - An error object if the server encounters an error.
 */
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.userId }).lean();
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

/**
 * Updates an existing project for the authenticated user.
 * @param {string} req.params.id - The ID of the project to update.
 * @param {string} [req.body.name] - The new name for the project.
 * @param {object} [req.body.data] - The new data for the project.
 * @returns {object} 200 - The updated project object.
 * @returns {object} 404 - An error object if the project is not found or the user is unauthorized.
 * @returns {object} 409 - An error object if another project with the new name already exists.
 * @returns {object} 500 - An error object if the update fails.
 */
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

/**
 * Deletes a project by its ID for the authenticated user.
 * @param {string} req.params.id - The ID of the project to delete.
 * @returns {object} 200 - A success message.
 * @returns {object} 404 - An error object if the project is not found.
 * @returns {object} 500 - An error object if the deletion fails.
 */
router.delete('/:id', async (req, res) => {
  try {
    const result = await Project.findOneAndDelete({ _id: req.params.id, owner: req.userId });
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed', details: err.message });
  }
});

/**
 * Creates a copy of an existing project.
 * The new project is named by appending "(Copy)" to the original name, with a number
 * if the name already exists. The user can choose whether to include all annotations
 * or just the base files.
 *
 * @param {string} req.params.projectId - The ID of the project to copy.
 * @param {boolean} req.body.includeAnnotations - If true, copies all code definitions,
 * coded segments, highlights, and memos. If false, only copies the imported files.
 * @returns {object} 201 - The newly created project object.
 * @returns {object} 404 - An error object if the source project is not found.
 * @returns {object} 500 - An error object if the copy operation fails.
 */
router.post('/:projectId/copy', async (req, res) => {
  const { projectId } = req.params;
  const { includeAnnotations } = req.body;

  try {
    const originalProject = await Project.findOne({ _id: projectId, owner: req.userId }).lean();
    if (!originalProject) {
      return res.status(404).json({ error: 'Source project not found.' });
    }

    let newName;
    let counter = 1;
    while (true) {
      const suffix = counter === 1 ? '(Copy)' : `(Copy ${counter})`;
      const nameToTest = `${originalProject.name} ${suffix}`;
      const existingProject = await Project.findOne({ owner: req.userId, name: nameToTest });
      if (!existingProject) {
        newName = nameToTest;
        break;
      }
      counter++;
    }

    const newProjectData = {
      name: newName,
      owner: req.userId,
      importedFiles: [],
      codeDefinitions: [],
      codedSegments: [],
      inlineHighlights: [],
      memos: [],
    };

    const oldFileIdToNewFileIdMap = {};

    if (originalProject.importedFiles) {
        const tempProjectForFiles = new Project({ importedFiles: originalProject.importedFiles.map(f => ({...f, _id: undefined})) });
        originalProject.importedFiles.forEach((oldFile, index) => {
            const newFile = tempProjectForFiles.importedFiles[index];
            oldFileIdToNewFileIdMap[oldFile._id.toString()] = newFile._id.toString();
            newProjectData.importedFiles.push(newFile.toObject());
        });
    }

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
