import mongoose from 'mongoose';
import validator from 'validator';

/**
 * Defines the schema for a User document in the database. 
 */
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name']
  },
  email: { 
    type: String, 
    unique: true,
    required: [true, 'Please provide an email'],
    lowercase: true,
    // --- LEVEL 1: Strict Backend Validation ---
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please provide a password']
  },
  
  // --- LEVEL 2: Email Verification Fields ---
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  verificationTokenExpire: Date,
  // ------------------------------------------

  resetToken: String,
  resetTokenExpiry: Date,
}, { timestamps: true });

export default mongoose.model('User', userSchema);