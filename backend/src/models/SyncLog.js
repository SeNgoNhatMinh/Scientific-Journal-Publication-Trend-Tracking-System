const mongoose = require('mongoose');

const syncLogSchema = new mongoose.Schema(
  {
    apiSource: {
      type: String,
      enum: ['openalex', 'semantic_scholar', 'crossref'],
      required: true,
    },
    analysisRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AnalysisRun',
      default: null,
      index: true,
    },
    seedKeyword: { type: String, default: null },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date, default: null },
    papersAdded: { type: Number, default: 0 },
    papersSkipped: { type: Number, default: 0 },
    papersUpdated: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['running', 'success', 'failed', 'partial'],
      default: 'running',
      index: true,
    },
    errorMessage: { type: String, default: null },
  },
  { timestamps: true }
);

syncLogSchema.index({ apiSource: 1, startedAt: -1 });
syncLogSchema.index({ startedAt: 1 }, { expireAfterSeconds: 15552000 });

module.exports = mongoose.model('SyncLog', syncLogSchema);
