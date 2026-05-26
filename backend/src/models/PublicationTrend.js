const mongoose = require('mongoose');

const publicationTrendSchema = new mongoose.Schema(
  {
    keywordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Keyword',
      required: true,
      index: true,
    },
    keywordText: { type: String, required: true },
    journalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Journal',
      default: null,
    },
    analysisRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AnalysisRun',
      default: null,
    },
    year: { type: Number, required: true },
    month: { type: Number, default: null },
    paperCount: { type: Number, required: true },
    previousCount: { type: Number, default: null },
    growthRate: { type: Number, default: null },
    isTrending: { type: Boolean, default: false, index: true },
    calculatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

publicationTrendSchema.index(
  { keywordId: 1, journalId: 1, year: 1, month: 1 },
  { unique: true }
);
publicationTrendSchema.index({ growthRate: -1 });

module.exports = mongoose.model('PublicationTrend', publicationTrendSchema);
