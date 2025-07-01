import mongoose from 'mongoose';

// ========== CODE DEFINITIONS (Global) ==========
const codeDefinitionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  color: { type: String, default: '#FFA500' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: true }); // _id is needed for updating/deleting

// ========== IMPORTED FILES ==========
const importedFileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  content: { type: String, required: true },
}, { _id: true }); // Removed codeDefinitions from here

// ========== CODED SEGMENTS ==========
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

// ========== INLINE HIGHLIGHTS ==========
const inlineHighlightSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  fileId: { type: mongoose.Schema.Types.ObjectId, required: false },
  text: { type: String, required: true },
  color: { type: String, required: true },
  startIndex: { type: Number, required: true },
  endIndex: { type: Number, required: true },
}, { _id: true });

// ========== MEMOS (NEW SCHEMA) ==========
const memoSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  fileId: { type: mongoose.Schema.Types.ObjectId, required: false },
  text: { type: String, required: true }, // The text that the memo is attached to
  title: { type: String, required: false }, // Optional title for the memo
  content: { type: String, required: true }, // The actual memo text
  author: { type: String, required: true }, // User's name who created the memo
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // User's ID
  startIndex: { type: Number, required: true },
  endIndex: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now } // ADD THIS LINE for explicit tracking
}, { _id: true });

// ========== MAIN PROJECT SCHEMA ==========
const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  data: { type: Object, default: {} },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  importedFiles: [importedFileSchema],
  codeDefinitions: [codeDefinitionSchema],
  codedSegments: [codedSegmentSchema],
  inlineHighlights: [inlineHighlightSchema],
  memos: [memoSchema], // NEW: Add memos array
}, { timestamps: true });

const Project = mongoose.model('Project', projectSchema);

export default Project;