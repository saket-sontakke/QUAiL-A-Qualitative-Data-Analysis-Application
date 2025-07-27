// --- IMPORTS ---
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Apply essential middleware for CORS and JSON parsing.
app.use(cors());
app.use(express.json());

// Define the main API routes for the application.
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);

// Connect to the database and start the server, but only if not in a test environment.
if (process.env.NODE_ENV !== 'test') {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => {
      app.listen(PORT, () => console.log(`Backend Server running on PORT ${PORT}`));
    })
    .catch((err) => console.error("Failed to connect to MongoDB:", err));
}

// Export the app instance for use in testing frameworks like Supertest.
export default app;