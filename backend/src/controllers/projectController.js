import jwt from 'jsonwebtoken';
import Project from '../models/Project.js';
import User from '../models/Users.js';

/**
 * Express middleware to enforce authentication via JSON Web Token (JWT).
 * Extracts the token from the Authorization header, verifies it, and checks
 * if the user exists in the database. Appends the authenticated user ID to the request.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 * @param {Function} next - The next middleware function in the stack.
 * @returns {Promise<Object|void>} Returns a 401 JSON response if authentication fails, or calls next() if successful.
 */
export const requireAuth = async (req, res, next) => {
  // --- Token Extraction ---
  const token = req.headers.authorization?.split(' ')[1];

  // --- Token Presence Check ---
  if (!token) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }

  try {
    // --- Verification & User Lookup ---
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userExists = await User.findById(decoded.id).select('_id');

    if (!userExists) {
      return res.status(401).json({ error: 'User no longer exists. Access denied.' });
    }

    // --- Request Mutation & Propagation ---
    req.userId = decoded.id;
    next();
  } catch (err) {
    // --- Error Handling ---
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Retrieves a specific project by its unique identifier, verifying ownership.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} req.params - The request parameters.
 * @param {string} req.params.id - The unique ID of the project to retrieve.
 * @param {string} req.userId - The ID of the authenticated user (attached by middleware).
 * @param {Object} res - The Express response object.
 * @returns {Promise<void>} Sends a JSON response containing the project object or an error message.
 */
export const getProjectById = async (req, res) => {
  // --- Input Extraction ---
  const { id } = req.params;
  const userId = req.userId;

  try {
    // --- Database Query & Authorization ---
    const project = await Project.findOne({ _id: id, owner: userId });

    // --- Validation ---
    if (!project) {
      return res.status(404).json({ error: 'Project not found or you are not authorized to view it' });
    }

    // --- Successful Response ---
    res.json(project);
  } catch (err) {
    // --- Error Handling ---
    console.error('Error fetching project by ID:', err.message);
    res.status(500).json({ error: 'Server error while fetching project' });
  }
};

/**
 * Retrieves the synchronization metadata for a specific project owned by the authenticated user.
 * Performs an optimized database query to select only the version field.
 *
 * @param {Object} req - The Express request object.
 * @param {string} req.params.id - The unique identifier of the project.
 * @param {string} req.userId - The unique identifier of the authenticated user.
 * @param {Object} res - The Express response object.
 * @returns {Promise<void>} Responds with the project's syncVersion or an appropriate error status.
 */
export const getProjectMeta = async (req, res) => {
  // --- Input Extraction ---
  const { id } = req.params;
  const userId = req.userId;

  try {
    // --- Database Query ---
    const project = await Project.findOne({ _id: id, owner: userId }).select('syncVersion');

    // --- Validation ---
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // --- Response Execution ---
    res.json({ syncVersion: project.syncVersion });
  } catch (err) {
    // --- Error Handling ---
    console.error('Error fetching project version:', err.message);
    res.status(500).json({ error: 'Server error checking version' });
  }
};