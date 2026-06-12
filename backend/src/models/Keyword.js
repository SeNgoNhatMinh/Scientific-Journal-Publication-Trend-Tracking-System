const mongoose = require('mongoose');

/**
 * Keyword Model
 * Stores research keywords and their semantic relationships
 */

const keywordSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    normalizedText: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    openalexId: { type: String, default: null },
    worksCount: { type: Number, default: null },
    description: String,
    
    // Semantic Information
    embedding: [Number], // Vector representation for similarity
    
    // Relationship to Topics
    topic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic',
    },
    
    // Semantic Deduplication
    canonicalKeyword: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Keyword',
      default: null,
    },
    aliases: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Keyword',
    }],
    aliasTexts: [{
      type: String,
      lowercase: true,
      trim: true,
    }],

    // Classification for trend analysis dashboards
    category: {
      type: String,
      enum: ['domain', 'algorithm', 'application', 'method', 'dataset', 'tool', 'general'],
      default: 'general',
      index: true,
    },
    classificationConfidence: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
    classifiedBy: {
      type: String,
      enum: ['rule', 'manual', 'ai', 'unknown'],
      default: 'unknown',
    },
    lastClassifiedAt: {
      type: Date,
      default: null,
    },
    
    // Usage Metrics
    paperCount: {
      type: Number,
      default: 0,
    },
    citationCount: {
      type: Number,
      default: 0,
    },
    
    // Trend Data
    yearlyUsage: [{
      year: Number,
      count: Number,
    }],
    
    trendScore: {
      type: Number,
      default: 0,
    },
    
    growthRate: {
      type: Number,
      default: 0,
    },
    
    source: String, // Where keyword came from
    lastUpdatedAt: Date,
  },
  { timestamps: true }
);

keywordSchema.index(
  { openalexId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      openalexId: { $type: 'string' },
    },
  }
);

keywordSchema.pre('validate', function (next) {
  if (!this.normalizedText && this.name) {
    this.normalizedText = String(this.name).trim().toLowerCase().replace(/\s+/g, ' ');
  }
  next();
});

module.exports = mongoose.model('Keyword', keywordSchema);
