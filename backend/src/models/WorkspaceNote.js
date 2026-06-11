const mongoose = require('mongoose');

const workspaceNoteSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    paperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Paper',
      default: null,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: [160, 'Note title cannot exceed 160 characters'],
    },
    content: {
      type: String,
      required: [true, 'Note content is required'],
      trim: true,
      maxlength: [8000, 'Note content cannot exceed 8000 characters'],
    },
    tags: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
  },
  { timestamps: true }
);

workspaceNoteSchema.index({ workspaceId: 1, createdAt: -1 });
workspaceNoteSchema.index({ title: 'text', content: 'text', tags: 'text' });

module.exports = mongoose.model('WorkspaceNote', workspaceNoteSchema);
