import jwt from 'jsonwebtoken';
import Project from '../models/Project.js'

export const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // "Bearer <token>"

  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const getProjectById = async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;

  try {
    const project = await Project.findOne({ _id: id, owner: userId }); 
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (err) {
    console.error('Error fetching project by ID:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};
