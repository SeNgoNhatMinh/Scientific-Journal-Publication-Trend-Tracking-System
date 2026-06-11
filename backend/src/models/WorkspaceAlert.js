const mongoose = require('mongoose');

const workspaceAlertSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    keyword: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['newPaper', 'trendSpike', 'keyword'],
      default: 'keyword',
    },
    notifyEnabled: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

workspaceAlertSchema.index({ workspaceId: 1, keyword: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('WorkspaceAlert', workspaceAlertSchema);
