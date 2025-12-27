import express from 'express';
import mongoose from 'mongoose';
import Project from '../models/Project.js';

// --- Router Initialization ---
const router = express.Router();

/**
 * Constructs a query filter to locate a specific project belonging to the authenticated user.
 * This helper ensures operations are scoped strictly to the requesting user's data.
 *
 * @param {Object} req - The Express request object containing `params.projectId` and `userId`.
 * @returns {Object} A MongoDB query object containing `_id` and `owner` fields.
 */
const ownerQuery = (req) => ({ _id: req.params.projectId, owner: req.userId });

/**
 * Handles the creation of a new code definition within a specific project.
 * Performs duplicate checking and atomically updates the project document.
 *
 * @route POST /:projectId/code-definitions
 * @param {Object} req - The Express request object.
 * @param {string} req.params.projectId - The ID of the project to update.
 * @param {string} req.userId - The ID of the authenticated user (attached by middleware).
 * @param {string} req.body.name - The name of the code definition (required).
 * @param {string} [req.body.description] - A description of the code definition.
 * @param {string} [req.body.color] - The color associated with the code definition.
 * @param {Object} res - The Express response object.
 * @returns {void} Returns a JSON response with the created definition or an error message.
 */
router.post('/:projectId/code-definitions', async (req, res) => {
  const { name, description, color } = req.body;

  // --- Input Validation ---
  if (!name) {
    return res.status(400).json({ message: 'Code definition name is required.' });
  }

  try {
    // --- Duplicate Check ---
    const exists = await Project.countDocuments({
      _id: req.params.projectId,
      owner: req.userId,
      'codeDefinitions.name': name
    });

    if (exists) {
      return res.status(400).json({ error: 'Code definition already exists' });
    }

    // --- Object Construction ---
    const newCodeDef = {
      _id: new mongoose.Types.ObjectId(),
      name,
      description,
      color,
      owner: req.userId
    };

    // --- Database Update ---
    await Project.findOneAndUpdate(
      ownerQuery(req),
      { 
        $push: { codeDefinitions: newCodeDef },
        $inc: { syncVersion: 1 } 
      }
    );

    res.status(201).json({ newCodeDefinition: newCodeDef });
  } catch (err) {
    res.status(500).json({ error: 'Create failed', details: err.message });
  }
});

/**
 * Updates a specific code definition within a project and propagates the changes
 * (name, description, color) to all coded segments that utilize this definition.
 * Also increments the project's sync version.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.body - The payload containing update fields (name, description, color).
 * @param {Object} req.params - The route parameters containing projectId and codeDefId.
 * @param {Object} res - The Express response object.
 * @returns {Promise<void>} Sends a JSON response with the updated definition or an error status.
 */
router.put('/:projectId/code-definitions/:codeDefId', async (req, res) => {
  const { name, description, color } = req.body;
  const { projectId, codeDefId } = req.params;

  try {
    // --- Primary Update: Code Definition & Sync Version ---
    const projectUpdate = await Project.findOneAndUpdate(
      { ...ownerQuery(req), 'codeDefinitions._id': codeDefId },
      {
        $set: {
          'codeDefinitions.$.name': name,
          'codeDefinitions.$.description': description,
          'codeDefinitions.$.color': color
        },
        $inc: { syncVersion: 1 }
      },
      { new: true, projection: { codeDefinitions: { $elemMatch: { _id: codeDefId } } } }
    );

    // --- Validation ---
    if (!projectUpdate) {
      return res.status(404).json({ error: 'Project or Code Definition not found' });
    }

    // --- Secondary Update: Denormalized Segment Data ---
    await Project.updateOne(
      ownerQuery(req),
      {
        $set: {
          "codedSegments.$[elem].codeDefinition.name": name,
          "codedSegments.$[elem].codeDefinition.description": description,
          "codedSegments.$[elem].codeDefinition.color": color
        }
      },
      { arrayFilters: [{ "elem.codeDefinition._id": new mongoose.Types.ObjectId(codeDefId) }] }
    );

    // --- Success Response ---
    res.json({ updatedCodeDefinition: projectUpdate.codeDefinitions[0] });
  } catch (err) {
    // --- Error Handling ---
    console.error('Update code definition error:', err);
    res.status(500).json({ error: 'Update failed', details: err.message });
  }
});

/**
 * Deletes a specific code definition from a project and removes all associated coded segments.
 * This operation atomically updates the project document and increments the synchronization version.
 *
 * @param {Object} req - The Express request object, containing project ID and code definition ID in params.
 * @param {Object} res - The Express response object used to return the operation status.
 * @returns {Promise<void>} Returns a JSON response indicating success or failure.
 */
router.delete('/:projectId/code-definitions/:codeDefId', async (req, res) => {
  try {
    // --- Database Update ---
    const result = await Project.findOneAndUpdate(
      ownerQuery(req),
      {
        $pull: {
          codeDefinitions: { _id: req.params.codeDefId },
          codedSegments: { 'codeDefinition._id': new mongoose.Types.ObjectId(req.params.codeDefId) },
        },
        $inc: { syncVersion: 1 }
      }
    );

    // --- Validation ---
    if (!result) return res.status(404).json({ error: 'Project not found' });

    // --- Success Response ---
    res.json({ success: true, message: 'Code definition deleted' });
  } catch (err) {
    // --- Error Handling ---
    res.status(500).json({ error: 'Delete failed', details: err.message });
  }
});

/**
 * Merges multiple existing code definitions into a single new code definition within a specific project.
 * Updates all associated coded segments to reference the new merged code and removes the original source codes.
 *
 * @param {Object} req - The Express request object.
 * @param {string} req.params.projectId - The ID of the target project.
 * @param {string[]} req.body.sourceCodeIds - Array of ID strings for the codes to be merged.
 * @param {string} req.body.newCodeName - The name for the newly created merged code.
 * @param {string} [req.body.newCodeColor] - The color for the newly created merged code.
 * @param {Object} res - The Express response object.
 * @returns {Object} JSON response containing the updated project object or an error message.
 */
router.post('/:projectId/codes/merge', async (req, res) => {
  const { projectId } = req.params;
  const { sourceCodeIds, newCodeName, newCodeColor } = req.body;

  // --- Input Validation ---
  if (!sourceCodeIds || !Array.isArray(sourceCodeIds) || sourceCodeIds.length < 2 || !newCodeName || !newCodeName.trim()) {
    return res.status(400).json({ error: 'Invalid request data.' });
  }

  try {
    // --- Project Retrieval ---
    const project = await Project.findOne(ownerQuery(req));
    if (!project) return res.status(404).json({ error: 'Project not found' });
    
    // --- New Code Definition ---
    const newCodeDefinition = {
      _id: new mongoose.Types.ObjectId(),
      name: newCodeName,
      color: newCodeColor,
      description: `Merged from codes.`,
      owner: req.userId
    };
    project.codeDefinitions.push(newCodeDefinition);
    
    // --- Segment Migration ---
    project.codedSegments.forEach(segment => {
      if (segment.codeDefinition && sourceCodeIds.includes(segment.codeDefinition._id.toString())) {
        segment.codeDefinition = {
          _id: newCodeDefinition._id,
          name: newCodeDefinition.name,
          color: newCodeDefinition.color,
          description: newCodeDefinition.description,
        };
      }
    });
    
    // --- Cleanup Old Definitions ---
    project.codeDefinitions = project.codeDefinitions.filter(
      def => !sourceCodeIds.includes(def._id.toString())
    );
    
    // --- Synchronization & Save ---
    project.syncVersion += 1;
    const updatedProject = await project.save();
    
    res.json({ project: updatedProject }); 
  } catch (err) {
    // --- Error Handling ---
    console.error('Merge codes error:', err);
    res.status(500).json({ error: 'Server error during merge', details: err.message });
  }
});

/**
 * Processes a request to split a single source code definition into multiple new code definitions.
 * This function creates new code entries, reassigns existing segments to these new codes based on user assignments,
 * removes the original code definition, and increments the project synchronization version.
 *
 * @param {Object} req - The Express request object containing project parameters and body data.
 * @param {string} req.params.projectId - The unique identifier of the target project.
 * @param {string} req.body.sourceCodeId - The ID of the original code definition to be split.
 * @param {Array<Object>} req.body.newCodeDefinitions - A list of new code objects containing name and color.
 * @param {Object} req.body.assignments - A key-value map where keys are segment IDs and values are new code names (or null to delete).
 * @param {Object} res - The Express response object used to return the updated project state.
 * @returns {Promise<void>} Resolves when the response is sent. Returns 400 for invalid input, 404 if project missing, or 500 for server errors.
 */
router.post('/:projectId/codes/split', async (req, res) => {
  const { projectId } = req.params;
  const { sourceCodeId, newCodeDefinitions, assignments } = req.body;
  
  // --- Input Validation ---
  if (!sourceCodeId || !newCodeDefinitions || !assignments) {
    return res.status(400).json({ error: 'Invalid request data for split.' });
  }
  try {
    // --- Project Retrieval ---
    const project = await Project.findOne(ownerQuery(req));
    if (!project) return res.status(404).json({ error: 'Project not found' });
    
    // --- New Code Definitions Generation ---
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
    
    // --- Segment Reassignment Logic ---
    for (const segmentId in assignments) {
      const newCodeIdentifier = assignments[segmentId];
      const segment = project.codedSegments.id(segmentId);
      if (!segment) continue;
      
      if (newCodeIdentifier === null) {
        project.codedSegments.pull({ _id: segmentId });
      } else if (newCodeMap.has(newCodeIdentifier)) {
        const newCode = newCodeMap.get(newCodeIdentifier);
        segment.codeDefinition = { 
          _id: newCode._id, 
          name: newCode.name, 
          color: newCode.color, 
          description: newCode.description 
        };
      }
    }
    
    // --- Cleanup Source Definition ---
    project.codeDefinitions = project.codeDefinitions.filter(def => def._id.toString() !== sourceCodeId);
    
    // --- Persistence and Synchronization ---
    project.syncVersion += 1;
    const updatedProject = await project.save();

    res.json({ project: updatedProject });
  } catch (err) {
    console.error('Split codes error:', err);
    res.status(500).json({ error: 'Server error during split', details: err.message });
  }
});

/**
 * Adds a new coded segment to a specific project.
 *
 * Validates the existence of the requested code definition within the project,
 * constructs a new segment object with denormalized definition data, and
 * atomically appends it to the project's segment list while incrementing the synchronization version.
 *
 * @route POST /:projectId/code
 * @param {Object} req - The Express request object.
 * @param {Object} req.params - The route parameters.
 * @param {string} req.params.projectId - The ID of the project to update.
 * @param {Object} req.body - The payload containing segment details.
 * @param {string} req.body.fileId - The ID of the file associated with the segment.
 * @param {string} req.body.fileName - The name of the file.
 * @param {string} req.body.text - The actual text content of the segment.
 * @param {string} req.body.codeDefinitionId - The ID of the code definition to link.
 * @param {number} req.body.startIndex - The character index where the segment begins.
 * @param {number} req.body.endIndex - The character index where the segment ends.
 * @param {Object} res - The Express response object.
 * @returns {Object} JSON response containing the newly created segment or an error message.
 */
router.post('/:projectId/code', async (req, res) => {
  const { fileId, fileName, text, codeDefinitionId, startIndex, endIndex } = req.body;
  
  try {
    // --- Fetch Code Definition ---
    const project = await Project.findOne(
      { ...ownerQuery(req), 'codeDefinitions._id': codeDefinitionId },
      { 'codeDefinitions.$': 1 }
    );

    // --- Validation ---
    if (!project || !project.codeDefinitions[0]) {
      return res.status(400).json({ error: 'Code definition not found' });
    }

    const codeDef = project.codeDefinitions[0];

    // --- Payload Construction ---
    const newSegment = {
      _id: new mongoose.Types.ObjectId(),
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
    };

    // --- Database Update ---
    await Project.findOneAndUpdate(
      ownerQuery(req),
      { 
        $push: { codedSegments: newSegment },
        $inc: { syncVersion: 1 } 
      }
    );

    // --- Response ---
    res.json({ newSegment });
  } catch (err) {
    // --- Error Handling ---
    res.status(500).json({ error: 'Add segment failed', details: err.message });
  }
});

/**
 * Updates the code definition associated with a specific coded segment within a project.
 * Performs a lookup for the new definition and atomically updates the segment while incrementing the sync version.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.params - The route parameters.
 * @param {string} req.params.projectId - The ID of the project.
 * @param {string} req.params.segmentId - The ID of the segment to update.
 * @param {Object} req.body - The request body.
 * @param {string} req.body.codeId - The ID of the new code definition to apply.
 * @param {Object} res - The Express response object.
 * @returns {Promise<void>} Sends a JSON response with the updated segment or an error.
 */
router.put('/:projectId/code/:segmentId', async (req, res) => {
    const { projectId, segmentId } = req.params;
    const { codeId } = req.body;

    try {
      // --- Fetch New Code Definition ---
      const projectWithDef = await Project.findOne(
        { ...ownerQuery(req), 'codeDefinitions._id': codeId },
        { 'codeDefinitions.$': 1 }
      );

      if (!projectWithDef || !projectWithDef.codeDefinitions[0]) {
        return res.status(400).json({ error: 'New code definition not found' });
      }

      const newCodeDef = projectWithDef.codeDefinitions[0];

      // --- Atomic Segment Update & Sync ---
      const result = await Project.findOneAndUpdate(
        { ...ownerQuery(req), 'codedSegments._id': segmentId },
        { 
          $set: {
            'codedSegments.$.codeDefinition': {
                _id: newCodeDef._id,
                name: newCodeDef.name,
                description: newCodeDef.description,
                color: newCodeDef.color
            }
          },
          $inc: { syncVersion: 1 }
        },
        { new: true, projection: { codedSegments: { $elemMatch: { _id: segmentId } } } }
      );

      if (!result) return res.status(404).json({ error: 'Segment not found' });

      // --- Response ---
      res.json({ updatedSegment: result.codedSegments[0] });
    } catch (err) {
      console.error("Error updating coded segment:", err);
      res.status(500).json({ error: 'Update failed', details: err.message });
    }
  });

/**
 * Deletes a specific coded segment from a project and increments the synchronization version.
 * Performs an atomic database update to remove the segment subdocument and update the version
 * counter in a single operation.
 *
 * @route DELETE /:projectId/code/:segmentId
 * @param {Object} req - The Express request object containing route parameters.
 * @param {string} req.params.projectId - The ID of the project owning the segment.
 * @param {string} req.params.segmentId - The unique ID of the segment to be deleted.
 * @param {Object} res - The Express response object used to return the operation status.
 * @returns {void} Sends a JSON response with success status or error details.
 */
router.delete('/:projectId/code/:segmentId', async (req, res) => {
  try {
    // --- Database Operation ---
    await Project.findOneAndUpdate(
      ownerQuery(req),
      { 
        $pull: { codedSegments: { _id: req.params.segmentId } },
        $inc: { syncVersion: 1 } 
      }
    );
    
    // --- Success Response ---
    res.json({ success: true, message: 'Segment deleted' });
  } catch (err) {
    // --- Error Handling ---
    res.status(500).json({ error: 'Delete failed', details: err.message });
  }
});

/**
 * Handles the creation of a new inline text highlight within a specific project file.
 * Updates the project document by pushing the new highlight and incrementing the 
 * synchronization version.
 *
 * @param {Object} req - The Express request object.
 * @param {string} req.body.fileId - The identifier of the file being highlighted.
 * @param {string} req.body.fileName - The name of the file.
 * @param {string} req.body.text - The actual text content to highlight.
 * @param {string} req.body.color - The color code for the highlight.
 * @param {number} req.body.startIndex - The starting character index of the highlight.
 * @param {number} req.body.endIndex - The ending character index of the highlight.
 * @param {Object} res - The Express response object.
 * @returns {void} Returns a JSON response containing the newly created highlight object.
 */
router.post('/:projectId/highlight', async (req, res) => {
  // --- Input Extraction ---
  const { fileId, fileName, text, color, startIndex, endIndex } = req.body;
  try {
    // --- Highlight Object Construction ---
    const newHighlight = {
        _id: new mongoose.Types.ObjectId(),
        fileId, 
        fileName, 
        text, 
        color, 
        startIndex, 
        endIndex
    };

    // --- Database Update & Sync ---
    await Project.findOneAndUpdate(
      ownerQuery(req), 
      { 
        $push: { inlineHighlights: newHighlight },
        $inc: { syncVersion: 1 } 
      }
    );

    res.json({ newHighlight });
  } catch (err) {
    // --- Error Handling ---
    res.status(500).json({ error: 'Add highlight failed', details: err.message });
  }
});

/**
 * Deletes a specific highlight from a project and increments the synchronization version.
 *
 * @param {Object} req - The Express request object, containing projectId and highlightId in params.
 * @param {Object} res - The Express response object used to return operation status.
 * @returns {Promise<void>} Sends a JSON response indicating success or failure.
 */
router.delete('/:projectId/highlight/:highlightId', async (req, res) => {
  try {
    // --- Database Update ---
    await Project.findOneAndUpdate(
      ownerQuery(req), 
      { 
        $pull: { inlineHighlights: { _id: req.params.highlightId } },
        $inc: { syncVersion: 1 } 
      }
    );

    // --- Success Response ---
    res.json({ success: true, message: 'Highlight deleted' });
  } catch (err) {
    // --- Error Handling ---
    res.status(500).json({ error: 'Delete failed', details: err.message });
  }
});

/**
 * Handles the bulk deletion of highlight entries for a specific project.
 * Performs an atomic update to remove specified highlights and increments the sync version.
 *
 * @param {Object} req - The Express request object.
 * @param {string} req.params.projectId - The unique identifier of the project (implicitly used in routing).
 * @param {string[]} req.body.ids - An array of unique identifiers for the highlights to delete.
 * @param {Object} res - The Express response object.
 * @returns {void} Returns a JSON response indicating success or failure.
 */
router.post('/:projectId/highlight/delete-bulk', async (req, res) => {
    const { ids } = req.body;

    // --- Input Validation ---
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: 'Invalid request: "ids" array is required.' });
    }
    try {
      // --- Database Update ---
      await Project.findOneAndUpdate(
        ownerQuery(req), 
        { 
          $pull: { inlineHighlights: { _id: { $in: ids } } },
          $inc: { syncVersion: 1 } 
        }
      );
      
      // --- Success Response ---
      res.json({ success: true, message: `${ids.length} highlights deleted` });
    } catch (err) {
      // --- Error Handling ---
      res.status(500).json({ error: 'Bulk delete failed', details: err.message });
    }
  });

/**
 * Handles the creation of a new memo within a specific project.
 * Retrieves the authenticated user to set authorship, constructs the memo object,
 * and atomically updates the project document by pushing the new memo and incrementing the sync version.
 *
 * @param {Object} req - The Express request object, containing project ID in params and memo details in body.
 * @param {Object} res - The Express response object used to return the operation status.
 * @returns {Promise<void>} Returns a JSON response with the created memo or an error message.
 */
router.post('/:projectId/memos', async (req, res) => {
  // --- Input Extraction ---
  const { fileId, fileName, text, title, content, startIndex, endIndex } = req.body;

  try {
    // --- User Validation ---
    const User = mongoose.model('User');
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ error: 'User not found or unauthorized' });

    // --- Memo Construction ---
    const newMemo = {
      _id: new mongoose.Types.ObjectId(),
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
      updatedAt: new Date(),
    };

    // --- Database Update ---
    await Project.findOneAndUpdate(
      ownerQuery(req),
      { 
        $push: { memos: newMemo },
        $inc: { syncVersion: 1 } 
      }
    );

    res.status(201).json({ newMemo });
  } catch (err) {
    // --- Error Handling ---
    console.error('Add memo error:', err);
    res.status(500).json({ error: 'Add memo failed', details: err.message });
  }
});

/**
 * Updates an existing memo within a specific project and increments the project's sync version.
 * * @route PUT /:projectId/memos/:memoId
 * @param {Object} req - The Express request object.
 * @param {string} req.params.projectId - The ID of the project containing the memo.
 * @param {string} req.params.memoId - The unique ID of the memo to update.
 * @param {Object} req.body - The payload containing memo updates.
 * @param {string} [req.body.title] - The new title for the memo.
 * @param {string} [req.body.content] - The new content for the memo.
 * @param {string} [req.body.text] - The raw text associated with the memo.
 * @param {number} [req.body.startIndex] - The start index for text highlighting.
 * @param {number} [req.body.endIndex] - The end index for text highlighting.
 * @param {Object} res - The Express response object.
 * @returns {Object} JSON response containing the updated memo object or an error message.
 */
router.put('/:projectId/memos/:memoId', async (req, res) => {
  const { title, content, text, startIndex, endIndex } = req.body;
  try {
    // --- Database Update ---
    const result = await Project.findOneAndUpdate(
        { ...ownerQuery(req), 'memos._id': req.params.memoId },
        { 
            $set: {
                'memos.$.title': title,
                'memos.$.content': content,
                'memos.$.text': text,
                'memos.$.startIndex': startIndex,
                'memos.$.endIndex': endIndex,
                'memos.$.updatedAt': new Date()
            },
            $inc: { syncVersion: 1 }
        },
        { new: true, projection: { memos: { $elemMatch: { _id: req.params.memoId } } } }
    );

    // --- Validation ---
    if (!result) return res.status(404).json({ error: 'Memo not found' });
    
    // --- Success Response ---
    res.json({ updatedMemo: result.memos[0] });
  } catch (err) {
    // --- Error Handling ---
    console.error('Update memo error:', err);
    res.status(500).json({ error: 'Update memo failed', details: err.message });
  }
});

/**
 * Handles the deletion of a specific memo from a project.
 * Removes the memo sub-document and increments the project's sync version for consistency.
 *
 * @name DELETE /:projectId/memos/:memoId
 * @param {Object} req - The Express request object, containing projectId and memoId params.
 * @param {Object} res - The Express response object used to return operation status.
 * @returns {Promise<void>} Sends a JSON response indicating success or failure.
 * @throws {Error} Returns a 500 status code if the database update fails.
 */
router.delete('/:projectId/memos/:memoId', async (req, res) => {
  try {
    // --- Database Update ---
    await Project.findOneAndUpdate(
      ownerQuery(req), 
      { 
        $pull: { memos: { _id: req.params.memoId } },
        $inc: { syncVersion: 1 } 
      }
    );

    // --- Success Response ---
    res.json({ success: true, message: 'Memo deleted' });
  } catch (err) {
    // --- Error Handling ---
    res.status(500).json({ error: 'Delete memo failed', details: err.message });
  }
});

export default router;