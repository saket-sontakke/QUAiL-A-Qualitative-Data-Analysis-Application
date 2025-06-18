import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);

mongoose.connect(process.env.MONGO_URI)
.then(() => app.listen(PORT, () => console.log(`Backend Server running on PORT ${PORT}`)))
.catch((err) => console.error("Mongo Error - ", err));

