import mongoose from 'mongoose';

// ========== CODE DEFINITIONS ==========
const codeDefinitionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  color: { type: String, default: '#FFA500' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: true }); // keep _id so frontend can update/delete codes

// ========== IMPORTED FILES ==========
const importedFileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  content: { type: String, required: true },
  codeDefinitions: [codeDefinitionSchema],
}, { _id: true }); // each file has _id

// ========== CODED SEGMENTS ==========
const codedSegmentSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  fileId: { type: mongoose.Schema.Types.ObjectId, required: false }, // File this segment belongs to
  text: { type: String, required: true },
  codeDefinition: {
    _id: { type: mongoose.Schema.Types.ObjectId, required: true }, // ID of the embedded codeDefinition
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

// ========== MAIN PROJECT SCHEMA ==========
const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  data: { type: Object, default: {} }, // optional general metadata
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  importedFiles: [importedFileSchema],
  codedSegments: [codedSegmentSchema],
  inlineHighlights: [inlineHighlightSchema],
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('Project', projectSchema);
