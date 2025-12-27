/**
 * Defines the maximum allowed file sizes in Megabytes for various file types supported by the application.
 * These values serve as the source of truth for file size validation.
 *
 * @constant
 * @type {Object}
 * @property {number} AUDIO_MB - Maximum size for audio files in MB.
 * @property {number} TEXT_MB - Maximum size for text/PDF files in MB.
 * @property {number} PROJECT_MB - Maximum size for .quail project import files in MB.
 */
export const FILE_LIMITS = {
  AUDIO_MB: 25,
  TEXT_MB: 5,
  PROJECT_MB: 15,
};

/**
 * Helper constants representing the file size limits converted into Bytes.
 * These values are derived mathematically from the `FILE_LIMITS` configuration.
 *
 * @constant
 * @type {Object}
 * @property {number} AUDIO - Maximum size for audio files in Bytes.
 * @property {number} TEXT - Maximum size for text/PDF files in Bytes.
 * @property {number} PROJECT - Maximum size for .quail project import files in Bytes.
 */
export const FILE_LIMITS_BYTES = {
  // --- Byte Conversion ---
  AUDIO: FILE_LIMITS.AUDIO_MB * 1024 * 1024,
  TEXT: FILE_LIMITS.TEXT_MB * 1024 * 1024,
  PROJECT: FILE_LIMITS.PROJECT_MB * 1024 * 1024,
};