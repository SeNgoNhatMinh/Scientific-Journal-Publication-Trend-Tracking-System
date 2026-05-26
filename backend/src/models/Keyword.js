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

keywordSchema.pre('validate', function (next) {
  if (!this.normalizedText && this.name) {
    this.normalizedText = String(this.name).trim().toLowerCase().replace(/\s+/g, ' ');
  }
  next();
});

module.exports = mongoose.model('Keyword', keywordSchema);
