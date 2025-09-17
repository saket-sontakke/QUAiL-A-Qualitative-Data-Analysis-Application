import mongoose from 'mongoose';

/**
 * Defines the schema for a User document in the database. This schema includes
 * essential user credentials for authentication and fields to support password
 * reset functionality.
 * @property {string} name - The user's full name.
 * @property {string} email - The user's email address, which must be unique and is used for login.
 * @property {string} password - The user's hashed password for authentication.
 * @property {string} resetToken - A temporary token generated for the password reset process.
 * @property {Date} resetTokenExpiry - The expiration date and time for the password reset token.
 */
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  resetToken: String,
  resetTokenExpiry: Date,
}, { timestamps: true });

export default mongoose.model('User', userSchema);