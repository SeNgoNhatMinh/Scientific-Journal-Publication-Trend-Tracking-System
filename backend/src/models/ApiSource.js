const mongoose = require('mongoose');

const apiSourceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      enum: ['openalex', 'semantic_scholar', 'crossref', 'ieee', 'exa'],
      required: true,
      unique: true,
    },
    baseUrl: { type: String, required: true },
    apiKeyHash: { type: String, default: null },
    fieldScope: [{ type: String }],
    syncFrequency: {
      type: String,
      enum: ['daily', 'weekly'],
      default: 'weekly',
    },
    trendingThreshold: { type: Number, default: 20 },
    minPaperCount: { type: Number, default: 10 },
    isActive: { type: Boolean, default: true },
    lastSyncedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ApiSource', apiSourceSchema);
