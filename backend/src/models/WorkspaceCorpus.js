const mongoose = require('mongoose');

const workspaceCorpusSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    analysisRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AnalysisRun',
      required: true,
      index: true,
    },
    seedKeyword: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

workspaceCorpusSchema.index({ workspaceId: 1, analysisRunId: 1 }, { unique: true });
workspaceCorpusSchema.index({ workspaceId: 1, createdAt: -1 });

module.exports = mongoose.model('WorkspaceCorpus', workspaceCorpusSchema);
