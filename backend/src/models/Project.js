import mongoose from 'mongoose';

/**
 * Defines the schema for a "code" or "tag" that users can create and apply to
 * text segments. This represents the metadata of a qualitative code.
 * @property {string} name - The user-defined name of the code.
 * @property {string} description - An optional, more detailed description of the code.
 * @property {string} color - The hex color code associated with the code for UI display.
 * @property {mongoose.Schema.Types.ObjectId} owner - The user who created this code.
 * @property {Date} createdAt - The timestamp when the code was created.
 */
const codeDefinitionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  color: { type: String, default: '#FFA500' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

/**
 * Represents a file (e.g., .txt, .docx, .mp3) that has been imported into a project
 * for analysis. It holds the content and associated metadata or properties.
 * @property {string} name - The original name of the imported file.
 * @property {string} content - The text content of the file.
 * @property {string} sourceType - The type of the source file, e.g., 'text' or 'audio'.
 * @property {string} audioUrl - A URL to the audio file if the source type is 'audio'.
 * @property {Map<string, string>} properties - A map of key-value pairs for storing document-level metadata, crucial for statistical grouping and analysis.
 */
const importedFileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  content: { type: String, required: true },
  sourceType: { type: String, enum: ['text', 'audio'], default: 'text' },
  audioUrl: { type: String, required: false },
  properties: {
    type: Map,
    of: String,
  },
}, { _id: true });

/**
 * Represents a specific segment of text from an imported file that has been
 * tagged with a code definition. This is the core unit of qualitative analysis.
 * @property {string} fileName - The name of the file from which the segment originates.
 * @property {mongoose.Schema.Types.ObjectId} fileId - The ID of the file from which the segment originates.
 * @property {string} text - The actual text content of the coded segment.
 * @property {object} codeDefinition - A snapshot of the code applied to this segment.
 * @property {number} startIndex - The starting character index of the segment within the original file content.
 * @property {number} endIndex - The ending character index of the segment within the original file content.
 */
const codedSegmentSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  fileId: { type: mongoose.Schema.Types.ObjectId, required: false },
  text: { type: String, required: true },
  codeDefinition: {
    _id: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    description: { type: String },
    color: { type: String },
  },
  startIndex: { type: Number, required: true },
  endIndex: { type: Number, required: true },
}, { _id: true });

/**
 * Represents a simple, colored highlight applied to a segment of text,
 * without any associated qualitative code.
 * @property {string} fileName - The name of the file where the highlight exists.
 * @property {mongoose.Schema.Types.ObjectId} fileId - The ID of the file where the highlight exists.
 * @property {string} text - The actual text content of the highlighted segment.
 * @property {string} color - The hex color code of the highlight.
 * @property {number} startIndex - The starting character index of the highlight.
 * @property {number} endIndex - The ending character index of the highlight.
 */
const inlineHighlightSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  fileId: { type: mongoose.Schema.Types.ObjectId, required: false },
  text: { type: String, required: true },
  color: { type: String, required: true },
  startIndex: { type: Number, required: true },
  endIndex: { type: Number, required: true },
}, { _id: true });

/**
 * Represents a user-written memo or note that is attached to a specific
 * segment of text within a file.
 * @property {string} fileName - The name of the file to which the memo is attached.
 * @property {mongoose.Schema.Types.ObjectId} fileId - The ID of the file to which the memo is attached.
 * @property {string} text - The text segment the memo is associated with.
 * @property {string} title - An optional title for the memo.
 * @property {string} content - The main body content of the memo.
 * @property {string} author - The name of the user who wrote the memo.
 * @property {mongoose.Schema.Types.ObjectId} authorId - The ID of the user who wrote the memo.
 * @property {number} startIndex - The starting character index of the associated text segment.
 * @property {number} endIndex - The ending character index of the associated text segment.
 * @property {Date} createdAt - The timestamp when the memo was created.
 * @property {Date} updatedAt - The timestamp when the memo was last updated.
 */
const memoSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  fileId: { type: mongoose.Schema.Types.ObjectId, required: false },
  text: { type: String, required: true },
  title: { type: String, required: false },
  content: { type: String, required: true },
  author: { type: String, required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startIndex: { type: Number, required: true },
  endIndex: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { _id: true });

/**
 * Defines the main schema for a Project. This acts as the central container
 * for all data related to a single qualitative analysis project, including files,
 * codes, and user-generated annotations, which are stored as sub-documents.
 * @property {string} name - The name of the project.
 * @property {object} data - A flexible object for storing miscellaneous project data.
 * @property {mongoose.Schema.Types.ObjectId} owner - The user who owns the project.
 * @property {Array<importedFileSchema>} importedFiles - A list of all files imported into the project.
 * @property {Array<codeDefinitionSchema>} codeDefinitions - A list of all codes defined for the project.
 * @property {Array<codedSegmentSchema>} codedSegments - A list of all text segments that have been coded.
 * @property {Array<inlineHighlightSchema>} inlineHighlights - A list of all simple text highlights.
 * @property {Array<memoSchema>} memos - A list of all memos written in the project.
 */
const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  data: { type: Object, default: {} },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  importedFiles: [importedFileSchema],
  codeDefinitions: [codeDefinitionSchema],
  codedSegments: [codedSegmentSchema],
  inlineHighlights: [inlineHighlightSchema],
  memos: [memoSchema],
}, { timestamps: true });

const Project = mongoose.model('Project', projectSchema);

export default Project;
