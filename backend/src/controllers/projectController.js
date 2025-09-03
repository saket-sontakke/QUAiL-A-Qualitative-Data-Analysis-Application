import jwt from 'jsonwebtoken';
import Project from '../models/Project.js';

/**
 * Express middleware to protect routes by requiring a valid JSON Web Token (JWT).
 * It verifies the token from the Authorization header and, if valid, attaches
 * the user's ID to the request object as `req.userId`.
 *
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The next middleware function.
 */
export const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Fetches a single project by its ID, ensuring the requesting user is the owner.
 * This controller should be used after the `requireAuth` middleware.
 * @route GET /api/projects/:id
 * @access Private
 * @param {import('express').Request} req - The Express request object, containing the project `id` in params and `userId` attached by middleware.
 * @param {import('express').Response} res - The Express response object.
 */
export const getProjectById = async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;

  try {
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