const mongoose = require('mongoose');

/**
 * AnalysisRun — one corpus snapshot for a seed keyword / time range.
 * Hybrid flow: ingest papers → aggregate trends → materialize Topic evidence.
 */

const yearlyPointSchema = new mongoose.Schema(
  {
    year: Number,
    count: Number,
    growthRate: Number,
  },
  { _id: false }
);

const analysisRunSchema = new mongoose.Schema(
  {
    seedKeyword: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    source: {
      type: String,
      enum: ['openalex', 'semantic_scholar', 'crossref'],
      default: 'openalex',
    },
    startYear: { type: Number, required: true },
    endYear: { type: Number, required: true },

    status: {
      type: String,
      enum: ['pending', 'ingesting', 'analyzing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },

    maxPages: { type: Number, default: 4 },
    perPage: { type: Number, default: 25 },

    papersAdded: { type: Number, default: 0 },
    papersSkipped: { type: Number, default: 0 },
    paperCount: { type: Number, default: 0 },

    yearlyData: [yearlyPointSchema],
    averageGrowthRate: { type: Number, default: 0 },
    trendStatus: {
      type: String,
      enum: ['exploding', 'growing', 'stable', 'declining'],
      default: 'stable',
    },
    emergenceScore: { type: Number, default: 0 },
    isEmerging: { type: Boolean, default: false },

    topicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic',
      default: null,
    },
    keywordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Keyword',
      default: null,
    },
    syncLogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SyncLog',
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    errorMessage: String,
    startedAt: Date,
    completedAt: Date,
  },
  { timestamps: true }
);

analysisRunSchema.index({ seedKeyword: 1, startYear: 1, endYear: 1, source: 1 });
analysisRunSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('AnalysisRun', analysisRunSchema);
