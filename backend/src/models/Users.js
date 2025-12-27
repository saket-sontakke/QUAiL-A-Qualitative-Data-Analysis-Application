import mongoose from 'mongoose';
import validator from 'validator';

/**
 * Mongoose schema definition for the User model.
 * * Defines the structure for user documents, including authentication credentials,
 * encrypted storage for external API keys, and token management for account 
 * verification and password recovery.
 * * @type {mongoose.Schema}
 */
const userSchema = new mongoose.Schema({
  // --- Identity and Authentication ---
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

  // --- External API Configuration ---
  apiKeys: {
    assemblyAI: {
      iv: String,
      encryptedData: String
    }
  },
  
  // --- Account Verification ---
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  verificationTokenExpire: Date,

  // --- Password Recovery ---
  resetToken: String,
  resetTokenExpiry: Date,
}, { timestamps: true });

export default mongoose.model('User', userSchema);