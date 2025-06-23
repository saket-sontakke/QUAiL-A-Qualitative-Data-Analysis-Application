import mongoose from 'mongoose';

const importedFileSchema = new mongoose.Schema({
  name: String,
  content: String,
});

const ProjectSchema = new mongoose.Schema({
    name: {type: String, required: true},
    data: {type: Object, default: {}},
    owner: {type: mongoose.Schema.Types.ObjectId, ref:'User', required: true},
    createdAt: {type: Date, default: Date.now},
    importedFiles: [importedFileSchema],
}, { timestamps: true });

export default mongoose.model('Project', ProjectSchema);