/**
 * Main application entry point for the Express backend.
 * * This module configures the server, connects to the database, sets up middleware,
 * defines API routes, and establishes background maintenance tasks for file cleanup.
 *
 * @module Server
 */

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs'; 
import { fileURLToPath } from 'url';
import { FILE_LIMITS } from './constants.js';

import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import siteStatsRoutes from './routes/siteStatsRoutes.js';
import transcriptionRoutes from './routes/transcriptionRoutes.js';

import Project from './models/Project.js'; 

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// --- Global Configuration ---
const GLOBAL_MAX_MB = Math.max(FILE_LIMITS.AUDIO_MB, FILE_LIMITS.TEXT_MB, FILE_LIMITS.PROJECT_MB);

app.use(cors());
app.use(express.json({ limit: `${GLOBAL_MAX_MB}mb` }));
app.use(express.urlencoded({ limit: `${GLOBAL_MAX_MB}mb`, extended: true }));

const uploadsPath = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsPath));

// --- Cleanup Configuration ---
const CLEANUP_CONFIG = {
  TEMP_FILE_AGE_LIMIT: 60 * 60 * 1000,           // 1 hour
  ORPHAN_AUDIO_AGE_LIMIT: 60 * 60 * 1000,        // 1 hour
  TEMP_CLEANUP_FREQUENCY: 60 * 60 * 1000,        // 1 hour
  ORPHAN_CLEANUP_FREQUENCY: 24 * 60 * 60 * 1000  // 24 hours
};

// --- Maintenance Utilities ---

/**
 * Scans the temporary uploads directory and removes files that exceed the defined age limit.
 * * @returns {void}
 */
const cleanStaleTempFiles = () => {
  const tempDir = path.join(__dirname, '..', 'temp_uploads');

  if (!fs.existsSync(tempDir)) return;

  fs.readdir(tempDir, (err, files) => {
    if (err) return console.error('[Janitor] Failed to read temp directory:', err);

    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) return;
        
        const now = Date.now();
        const deleteThreshold = new Date(stats.ctime).getTime() + CLEANUP_CONFIG.TEMP_FILE_AGE_LIMIT;

        if (now > deleteThreshold) {
          fs.rm(filePath, { recursive: true, force: true }, (rmErr) => {
             if (!rmErr) console.log(`[Janitor] Auto-deleted stale temp item: ${file}`);
          });
        }
      });
    });
  });
};

/**
 * Identifies and deletes audio files that are no longer referenced by any Project in the database.
 * * @returns {Promise<void>} Resolves when the cleanup operation is complete.
 */
const cleanOrphanedAudioFiles = async () => {
  const audioDir = path.join(__dirname, '..', 'uploads', 'audio');
  
  if (!fs.existsSync(audioDir)) return;

  try {
    console.log('[Deep Clean] Starting orphan check...');
    const diskFiles = fs.readdirSync(audioDir);
    if (diskFiles.length === 0) return;

    const projects = await Project.find({}, 'importedFiles.audioUrl');
    const validFiles = new Set();
    projects.forEach(p => {
      if (p.importedFiles) {
        p.importedFiles.forEach(f => {
          if (f.audioUrl) validFiles.add(path.basename(f.audioUrl));
        });
      }
    });

    let deletedCount = 0;
    diskFiles.forEach(file => {
      if (file.startsWith('.')) return; 

      if (!validFiles.has(file)) {
        const filePath = path.join(audioDir, file);
        try {
            const stats = fs.statSync(filePath);
            
            const safeTimeThreshold = Date.now() - CLEANUP_CONFIG.ORPHAN_AUDIO_AGE_LIMIT;
            
            if (stats.ctimeMs < safeTimeThreshold) {
                fs.rmSync(filePath, { recursive: true, force: true });
                console.log(`[Deep Clean] Deleted orphaned item: ${file}`);
                deletedCount++;
            }
        } catch (err) {
            console.error(`[Deep Clean] Error processing ${file}:`, err.message);
        }
      }
    });

    if (deletedCount > 0) console.log(`[Deep Clean] Cleanup complete. Removed ${deletedCount} orphans.`);

  } catch (err) {
    console.error('[Deep Clean] Failed:', err);
  }
};

// --- API Routes ---

app.get('/api/config', (req, res) => {
  res.json({ 
    limits: {
      audioMB: FILE_LIMITS.AUDIO_MB,
      textMB: FILE_LIMITS.TEXT_MB,
      projectMB: FILE_LIMITS.PROJECT_MB
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/site-stats', siteStatsRoutes);
app.use('/api/user', transcriptionRoutes);

// --- Server Initialization ---

if (process.env.NODE_ENV !== 'test') {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log('Connected to MongoDB');
      console.log(`Server Configured with Limits - Audio: ${FILE_LIMITS.AUDIO_MB}MB, Text: ${FILE_LIMITS.TEXT_MB}MB`);
      app.listen(PORT, () => console.log(`Backend Server running on PORT ${PORT}`));
      
      cleanStaleTempFiles();
      cleanOrphanedAudioFiles();
      
      setInterval(cleanStaleTempFiles, CLEANUP_CONFIG.TEMP_CLEANUP_FREQUENCY);
      setInterval(cleanOrphanedAudioFiles, CLEANUP_CONFIG.ORPHAN_CLEANUP_FREQUENCY);
    })
    .catch((err) => console.error('Failed to connect to MongoDB:', err));
}

export default app;