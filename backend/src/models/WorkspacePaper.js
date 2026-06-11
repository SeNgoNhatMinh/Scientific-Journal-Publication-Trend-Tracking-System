const mongoose = require('mongoose');

const workspacePaperSchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    source: {
      type: String,
      enum: ['manual', 'bookmark', 'corpus', 'search'],
      default: 'manual',
    },
    tags: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
    note: {
      type: String,
      trim: true,
      maxlength: [2000, 'Paper note cannot exceed 2000 characters'],
    },
  },
  { timestamps: true }
);

workspacePaperSchema.index({ workspaceId: 1, paperId: 1 }, { unique: true });
workspacePaperSchema.index({ workspaceId: 1, createdAt: -1 });
workspacePaperSchema.index({ tags: 1 });

module.exports = mongoose.model('WorkspacePaper', workspacePaperSchema);
