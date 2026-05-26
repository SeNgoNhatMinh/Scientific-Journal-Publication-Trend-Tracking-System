const mongoose = require('mongoose');

/**
 * Journal Model
 * Stores academic journal information
 */

const journalSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      index: true,
    },
    issn: {
      type: String,
      sparse: true,
      unique: true,
    },
    eissn: {
      type: String,
      sparse: true,
    },
    externalIds: {
      openalex: String,
      crossref: String,
    },
    description: String,
    category: [String], // e.g., ['Computer Science', 'AI']
    publisher: String,
    websiteUrl: String,
    impactFactor: Number,
    h5Index: Number,
    paperCount: {
      type: Number,
      default: 0,
    },
    fieldDomain: { type: String, default: null },
    isTracked: { type: Boolean, default: false, index: true },
    source: {
      type: String,
      enum: ['openalex', 'crossref', 'semantic_scholar'],
    },
    lastSyncedAt: Date,
  },
  { timestamps: true }
);

journalSchema.index({ fieldDomain: 1 });

module.exports = mongoose.model('Journal', journalSchema);
