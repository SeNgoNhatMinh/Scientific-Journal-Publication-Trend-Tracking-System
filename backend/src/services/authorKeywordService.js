const Author = require('../models/Author');
const Keyword = require('../models/Keyword');
const keywordClassificationService = require('./keywordClassificationService');

const normalizeKeywordText = text =>
  String(text || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const upsertKeyword = async (text, source = 'openalex') => {
  const normalizedText = normalizeKeywordText(text);
  if (!normalizedText) return null;

  const classification = keywordClassificationService.classifyKeyword(normalizedText);
  let keyword = await Keyword.findOne({ normalizedText });
  if (!keyword) {
    keyword = await Keyword.create({
      name: normalizedText,
      normalizedText,
      source,
      category: classification.category,
      classificationConfidence: classification.confidence,
      classifiedBy: classification.classifiedBy,
      lastClassifiedAt: new Date(),
      lastUpdatedAt: new Date(),
    });
  } else if (
    keyword.classifiedBy === 'unknown' ||
    !keyword.lastClassifiedAt ||
    keyword.category === 'general'
  ) {
    keyword.category = classification.category;
    keyword.classificationConfidence = classification.confidence;
    keyword.classifiedBy = classification.classifiedBy;
    keyword.lastClassifiedAt = new Date();
    keyword.lastUpdatedAt = new Date();
    await keyword.save();
  }
  return keyword;
};

const upsertAuthors = async authorEntries => {
  const ids = [];
  for (let i = 0; i < (authorEntries || []).length; i += 1) {
    const entry = authorEntries[i];
    const fullName = entry?.name?.trim();
    if (!fullName) continue;

    const openalexId = entry.externalId
      ? entry.externalId.replace('https://openalex.org/', '')
      : null;

    let author = null;
    if (openalexId) {
      author = await Author.findOneAndUpdate(
        { openalexId },
        {
          fullName,
          openalexId,
          affiliation: entry.affiliations?.[0] || null,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } else {
      author = await Author.findOneAndUpdate(
        { fullName },
        { fullName, affiliation: entry.affiliations?.[0] || null },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    ids.push({
      authorId: author._id,
      name: fullName,
      affiliations: entry.affiliations || [],
      externalId: entry.externalId,
      order: i + 1,
    });
  }
  return ids;
};

const linkPaperKeywords = async keywordTexts => {
  const keywordIds = [];
  const seen = new Set();
  for (const text of keywordTexts || []) {
    const normalizedText = normalizeKeywordText(text);
    if (!normalizedText || seen.has(normalizedText)) continue;
    seen.add(normalizedText);

    const kw = await upsertKeyword(text);
    if (kw) {
      await Keyword.findByIdAndUpdate(kw._id, {
        $inc: { paperCount: 1 },
        $set: { lastUpdatedAt: new Date() },
      });
      keywordIds.push(kw._id);
    }
  }
  return keywordIds;
};

const classifyExistingKeywords = async (limit = 1000) => {
  const keywords = await Keyword.find({
    $or: [
      { category: { $exists: false } },
      { classifiedBy: { $exists: false } },
      { classifiedBy: 'unknown' },
      { lastClassifiedAt: null },
    ],
  })
    .limit(limit)
    .select('name normalizedText category classifiedBy lastClassifiedAt');

  for (const keyword of keywords) {
    const classification = keywordClassificationService.classifyKeyword(
      keyword.normalizedText || keyword.name
    );
    keyword.category = classification.category;
    keyword.classificationConfidence = classification.confidence;
    keyword.classifiedBy = classification.classifiedBy;
    keyword.lastClassifiedAt = new Date();
    keyword.lastUpdatedAt = new Date();
    await keyword.save();
  }

  return keywords.length;
};

module.exports = {
  normalizeKeywordText,
  upsertKeyword,
  upsertAuthors,
  linkPaperKeywords,
  classifyExistingKeywords,
};
