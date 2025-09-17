import express from 'express';
import { requireAuth } from '../controllers/projectController.js';

// Import the modular routers
import projectManagementRoutes from './projectManagementRoutes.js';
import projectFileManagementRoutes from './projectFileManagementRoutes.js';
import projectAnnotationRoutes from './projectAnnotationRoutes.js';
import projectExportRoutes from './projectExportRoutes.js';

const router = express.Router();

// Apply the authentication middleware to all project-related routes
router.use(requireAuth);

// Delegate routes to the specialized routers
router.use('/', projectManagementRoutes);
router.use('/', projectFileManagementRoutes);
router.use('/', projectAnnotationRoutes);
router.use('/', projectExportRoutes);

export default router;
