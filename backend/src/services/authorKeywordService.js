const Author = require('../models/Author');
const Keyword = require('../models/Keyword');

const normalizeKeywordText = text =>
  String(text || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const upsertKeyword = async (text, source = 'openalex') => {
  const normalizedText = normalizeKeywordText(text);
  if (!normalizedText) return null;

  let keyword = await Keyword.findOne({ normalizedText });
  if (!keyword) {
    keyword = await Keyword.create({
      name: normalizedText,
      normalizedText,
      source,
      lastUpdatedAt: new Date(),
    });
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
  for (const text of keywordTexts || []) {
    const kw = await upsertKeyword(text);
    if (kw) keywordIds.push(kw._id);
  }
  return keywordIds;
};

module.exports = {
  normalizeKeywordText,
  upsertKeyword,
  upsertAuthors,
  linkPaperKeywords,
};
