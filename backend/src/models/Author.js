const mongoose = require('mongoose');

const authorSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    externalAuthorId: { type: String, default: null },
    affiliation: { type: String, default: null },
    openalexId: { type: String, sparse: true, unique: true },
    orcid: { type: String, default: null },
    worksCount: { type: Number, default: null },
  },
  { timestamps: true }
);

authorSchema.index({ fullName: 'text' });

module.exports = mongoose.model('Author', authorSchema);
