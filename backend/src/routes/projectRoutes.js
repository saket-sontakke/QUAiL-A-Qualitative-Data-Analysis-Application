import express from 'express';
import { requireAuth, getProjectMeta } from '../controllers/projectController.js';
import projectManagementRoutes from './projectManagementRoutes.js';
import projectFileManagementRoutes from './projectFileManagementRoutes.js';
import projectAnnotationRoutes from './projectAnnotationRoutes.js';
import projectExportRoutes from './projectExportRoutes.js';

/**
 * Main Express router for Project API endpoints.
 * * This router acts as a central hub for all project-related operations. It enforces 
 * authentication middleware globally for all downstream routes, handles specific 
 * metadata retrieval, and delegates granular functionality to specialized sub-routers.
 * * @module ProjectRouter
 */
const router = express.Router();

// --- Middleware Configuration ---
router.use(requireAuth);

// --- Direct Routes ---
router.get('/:id/meta', getProjectMeta);

// --- Sub-Router Delegation ---
router.use('/', projectManagementRoutes);
router.use('/', projectFileManagementRoutes);
router.use('/', projectAnnotationRoutes);
router.use('/', projectExportRoutes);

export default router;