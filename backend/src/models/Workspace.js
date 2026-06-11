const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Workspace name is required'],
      trim: true,
      maxlength: [120, 'Workspace name cannot exceed 120 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Workspace description cannot exceed 1000 characters'],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    visibility: {
      type: String,
      enum: ['private', 'team', 'public'],
      default: 'private',
      index: true,
    },
    plan: {
      type: String,
      enum: ['free', 'pro', 'team'],
      default: 'free',
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

workspaceSchema.index({ owner: 1, createdAt: -1 });
workspaceSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Workspace', workspaceSchema);
