import crypto from 'crypto';
import dotenv from 'dotenv';

// --- Configuration & Initialization ---
dotenv.config();

const algorithm = 'aes-256-cbc';
const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); 
const ivLength = 16; 

/**
 * Encrypts a given text string using AES-256-CBC algorithm.
 *
 * @param {string} text - The plain text string to be encrypted.
 * @returns {{iv: string, encryptedData: string}|null} An object containing the initialization vector and encrypted data in hex format, or null if input is invalid.
 */
export const encrypt = (text) => {
  // --- Validation ---
  if (!text) return null;

  // --- Cipher Initialization ---
  const iv = crypto.randomBytes(ivLength);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  // --- Encryption Execution ---
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return { iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') };
};

/**
 * Decrypts an encrypted data object back into a plain text string.
 *
 * @param {Object} text - The object containing the encryption details.
 * @param {string} text.iv - The initialization vector in hex format.
 * @param {string} text.encryptedData - The encrypted content in hex format.
 * @returns {string|null} The decrypted plain text string, or null if the input object or its properties are missing.
 */
export const decrypt = (text) => {
  // --- Validation ---
  if (!text || !text.iv || !text.encryptedData) return null;

  // --- Input Buffer Conversion ---
  const iv = Buffer.from(text.iv, 'hex');
  const encryptedText = Buffer.from(text.encryptedData, 'hex');

  // --- Decryption Execution ---
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString();
};