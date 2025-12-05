/**
 * @file The main entry point for the Express application server.
 * @module server
 *
 * @description This file initializes the Express app, sets up middleware,
 * defines API routes, serves static files, and connects to the MongoDB
 * database before starting the server. The database connection and server
 * listening are conditionally skipped in a 'test' environment to allow for
 * isolated API testing.
 */

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import siteStatsRoutes from './routes/siteStatsRoutes.js';

/**
 * Loads environment variables from a .env file into process.env.
 */
dotenv.config();

/**
 * Replicates the __dirname functionality from CommonJS in ES Modules.
 * @constant {string} __filename - The absolute path to the current file.
 * @constant {string} __dirname - The absolute path to the directory of the current file.
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

/**
 * Middleware Setup
 * @property {function} cors - Enables Cross-Origin Resource Sharing.
 * @property {function} express.json - Parses incoming requests with JSON payloads.
 */
app.use(cors());
app.use(express.json());

/**
 * Serves static files from the 'uploads' directory. Any request to '/uploads'
 * will serve files from the '../uploads' folder relative to this file's location.
 */
const uploadsPath = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsPath));

/**
 * API Route Definitions
 * Mounts the respective routers on their designated URL paths.
 */
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/site-stats', siteStatsRoutes);

/**
 * Conditionally connects to MongoDB and starts the Express server.
 * This logic is bypassed when the application is run in a 'test' environment
 * to prevent the server from listening on a port and to allow test runners
 * to manage the application instance.
 */
if (process.env.NODE_ENV !== 'test') {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      app.listen(PORT, () => console.log(`Backend Server running on PORT ${PORT}`));
    })
    .catch((err) => console.error('Failed to connect to MongoDB:', err));
}

/**
 * Exports the Express app instance.
 * This is primarily used for allowing testing frameworks like Supertest to
 * make requests to the API without needing the server to be listening on a network port.
 * @type {express.Application}
 */
export default app;