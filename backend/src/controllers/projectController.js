import jwt from 'jsonwebtoken';
import Project from '../models/Project.js';

/**
 * @desc    Middleware to protect routes by requiring a valid JSON Web Token (JWT).
 * It verifies the token from the Authorization header, and if valid,
 * attaches the user's ID to the request object (`req.userId`).
 * @param   {object} req - The Express request object.
 * @param   {object} res - The Express response object.
 * @param   {function} next - The next middleware function in the stack.
 * @returns {void} Calls `next()` if authentication is successful.
 * @returns {object} 401 - JSON object with an error if the token is missing or invalid.
 */
export const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * @route   GET /api/projects/:id
 * @desc    Fetches a single project by its ID, ensuring the requesting user is the owner.
 * @access  Private (should be used after the `requireAuth` middleware)
 * @param   {object} req - The Express request object, containing `params` and `userId`.
 * @param   {string} req.params.id - The ID of the project to retrieve.
 * @param   {string} req.userId - The ID of the authenticated user (added by `requireAuth`).
 * @param   {object} res - The Express response object.
 * @returns {object} 200 - The project document as a JSON object.
 * @returns {object} 404 - JSON object with an error if the project is not found or user is not the owner.
 * @returns {object} 500 - JSON object with a generic server error message.
 */
export const getProjectById = async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;
  try {
    // Find a project that matches both the project ID from the URL
    // and the owner ID from the authenticated user's token.
    // This is a critical security check to prevent users from accessing others' projects.
    const project = await Project.findOne({ _id: id, owner: userId });

    if (!project) {
      return res.status(404).json({ error: 'Project not found or you are not authorized to view it' });
    }

    res.json(project);
  } catch (err) {
    console.error('Error fetching project by ID:', err.message);
    res.status(500).json({ error: 'Server error while fetching project' });
  }
};