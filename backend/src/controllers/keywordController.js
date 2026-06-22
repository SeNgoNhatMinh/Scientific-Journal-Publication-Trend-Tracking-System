const Keyword = require('../models/Keyword');

// @desc    Create a new keyword
// @route   POST /api/v1/keywords
// @access  Private
exports.createKeyword = async (req, res, next) => {
  try {
    const keyword = await Keyword.create(req.body);
    res.status(201).json({
      success: true,
      data: keyword,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all keywords
// @route   GET /api/v1/keywords
// @access  Public
exports.getKeywords = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, category } = req.query;
    const query = {};

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    if (category) {
      query.category = category;
    }

    const keywords = await Keyword.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ worksCount: -1 });

    const total = await Keyword.countDocuments(query);

    res.status(200).json({
      success: true,
      count: keywords.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      data: keywords,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single keyword
// @route   GET /api/v1/keywords/:id
// @access  Public
exports.getKeyword = async (req, res, next) => {
  try {
    const keyword = await Keyword.findById(req.params.id);

    if (!keyword) {
      return res.status(404).json({
        success: false,
        message: 'Keyword not found',
      });
    }

    res.status(200).json({
      success: true,
      data: keyword,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update keyword
// @route   PUT /api/v1/keywords/:id
// @access  Private
exports.updateKeyword = async (req, res, next) => {
  try {
    const keyword = await Keyword.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!keyword) {
      return res.status(404).json({
        success: false,
        message: 'Keyword not found',
      });
    }

    res.status(200).json({
      success: true,
      data: keyword,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete keyword
// @route   DELETE /api/v1/keywords/:id
// @access  Private
exports.deleteKeyword = async (req, res, next) => {
  try {
    const keyword = await Keyword.findByIdAndDelete(req.params.id);

    if (!keyword) {
      return res.status(404).json({
        success: false,
        message: 'Keyword not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};
