import express from 'express';
import { getPublicStats, incrementVisits } from '../controllers/siteStatsController.js';

const router = express.Router();

router.get('/', getPublicStats);
router.get('/increment', incrementVisits);

export default router;