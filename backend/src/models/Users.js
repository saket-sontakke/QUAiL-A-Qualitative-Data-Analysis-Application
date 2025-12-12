import mongoose from 'mongoose';
import validator from 'validator';

/**
 * Defines the schema for a User document in the database.
 * Includes authentication fields and secure storage for external API keys.
 */
const userSchema = new mongoose.Schema({
  // --- 1. Identity & Auth ---
  name: {
    type: String,
    required: [true, 'Please tell us your name']
  },
  email: { 
    type: String, 
    unique: true,
    required: [true, 'Please provide an email'],
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please provide a password']
  },

  // --- 2. User Configuration (New Feature) ---
  apiKeys: {
    assemblyAI: {
      iv: String,
      encryptedData: String
    }
  },
  
  // --- 3. Email Verification ---
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  verificationTokenExpire: Date,

  // --- 4. Password Reset ---
  resetToken: String,
  resetTokenExpiry: Date,
}, { timestamps: true });

export default mongoose.model('User', userSchema);