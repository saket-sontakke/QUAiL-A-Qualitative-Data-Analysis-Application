import express from 'express';
import mongoose from 'mongoose';
import Project from '../models/Project.js';

const router = express.Router();

// --- Code Definition Routes ---

/**
 * Adds a new code definition to a project.
 * @param {string} req.params.projectId - The ID of the project.
 * @param {string} req.body.name - The name of the new code definition.
 * @param {string} [req.body.description] - The description of the code definition.
 * @param {string} [req.body.color] - The color associated with the code definition.
 * @returns {object} 201 - An object containing the updated project.
 * @returns {object} 400 - An error object if the name is missing or already exists.
 * @returns {object} 404 - An error object if the project is not found.
 * @returns {object} 500 - An error object if the creation fails.
 */
router.post('/:projectId/code-definitions', async (req, res) => {
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
    res.status(201).json({ project: updatedProject });
  } catch (err) {
    res.status(500).json({ error: 'Create failed', details: err.message });
  }
});

/**
 * Updates an existing code definition within a project.
 * @param {string} req.params.projectId - The ID of the project.
 * @param {string} req.params.codeDefId - The ID of the code definition to update.
 * @param {string} req.body.name - The new name for the code definition.
 * @param {string} [req.body.description] - The new description.
 * @param {string} [req.body.color] - The new color.
 * @returns {object} 200 - An object containing the updated project.
 * @returns {object} 404 - An error object if the project or code definition is not found.
 * @returns {object} 500 - An error object if the update fails.
 */
router.put('/:projectId/code-definitions/:codeDefId', async (req, res) => {
  const { name, description, color } = req.body;
  const { projectId, codeDefId } = req.params;
  try {
    const project = await Project.findOne({ _id: projectId, owner: req.userId });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const codeToUpdate = project.codeDefinitions.id(codeDefId);
    if (!codeToUpdate) {
      return res.status(404).json({ error: 'Code definition not found' });
    }
    codeToUpdate.set({ name, description, color });
    project.codedSegments.forEach(segment => {
      if (segment.codeDefinition && segment.codeDefinition._id.toString() === codeDefId) {
        segment.codeDefinition.name = name;
        segment.codeDefinition.description = description;
        segment.codeDefinition.color = color;
      }
    });
    const updatedProject = await project.save();
    res.json({ project: updatedProject });
  } catch (err) {
    console.error('Update code definition error:', err);
    res.status(500).json({ error: 'Update failed', details: err.message });
  }
});

/**
 * Deletes a code definition and all associated coded segments from a project.
 * @param {string} req.params.projectId - The ID of the project.
 * @param {string} req.params.codeDefId - The ID of the code definition to delete.
 * @returns {object} 200 - A success message and the updated project object.
 * @returns {object} 404 - An error object if the project is not found.
 * @returns {object} 500 - An error object if the deletion fails.
 */
router.delete('/:projectId/code-definitions/:codeDefId', async (req, res) => {
  try {
    const project = await Project.findOneAndUpdate({ _id: req.params.projectId, owner: req.userId }, {
      $pull: {
        codeDefinitions: { _id: req.params.codeDefId },
        codedSegments: { 'codeDefinition._id': req.params.codeDefId },
      },
    }, { new: true });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json({ message: 'Code definition deleted', project });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed', details: err.message });
  }
});

/**
 * Merges multiple code definitions into a single new one.
 * @param {string} req.params.projectId - The ID of the project.
 * @param {Array<string>} req.body.sourceCodeIds - An array of code definition IDs to merge.
 * @param {string} req.body.newCodeName - The name for the new merged code.
 * @param {string} req.body.newCodeColor - The color for the new merged code.
 * @returns {object} 200 - The updated project object.
 * @returns {object} 400 - An error object for invalid request data.
 * @returns {object} 404 - An error object if the project is not found.
 * @returns {object} 500 - An error object if the merge fails.
 */
router.post('/:projectId/codes/merge', async (req, res) => {
  const { projectId } = req.params;
  const { sourceCodeIds, newCodeName, newCodeColor } = req.body;
  if (!sourceCodeIds || !Array.isArray(sourceCodeIds) || sourceCodeIds.length < 2 || !newCodeName || !newCodeName.trim()) {
    return res.status(400).json({ error: 'Invalid request data. Requires an array of at least two source code IDs and a non-empty new name.' });
  }
  try {
    const project = await Project.findOne({ _id: projectId, owner: req.userId });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const newCodeDefinition = {
      _id: new mongoose.Types.ObjectId(),
      name: newCodeName,
      color: newCodeColor,
      description: `Merged from codes.`,
      owner: req.userId
    };
    project.codeDefinitions.push(newCodeDefinition);
    project.codedSegments.forEach(segment => {
      if (sourceCodeIds.includes(segment.codeDefinition._id.toString())) {
        segment.codeDefinition = {
          _id: newCodeDefinition._id,
          name: newCodeDefinition.name,
          color: newCodeDefinition.color,
          description: newCodeDefinition.description,
        };
      }
    });
    project.codeDefinitions = project.codeDefinitions.filter(
      def => !sourceCodeIds.includes(def._id.toString())
    );
    await project.save();
    res.json({ project });
  } catch (err) {
    console.error('Merge codes error:', err);
    res.status(500).json({ error: 'Server error during merge', details: err.message });
  }
});

/**
 * Splits a single code definition into multiple new ones and reassigns its segments.
 * @param {string} req.params.projectId - The ID of the project.
 * @param {string} req.body.sourceCodeId - The ID of the code definition to split.
 * @param {Array<object>} req.body.newCodeDefinitions - An array of new code definition objects.
 * @param {object} req.body.assignments - An object mapping segment IDs to new code names.
 * @returns {object} 200 - The updated project object.
 * @returns {object} 400 - An error object for invalid request data.
 * @returns {object} 404 - An error object if the project is not found.
 * @returns {object} 500 - An error object if the split fails.
 */
router.post('/:projectId/codes/split', async (req, res) => {
  const { projectId } = req.params;
  const { sourceCodeId, newCodeDefinitions, assignments } = req.body;
  if (!sourceCodeId || !newCodeDefinitions || !assignments) {
    return res.status(400).json({ error: 'Invalid request data for split.' });
  }
  try {
    const project = await Project.findOne({ _id: projectId, owner: req.userId });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const newCodeMap = new Map();
    newCodeDefinitions.forEach(def => {
      const newDef = {
        _id: new mongoose.Types.ObjectId(),
        name: def.name,
        color: def.color,
        description: `Split from original code.`,
        owner: req.userId
      };
      project.codeDefinitions.push(newDef);
      newCodeMap.set(def.name, newDef);
    });
    for (const segmentId in assignments) {
      const newCodeIdentifier = assignments[segmentId];
      const segment = project.codedSegments.id(segmentId);
      if (!segment) continue;
      if (newCodeIdentifier === null) {
        project.codedSegments.pull({ _id: segmentId });
      } else if (newCodeMap.has(newCodeIdentifier)) {
        const newCode = newCodeMap.get(newCodeIdentifier);
        segment.codeDefinition = { _id: newCode._id, name: newCode.name, color: newCode.color, description: newCode.description, };
      }
    }
    project.codeDefinitions = project.codeDefinitions.filter(def => def._id.toString() !== sourceCodeId);
    await project.save();
    res.json({ project });
  } catch (err) {
    console.error('Split codes error:', err);
    res.status(500).json({ error: 'Server error during split', details: err.message });
  }
});


// --- Coded Segment Routes ---

/**
 * Adds a new coded segment to a project.
 * @param {string} req.params.projectId - The ID of the project.
 * @param {string} req.body.fileId - The ID of the file containing the segment.
 * @param {string} req.body.fileName - The name of the file.
 * @param {string} req.body.text - The text content of the segment.
 * @param {string} req.body.codeDefinitionId - The ID of the code definition to apply.
 * @param {number} req.body.startIndex - The starting character index of the segment.
 * @param {number} req.body.endIndex - The ending character index of the segment.
 * @returns {object} 200 - The updated project object and the newly created segment.
 * @returns {object} 400 - An error object if the code definition is not found.
 * @returns {object} 404 - An error object if the project is not found.
 * @returns {object} 500 - An error object if adding the segment fails.
 */
router.post('/:projectId/code', async (req, res) => {
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
      codeDefinition: { _id: codeDef._id, name: codeDef.name, description: codeDef.description, color: codeDef.color, },
    });
    const updatedProject = await project.save();
    const newSegment = updatedProject.codedSegments.at(-1);
    res.json({ project: updatedProject, newSegment });
  } catch (err) {
    res.status(500).json({ error: 'Add segment failed', details: err.message });
  }
});

/**
 * Updates a coded segment, typically to reassign it to a new code definition.
 * @param {string} req.params.projectId - The ID of the project.
 * @param {string} req.params.segmentId - The ID of the coded segment to update.
 * @param {string} req.body.codeId - The ID of the new code definition to assign.
 * @returns {object} 200 - The updated project object.
 * @returns {object} 400 - An error object if the new code definition is not found.
 * @returns {object} 404 - An error object if the project or segment is not found.
 * @returns {object} 500 - An error object if the update fails.
 */
router.put('/:projectId/code/:segmentId', async (req, res) => {
    const { projectId, segmentId } = req.params;
    const { codeId } = req.body;
    try {
      const project = await Project.findOne({ _id: projectId, owner: req.userId });
      if (!project) return res.status(404).json({ error: 'Project not found' });
      const segmentToUpdate = project.codedSegments.id(segmentId);
      if (!segmentToUpdate) return res.status(404).json({ error: 'Coded segment not found' });
      const newCodeDef = project.codeDefinitions.id(codeId);
      if (!newCodeDef) return res.status(400).json({ error: 'The new code definition was not found' });
      segmentToUpdate.codeDefinition = { _id: newCodeDef._id, name: newCodeDef.name, description: newCodeDef.description, color: newCodeDef.color, };
      await project.save();
      res.json({ project });
    } catch (err) {
      console.error("Error updating coded segment:", err);
      res.status(500).json({ error: 'Update failed', details: err.message });
    }
  });

/**
 * Deletes a coded segment from a project.
 * @param {string} req.params.projectId - The ID of the project.
 * @param {string} req.params.codeId - The ID of the coded segment to delete.
 * @returns {object} 200 - A success message and the updated project object.
 * @returns {object} 500 - An error object if the deletion fails.
 */
router.delete('/:projectId/code/:codeId', async (req, res) => {
  try {
    const project = await Project.findOneAndUpdate({ _id: req.params.projectId, owner: req.userId }, { $pull: { codedSegments: { _id: req.params.codeId } } }, { new: true });
    res.json({ message: 'Segment deleted', project });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed', details: err.message });
  }
});

// --- Highlight Routes ---

/**
 * Adds a new inline highlight to a project.
 * @param {string} req.params.projectId - The ID of the project.
 * @param {object} req.body - The highlight data.
 * @returns {object} 200 - The updated project object and the new highlight.
 * @returns {object} 500 - An error object if adding the highlight fails.
 */
router.post('/:projectId/highlight', async (req, res) => {
  const { fileId, fileName, text, color, startIndex, endIndex } = req.body;
  try {
    const project = await Project.findOneAndUpdate({ _id: req.params.projectId, owner: req.userId }, { $push: { inlineHighlights: { fileId, fileName, text, color, startIndex, endIndex } } }, { new: true });
    const newHighlight = project.inlineHighlights.at(-1);
    res.json({ project, newHighlight });
  } catch (err) {
    res.status(500).json({ error: 'Add highlight failed', details: err.message });
  }
});


/**
 * Deletes an inline highlight from a project.
 * @param {string} req.params.projectId - The ID of the project.
 * @param {string} req.params.highlightId - The ID of the highlight to delete.
 * @returns {object} 200 - A success message and the updated project object.
 * @returns {object} 500 - An error object if the deletion fails.
 */
router.delete('/:projectId/highlight/:highlightId', async (req, res) => {
  try {
    const project = await Project.findOneAndUpdate({ _id: req.params.projectId, owner: req.userId }, { $pull: { inlineHighlights: { _id: req.params.highlightId } } }, { new: true });
    res.json({ message: 'Highlight deleted', project });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed', details: err.message });
  }
});

/**
 * Deletes multiple inline highlights from a project in bulk.
 * @param {string} req.params.projectId - The ID of the project.
 * @param {Array<string>} req.body.ids - An array of highlight IDs to delete.
 * @returns {object} 200 - A success message and the updated project object.
 * @returns {object} 400 - An error object for an invalid request.
 * @returns {object} 404 - An error object if the project is not found.
 * @returns {object} 500 - An error object if the deletion fails.
 */
router.post('/:projectId/highlight/delete-bulk', async (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: 'Invalid request: "ids" array is required.' });
    }
    try {
      const project = await Project.findOneAndUpdate({ _id: req.params.projectId, owner: req.userId }, { $pull: { inlineHighlights: { _id: { $in: ids } } } }, { new: true });
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      res.json({ message: `${ids.length} highlights deleted`, project });
    } catch (err) {
      res.status(500).json({ error: 'Bulk delete failed', details: err.message });
    }
  });

// --- Memo Routes ---

/**
 * Adds a new memo to a project.
 * @param {string} req.params.projectId - The ID of the project.
 * @param {object} req.body - The memo data.
 * @returns {object} 201 - The new memo object and the updated project object.
 * @returns {object} 401 - An error object if the user is not found.
 * @returns {object} 404 - An error object if the project is not found.
 * @returns {object} 500 - An error object if adding the memo fails.
 */
router.post('/:projectId/memos', async (req, res) => {
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
    res.status(201).json({ newMemo: project.memos.at(-1), project });
  } catch (err) {
    console.error('Add memo error:', err);
    res.status(500).json({ error: 'Add memo failed', details: err.message });
  }
});

/**
 * Updates an existing memo in a project.
 * @param {string} req.params.projectId - The ID of the project.
 * @param {string} req.params.memoId - The ID of the memo to update.
 * @param {object} req.body - The updated memo data.
 * @returns {object} 200 - A success message and the updated project object.
 * @returns {object} 404 - An error object if the project or memo is not found.
 * @returns {object} 500 - An error object if the update fails.
 */
router.put('/:projectId/memos/:memoId', async (req, res) => {
  const { title, content, text, startIndex, endIndex } = req.body;
  try {
    const project = await Project.findOne({ _id: req.params.projectId, owner: req.userId });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const memo = project.memos.id(req.params.memoId);
    if (!memo) return res.status(404).json({ error: 'Memo not found' });
    memo.set({ title, content, text, startIndex, endIndex, updatedAt: new Date() });
    const updatedProject = await project.save();
    res.json({ message: 'Memo updated', project: updatedProject });
  } catch (err) {
    console.error('Update memo error:', err);
    res.status(500).json({ error: 'Update memo failed', details: err.message });
  }
});

/**
 * Deletes a memo from a project.
 * @param {string} req.params.projectId - The ID of the project.
 * @param {string} req.params.memoId - The ID of the memo to delete.
 * @returns {object} 200 - A success message and the updated project object.
 * @returns {object} 404 - An error object if the project is not found.
 * @returns {object} 500 - An error object if the deletion fails.
 */
router.delete('/:projectId/memos/:memoId', async (req, res) => {
  try {
    const project = await Project.findOneAndUpdate({ _id: req.params.projectId, owner: req.userId }, { $pull: { memos: { _id: req.params.memoId } } }, { new: true });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json({ message: 'Memo deleted', project });
  } catch (err) {
    res.status(500).json({ error: 'Delete memo failed', details: err.message });
  }
});

export default router;
