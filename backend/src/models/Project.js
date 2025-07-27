import mongoose from 'mongoose';

/**
 * @description Defines a "code" or "tag" that users can create and apply to text segments.
 */
const codeDefinitionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  color: { type: String, default: '#FFA500' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

/**
 * @description Represents a file (e.g., .txt, .docx) imported into a project.
 */
const importedFileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  content: { type: String, required: true },
}, { _id: true });

/**
 * @description Represents a segment of text from a file that has been tagged with a code.
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
 * @description Represents a simple, colored highlight on a segment of text.
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
 * @description Represents a user-written memo attached to a segment of text.
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
 * @description The main schema for a Project, containing all related data as sub-documents.
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