import mongoose from 'mongoose';

/**
 * Mongoose schema definition for a Code Definition.
 * Represents a specific classification tag (code) used to mark and categorize data segments,
 * including visual properties like color for UI representation.
 *
 * @type {mongoose.Schema}
 * @property {string} name - The unique display name of the code (Required).
 * @property {string} description - A textual explanation of what this code represents.
 * @property {string} color - Hexadecimal color string for visual highlighting (Default: '#FFA500').
 * @property {ObjectId} owner - Reference to the User ID who created this code definition (Required).
 * @property {Date} createdAt - The timestamp when the code was created (Default: current time).
 */
const codeDefinitionSchema = new mongoose.Schema({
  // --- Field Definitions ---
  name: { type: String, required: true },
  description: { type: String },
  color: { type: String, default: '#FFA500' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
}, { 
  // --- Schema Options ---
  _id: true 
});

/**
 * Defines the Mongoose schema for Imported Files.
 * This schema structures the data for files uploaded to the system, handling
 * both text and audio formats with associated metadata and state flags.
 *
 * @property {string} name - The display name of the file.
 * @property {string} content - The main textual content or transcript of the file.
 * @property {string} sourceType - The format of the source ('text' or 'audio'). Defaults to 'text'.
 * @property {string} [audioUrl] - The external URL for the audio resource.
 * @property {Map<string, string>} properties - A map of dynamic key-value string pairs for additional metadata.
 * @property {boolean} isLocked - Indicates whether the file is locked to prevent modification. Defaults to false.
 */
const importedFileSchema = new mongoose.Schema({
  // --- Basic Information ---
  name: { type: String, required: true },
  content: { type: String, required: true },

  // --- Source Configuration ---
  sourceType: { type: String, enum: ['text', 'audio'], default: 'text' },
  audioUrl: { type: String, required: false },

  // --- Metadata & State ---
  properties: {
    type: Map,
    of: String,
  },
  isLocked: { type: Boolean, default: false },
}, { _id: true });

/**
 * Mongoose schema definition for a Coded Segment.
 * Represents a specific portion of text within a file that has been associated with a qualitative code.
 *
 * @property {string} fileName - The name of the source file containing the segment.
 * @property {mongoose.Schema.Types.ObjectId} [fileId] - Optional reference to the file's unique ID in the database.
 * @property {string} text - The actual content of the text segment.
 * @property {Object} codeDefinition - The metadata of the code applied to this segment.
 * @property {mongoose.Schema.Types.ObjectId} codeDefinition._id - The unique identifier of the code definition.
 * @property {string} codeDefinition.name - The display name of the code.
 * @property {string} [codeDefinition.description] - A description of what the code represents.
 * @property {string} [codeDefinition.color] - A hexadecimal color string associated with the code.
 * @property {number} startIndex - The character index where the segment begins.
 * @property {number} endIndex - The character index where the segment ends.
 */
const codedSegmentSchema = new mongoose.Schema({
  // --- Source Metadata ---
  fileName: { type: String, required: true },
  fileId: { type: mongoose.Schema.Types.ObjectId, required: false },

  // --- Segment Content ---
  text: { type: String, required: true },

  // --- Code Application Details ---
  codeDefinition: {
    _id: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    description: { type: String },
    color: { type: String },
  },

  // --- Positioning ---
  startIndex: { type: Number, required: true },
  endIndex: { type: Number, required: true },
}, { _id: true });

/**
 * Defines the Mongoose schema for storing inline highlights.
 * This schema represents a highlighted text segment within a specific file,
 * tracking the content, visual styling, and exact character positioning.
 *
 * @type {mongoose.Schema}
 * @property {string} fileName - The name of the associated file.
 * @property {mongoose.Schema.Types.ObjectId} [fileId] - Optional reference ID to the file document.
 * @property {string} text - The specific text content that was highlighted.
 * @property {string} color - The color code (hex or name) of the highlight.
 * @property {number} startIndex - The zero-based index indicating where the highlight begins.
 * @property {number} endIndex - The zero-based index indicating where the highlight ends.
 */
const inlineHighlightSchema = new mongoose.Schema({
  // --- File Association ---
  fileName: { type: String, required: true },
  fileId: { type: mongoose.Schema.Types.ObjectId, required: false },

  // --- Highlight Content & Style ---
  text: { type: String, required: true },
  color: { type: String, required: true },

  // --- Text Positioning ---
  startIndex: { type: Number, required: true },
  endIndex: { type: Number, required: true },
}, { _id: true });

/**
 * Defines the database schema for a "Memo" entity.
 * This schema defines the structure for storing memos, which represent annotations
 * or highlights associated with specific text ranges within a file.
 *
 * @property {string} fileName - The name of the file associated with the memo.
 * @property {ObjectId} fileId - Optional reference to the specific file ID.
 * @property {string} text - The selected text segment that the memo refers to.
 * @property {string} title - An optional title for the memo.
 * @property {string} content - The actual content or body of the memo note.
 * @property {string} author - The display name of the author.
 * @property {ObjectId} authorId - Reference to the User who created this memo.
 * @property {number} startIndex - The starting character index of the associated text range.
 * @property {number} endIndex - The ending character index of the associated text range.
 */
const memoSchema = new mongoose.Schema({
  // --- File Association ---
  fileName: { type: String, required: true },
  fileId: { type: mongoose.Schema.Types.ObjectId, required: false },

  // --- Memo Content ---
  text: { type: String, required: true },
  title: { type: String, required: false },
  content: { type: String, required: true },

  // --- Authorship ---
  author: { type: String, required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // --- Text Positioning ---
  startIndex: { type: Number, required: true },
  endIndex: { type: Number, required: true },

}, { 
  // --- Schema Options ---
  timestamps: true,
  _id: true 
});

/**
 * Defines the database schema for a "Project" entity.
 * A project acts as the central container for analysis data, including files,
 * code definitions, coded segments, highlights, and memos.
 *
 * @property {string} name - The display name of the project.
 * @property {string} description - An optional description of the project's scope.
 * @property {boolean} isImported - Flag indicating if the project was imported from an external source.
 * @property {Object} data - Storage for arbitrary project-specific metadata or configuration.
 * @property {ObjectId} owner - Reference to the User who owns this project.
 * @property {number} syncVersion - Version counter used for synchronization and conflict resolution.
 * @property {Array} importedFiles - Collection of files associated with the project.
 * @property {Array} codeDefinitions - Set of codes/tags defined within the project.
 * @property {Array} codedSegments - Segments of text/media associated with specific codes.
 * @property {Array} inlineHighlights - Inline text highlights within project files.
 * @property {Array} memos - Annotations or notes attached to the project or its contents.
 */
const projectSchema = new mongoose.Schema({
  // --- Core Metadata ---
  name: { type: String, required: true },
  description: { type: String, default: '' },

  // --- State & Configuration ---
  isImported: { type: Boolean, default: false },
  data: { type: Object, default: {} },

  // --- Relationships ---
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  syncVersion: { type: Number, default: 0 },

  // --- Embedded Sub-Documents ---
  importedFiles: [importedFileSchema],
  codeDefinitions: [codeDefinitionSchema],
  codedSegments: [codedSegmentSchema],
  inlineHighlights: [inlineHighlightSchema],
  memos: [memoSchema],
}, { 
  // --- Schema Options ---
  timestamps: true 
});

/**
 * The Mongoose model for the Project schema, providing an interface
 * for database interactions such as creating, querying, and updating projects.
 */
const Project = mongoose.model('Project', projectSchema);

export default Project;