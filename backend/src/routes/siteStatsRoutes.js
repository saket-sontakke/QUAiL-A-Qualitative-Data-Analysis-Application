import express from 'express';
import { getPublicStats, incrementVisits } from '../controllers/siteStatsController.js';

/**
 * Express router instance designed to handle site statistics endpoints.
 * Routes incoming HTTP requests to specific controller functions for
 * retrieving public statistics and incrementing visit counts.
 *
 * @type {import('express').Router}
 */
const router = express.Router();

// --- Route Definitions ---
router.get('/', getPublicStats);
router.get('/increment', incrementVisits);

export default router;