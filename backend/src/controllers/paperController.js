const mongoose = require('mongoose');
const Paper = require('../models/Paper');
const User = require('../models/User');
const academicApiService = require('../services/academicApiService');
const authMiddleware = require('../middlewares/auth');

/**
 * Paper Search Controller
 * Handles paper search, filtering, and retrieval
 */

// Search papers from OpenAlex
const searchPapers = async (req, res, next) => {
  try {
    const { source = 'openalex', keyword, page = 1, limit = 20, year } = req.query;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: 'Keyword is required',
      });
    }

    const result = await academicApiService.searchPapers(source, keyword, {
      page: parseInt(page),
      limit: parseInt(limit),
      year: year ? parseInt(year) : null,
    });

    res.status(200).json({
      success: true,
      ...result,
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
const savePaper = async (req, res, next) => {
  try {
    const { paper } = req.body;

    if (!paper) {
      return res.status(400).json({
        success: false,
        message: 'Paper data is required',
      });
    }

    // Check if paper already exists
    const existingPaper = paper.externalIds?.openalex
      ? await Paper.findOne({
          'externalIds.openalex': paper.externalIds.openalex,
        })
      : null;

    if (existingPaper) {
      return res.status(409).json({
        success: false,
        message: 'Paper already exists in database',
        paper: existingPaper,
      });
    }

    if (!paper.source) {
      return res.status(400).json({
        success: false,
        message: 'paper.source is required (openalex, semantic_scholar, or crossref)',
      });
    }

    const newPaper = new Paper(paper);
    await newPaper.save();

    res.status(201).json({
      success: true,
      message: 'Paper saved successfully',
      paper: newPaper,
    });
  } catch (error) {
    if (error.code === 11000) {
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

module.exports = {
  searchPapers,
  getPaperDetails,
  savePaper,
  bookmarkPaper,
  getUserBookmarks,
};
