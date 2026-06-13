const mongoose = require('mongoose');
const Paper = require('../models/Paper');
const User = require('../models/User');
const authMiddleware = require('../middlewares/auth');
const paperPdfService = require('../services/paperPdfService');

/**
 * Paper Search Controller
 * Handles paper search, filtering, and retrieval
 */

const buildLocalSourceFilter = source => {
  const value = String(source || '').toLowerCase().replace(/[_-]/g, '');

  if (value === 'openalex') return ['openalex', 'OpenAlex'];
  if (value === 'semanticscholar' || value === 'semantic') {
    return ['semanticscholar', 'semantic_scholar', 'SemanticScholar'];
  }
  if (value === 'crossref') return ['crossref', 'Crossref'];
  if (value === 'ieee' || value === 'ieeexplore') return ['ieee', 'IEEE'];
  if (value === 'exa') return ['exa', 'Exa'];

  return [source];
};

// Search papers saved in the local MongoDB database
const searchPapers = async (req, res, next) => {
  try {
    const {
      keyword,
      page = 1,
      limit = 20,
      year,
      source,
      analysisRunId,
      sortBy = 'relevance',
    } = req.query;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: 'Keyword is required',
      });
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const filter = {
      $text: { $search: keyword.trim() },
    };

    if (year) {
      filter.publicationYear = parseInt(year, 10);
    }

    if (source) {
      filter.source = { $in: buildLocalSourceFilter(source) };
    }

    if (analysisRunId) {
      if (!mongoose.Types.ObjectId.isValid(analysisRunId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid analysisRunId',
        });
      }
      filter.analysisRunId = analysisRunId;
    }

    const sortOptions = {
      relevance: { score: { $meta: 'textScore' }, citationCount: -1 },
      citations: { citationCount: -1, publishedDate: -1 },
      newest: { publishedDate: -1, publicationYear: -1 },
      oldest: { publishedDate: 1, publicationYear: 1 },
    };

    const sort = sortOptions[sortBy] || sortOptions.relevance;

    const [papers, total] = await Promise.all([
      Paper.find(filter, { score: { $meta: 'textScore' } })
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .populate('journal', 'title issn publisher')
        .select(
          'title abstract doi publishedDate publicationYear authors journal journalName citationCount openAccessUrl keywords source url pdfUrl analysisRunId createdAt'
        ),
      Paper.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      source: 'local_database',
      query: {
        keyword,
        year: year ? parseInt(year, 10) : null,
        source: source || null,
        analysisRunId: analysisRunId || null,
        sortBy,
      },
      total,
      papers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get paper details
const getPaperDetails = async (req, res, next) => {
  try {
    const { paperId } = req.params;

    // Fallback: legacy deployments matched /:paperId before /bookmarks
    if (paperId === 'bookmarks') {
      return authMiddleware.protect(req, res, () => getUserBookmarks(req, res, next));
    }

    if (!mongoose.Types.ObjectId.isValid(paperId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid paper ID',
      });
    }

    const paper = await Paper.findById(paperId)
      .populate('journal')
      .populate('topics');

    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Paper not found',
      });
    }

    // Increment view count
    paper.viewCount += 1;
    await paper.save();

    res.status(200).json({
      success: true,
      paper,
    });
  } catch (error) {
    next(error);
  }
};

// Save paper to database
const normalizeSource = source => {
  const value = String(source || '').toLowerCase().replace(/[-\s]/g, '_');
  if (value === 'semanticscholar') return 'semantic_scholar';
  return value;
};

const cleanDoi = doi => {
  const value = String(doi || '').trim();
  if (!value) return undefined;
  return value.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').trim() || undefined;
};

const buildPaperLookupQuery = paper => {
  const or = [];
  if (paper?.doi) or.push({ doi: paper.doi });

  for (const [source, externalId] of Object.entries(paper?.externalIds || {})) {
    if (externalId) or.push({ [`externalIds.${source}`]: externalId });
  }

  if (paper?.title && paper?.source) {
    or.push({ title: paper.title, source: paper.source });
  }

  return or.length ? { $or: or } : null;
};

const sanitizePaperInput = paper => ({
  ...paper,
  title: String(paper.title || '').trim(),
  abstract: paper.abstract ? String(paper.abstract).slice(0, 5000) : undefined,
  source: normalizeSource(paper.source),
  doi: cleanDoi(paper.doi),
  url: paper.url || undefined,
  journalName: paper.journalName || undefined,
  externalIds: Object.fromEntries(
    Object.entries(paper.externalIds || {}).filter(([, value]) => Boolean(value))
  ),
});

const savePaper = async (req, res, next) => {
  let paper = null;
  try {
    paper = req.body.paper ? sanitizePaperInput(req.body.paper) : null;

    if (!paper) {
      return res.status(400).json({
        success: false,
        message: 'Paper data is required',
      });
    }

    if (!paper.title) {
      return res.status(400).json({
        success: false,
        message: 'paper.title is required',
      });
    }

    if (!paper.source) {
      return res.status(400).json({
        success: false,
        message: 'paper.source is required (openalex, semantic_scholar, crossref, ieee, or exa)',
      });
    }

    const lookupQuery = buildPaperLookupQuery(paper);
    const existingPaper = lookupQuery ? await Paper.findOne(lookupQuery) : null;
    if (existingPaper) {
      return res.status(200).json({
        success: true,
        message: 'Paper already exists in database',
        paper: existingPaper,
      });
    }

    const newPaper = await Paper.create(paper);

    res.status(201).json({
      success: true,
      message: 'Paper saved successfully',
      paper: newPaper,
    });
  } catch (error) {
    if (error.code === 11000) {
      try {
        const query = buildPaperLookupQuery(paper);
        const existingPaper = query ? await Paper.findOne(query) : null;
        return res.status(200).json({
          success: true,
          message: 'Paper already exists in database',
          paper: existingPaper || undefined,
        });
      } catch (findErr) {
        console.error('Failed to find existing paper on duplicate error:', findErr);
      }

      return res.status(409).json({
        success: false,
        message: 'Paper already exists in database',
      });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

// Bookmark a paper
const bookmarkPaper = async (req, res, next) => {
  try {
    const { paperId } = req.params;
    const userId = req.user.id;

    // Find paper and add to user's bookmarks
    const paper = await Paper.findByIdAndUpdate(
      paperId,
      { $addToSet: { bookmarkedBy: userId } },
      { new: true }
    );

    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Paper not found',
      });
    }

    // Add to user's bookmarks
    const user = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { bookmarks: paperId } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Paper bookmarked successfully',
      paper,
    });
  } catch (error) {
    next(error);
  }
};

// Get user bookmarks
const getUserBookmarks = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const papers = await Paper.find({ bookmarkedBy: userId })
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Paper.countDocuments({ bookmarkedBy: userId });

    res.status(200).json({
      success: true,
      total,
      papers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

const uploadPaperPdf = async (req, res, next) => {
  try {
    const { paperId } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(paperId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid paper ID',
      });
    }

    const result = await paperPdfService.uploadPaperPdf({
      paperId,
      userId,
      file: req.file,
    });

    res.status(200).json({
      success: true,
      message: 'PDF uploaded successfully',
      paperId: result.paper._id,
      pdfUrl: result.pdfUrl,
      uploadedPdf: result.uploadedPdf,
      fullTextExtracted: result.fullTextExtracted,
      fullTextLength: result.fullTextLength,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchPapers,
  getPaperDetails,
  savePaper,
  bookmarkPaper,
  getUserBookmarks,
  uploadPaperPdf,
};
