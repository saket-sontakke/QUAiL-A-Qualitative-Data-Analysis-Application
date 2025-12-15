import express from 'express';
import mongoose from 'mongoose';
import Project from '../models/Project.js';

const router = express.Router();

/**
 * Helper: Standard query to ensure the project exists and belongs to the user.
 */
const ownerQuery = (req) => ({ _id: req.params.projectId, owner: req.userId });

// --- Code Definition Routes ---

/**
 * Adds a new code definition (Atomic).
 */
router.post('/:projectId/code-definitions', async (req, res) => {
  const { name, description, color } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Code definition name is required.' });
  }

  try {
    // 1. Check for duplicate name without loading the whole project
    const exists = await Project.countDocuments({
      _id: req.params.projectId,
      owner: req.userId,
      'codeDefinitions.name': name
    });

    if (exists) {
      return res.status(400).json({ error: 'Code definition already exists' });
    }

    const newCodeDef = {
      _id: new mongoose.Types.ObjectId(),
      name,
      description,
      color,
      owner: req.userId
    };

    // 2. Atomic Push
    await Project.findOneAndUpdate(
      ownerQuery(req),
      { $push: { codeDefinitions: newCodeDef } }
    );

    res.status(201).json({ newCodeDefinition: newCodeDef });
  } catch (err) {
    res.status(500).json({ error: 'Create failed', details: err.message });
  }
});

/**
 * Updates a code definition (Atomic).
 * NOTE: This also updates the denormalized data in associated codedSegments.
 */
router.put('/:projectId/code-definitions/:codeDefId', async (req, res) => {
  const { name, description, color } = req.body;
  const { projectId, codeDefId } = req.params;

  try {
    // 1. Update the definition itself
    const projectUpdate = await Project.findOneAndUpdate(
      { ...ownerQuery(req), 'codeDefinitions._id': codeDefId },
      { 
        $set: {
          'codeDefinitions.$.name': name,
          'codeDefinitions.$.description': description,
          'codeDefinitions.$.color': color
        } 
      },
      { new: true, projection: { codeDefinitions: { $elemMatch: { _id: codeDefId } } } }
    );

    if (!projectUpdate) {
      return res.status(404).json({ error: 'Project or Code Definition not found' });
    }

    // 2. Update all codedSegments that use this definition (Bulk update)
    // We use arrayFilters to target segments with the matching codeDefinition._id
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

    res.json({ updatedCodeDefinition: projectUpdate.codeDefinitions[0] });
  } catch (err) {
    console.error('Update code definition error:', err);
    res.status(500).json({ error: 'Update failed', details: err.message });
  }
});

/**
 * Deletes a code definition (Atomic).
 */
router.delete('/:projectId/code-definitions/:codeDefId', async (req, res) => {
  try {
    const result = await Project.findOneAndUpdate(
      ownerQuery(req),
      {
        $pull: {
          codeDefinitions: { _id: req.params.codeDefId },
          codedSegments: { 'codeDefinition._id': new mongoose.Types.ObjectId(req.params.codeDefId) },
        },
      }
    );

    if (!result) return res.status(404).json({ error: 'Project not found' });
    res.json({ success: true, message: 'Code definition deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed', details: err.message });
  }
});

// --- Complex Operations (Merge/Split) ---
// Kept as Full Load for safety, but response payload reduced where possible.

router.post('/:projectId/codes/merge', async (req, res) => {
  // ... (Keep existing complex logic, but we can return just success or the new code def)
  // For now, to ensure safety of this complex logic, we retain the original logic
  // but we should ideally just return the changes. 
  // Given the complexity, we will return the project here to be safe, 
  // or you can refactor this later. The Prompt focused on CRUD.
  // I will retain the original implementation for Merge/Split to ensure logic integrity.
  
  // ORIGINAL LOGIC START
  const { projectId } = req.params;
  const { sourceCodeIds, newCodeName, newCodeColor } = req.body;
  if (!sourceCodeIds || !Array.isArray(sourceCodeIds) || sourceCodeIds.length < 2 || !newCodeName || !newCodeName.trim()) {
    return res.status(400).json({ error: 'Invalid request data.' });
  }
  try {
    const project = await Project.findOne(ownerQuery(req));
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
      if (segment.codeDefinition && sourceCodeIds.includes(segment.codeDefinition._id.toString())) {
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
    
    const updatedProject = await project.save();
    // Returning project here is acceptable as Merge is a rare, heavy operation
    res.json({ project: updatedProject }); 
  } catch (err) {
    console.error('Merge codes error:', err);
    res.status(500).json({ error: 'Server error during merge', details: err.message });
  }
});

router.post('/:projectId/codes/split', async (req, res) => {
  // ORIGINAL LOGIC RETAINED FOR SAFETY
  const { projectId } = req.params;
  const { sourceCodeId, newCodeDefinitions, assignments } = req.body;
  
  if (!sourceCodeId || !newCodeDefinitions || !assignments) {
    return res.status(400).json({ error: 'Invalid request data for split.' });
  }
  try {
    const project = await Project.findOne(ownerQuery(req));
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
        segment.codeDefinition = { 
          _id: newCode._id, 
          name: newCode.name, 
          color: newCode.color, 
          description: newCode.description 
        };
      }
    }
    
    project.codeDefinitions = project.codeDefinitions.filter(def => def._id.toString() !== sourceCodeId);
    
    const updatedProject = await project.save();
    res.json({ project: updatedProject });
  } catch (err) {
    console.error('Split codes error:', err);
    res.status(500).json({ error: 'Server error during split', details: err.message });
  }
});


// --- Coded Segment Routes ---

/**
 * Adds a new coded segment (Atomic).
 * Fetches only the Code Definition needed, not the full project.
 */
router.post('/:projectId/code', async (req, res) => {
  const { fileId, fileName, text, codeDefinitionId, startIndex, endIndex } = req.body;
  
  try {
    // 1. Fetch only the Code Definition to get name/color
    // We use projection to avoid loading the whole document
    const project = await Project.findOne(
      { ...ownerQuery(req), 'codeDefinitions._id': codeDefinitionId },
      { 'codeDefinitions.$': 1 }
    );

    if (!project || !project.codeDefinitions[0]) {
      return res.status(400).json({ error: 'Code definition not found' });
    }

    const codeDef = project.codeDefinitions[0];

    // 2. Prepare the new segment
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

    // 3. Atomic Push
    await Project.findOneAndUpdate(
      ownerQuery(req),
      { $push: { codedSegments: newSegment } }
    );

    // 4. Return ONLY the new segment
    res.json({ newSegment });
  } catch (err) {
    res.status(500).json({ error: 'Add segment failed', details: err.message });
  }
});

/**
 * Updates a coded segment (Atomic).
 */
router.put('/:projectId/code/:segmentId', async (req, res) => {
    const { projectId, segmentId } = req.params;
    const { codeId } = req.body; // The new Code Definition ID

    try {
      // 1. Fetch the NEW Code Definition details
      const projectWithDef = await Project.findOne(
        { ...ownerQuery(req), 'codeDefinitions._id': codeId },
        { 'codeDefinitions.$': 1 }
      );

      if (!projectWithDef || !projectWithDef.codeDefinitions[0]) {
        return res.status(400).json({ error: 'New code definition not found' });
      }

      const newCodeDef = projectWithDef.codeDefinitions[0];

      // 2. Atomic Update of the specific segment
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
          } 
        },
        { new: true, projection: { codedSegments: { $elemMatch: { _id: segmentId } } } }
      );

      if (!result) return res.status(404).json({ error: 'Segment not found' });

      res.json({ updatedSegment: result.codedSegments[0] });
    } catch (err) {
      console.error("Error updating coded segment:", err);
      res.status(500).json({ error: 'Update failed', details: err.message });
    }
  });

/**
 * Deletes a coded segment (Atomic).
 */
router.delete('/:projectId/code/:segmentId', async (req, res) => {
  try {
    await Project.findOneAndUpdate(
      ownerQuery(req),
      { $pull: { codedSegments: { _id: req.params.segmentId } } }
    );
    
    res.json({ success: true, message: 'Segment deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed', details: err.message });
  }
});

// --- Highlight Routes ---

/**
 * Adds a new inline highlight (Atomic).
 */
router.post('/:projectId/highlight', async (req, res) => {
  const { fileId, fileName, text, color, startIndex, endIndex } = req.body;
  try {
    const newHighlight = {
        _id: new mongoose.Types.ObjectId(),
        fileId, 
        fileName, 
        text, 
        color, 
        startIndex, 
        endIndex
    };

    await Project.findOneAndUpdate(
      ownerQuery(req), 
      { $push: { inlineHighlights: newHighlight } }
    );

    res.json({ newHighlight });
  } catch (err) {
    res.status(500).json({ error: 'Add highlight failed', details: err.message });
  }
});


/**
 * Deletes an inline highlight (Atomic).
 */
router.delete('/:projectId/highlight/:highlightId', async (req, res) => {
  try {
    await Project.findOneAndUpdate(
      ownerQuery(req), 
      { $pull: { inlineHighlights: { _id: req.params.highlightId } } }
    );
    res.json({ success: true, message: 'Highlight deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed', details: err.message });
  }
});

/**
 * Deletes multiple inline highlights (Bulk Atomic).
 */
router.post('/:projectId/highlight/delete-bulk', async (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: 'Invalid request: "ids" array is required.' });
    }
    try {
      await Project.findOneAndUpdate(
        ownerQuery(req), 
        { $pull: { inlineHighlights: { _id: { $in: ids } } } }
      );
      
      res.json({ success: true, message: `${ids.length} highlights deleted` });
    } catch (err) {
      res.status(500).json({ error: 'Bulk delete failed', details: err.message });
    }
  });

// --- Memo Routes ---

/**
 * Adds a new memo (Atomic).
 */
router.post('/:projectId/memos', async (req, res) => {
  const { fileId, fileName, text, title, content, startIndex, endIndex } = req.body;
  try {
    // We need the user name for the author field
    const User = mongoose.model('User');
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ error: 'User not found or unauthorized' });

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

    await Project.findOneAndUpdate(
      ownerQuery(req),
      { $push: { memos: newMemo } }
    );

    res.status(201).json({ newMemo });
  } catch (err) {
    console.error('Add memo error:', err);
    res.status(500).json({ error: 'Add memo failed', details: err.message });
  }
});

/**
 * Updates an existing memo (Atomic).
 */
router.put('/:projectId/memos/:memoId', async (req, res) => {
  const { title, content, text, startIndex, endIndex } = req.body;
  try {
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
            }
        },
        { new: true, projection: { memos: { $elemMatch: { _id: req.params.memoId } } } }
    );

    if (!result) return res.status(404).json({ error: 'Memo not found' });
    
    res.json({ updatedMemo: result.memos[0] });
  } catch (err) {
    console.error('Update memo error:', err);
    res.status(500).json({ error: 'Update memo failed', details: err.message });
  }
});

/**
 * Deletes a memo (Atomic).
 */
router.delete('/:projectId/memos/:memoId', async (req, res) => {
  try {
    await Project.findOneAndUpdate(
      ownerQuery(req), 
      { $pull: { memos: { _id: req.params.memoId } } }
    );
    res.json({ success: true, message: 'Memo deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Delete memo failed', details: err.message });
  }
});

export default router;