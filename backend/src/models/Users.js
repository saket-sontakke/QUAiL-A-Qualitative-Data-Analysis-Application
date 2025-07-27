import mongoose from 'mongoose';

/**
 * @description Defines the schema for a User document in the database.
 * This includes user credentials for authentication and fields
 * to support password reset functionality.
 */
const userSchema = new mongoose.Schema({
    name: String,
    email: {type: String, unique: true},
    password: String,
    resetToken: String,
    resetTokenExpiry: Date,
}, {timestamps: true});

export default mongoose.model('User', userSchema);