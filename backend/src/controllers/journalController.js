const Journal = require('../models/Journal');

// @desc    Create a new journal
// @route   POST /api/v1/journals
// @access  Private
exports.createJournal = async (req, res, next) => {
  try {
    const journal = await Journal.create(req.body);
    res.status(201).json({
      success: true,
      data: journal,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all journals
// @route   GET /api/v1/journals
// @access  Public
exports.getJournals = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, fieldDomain } = req.query;
    const query = {};

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }
    
    if (fieldDomain) {
      query.fieldDomain = fieldDomain;
    }

    const journals = await Journal.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ impactFactor: -1, title: 1 });

    const total = await Journal.countDocuments(query);

    res.status(200).json({
      success: true,
      count: journals.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      data: journals,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single journal
// @route   GET /api/v1/journals/:id
// @access  Public
exports.getJournal = async (req, res, next) => {
  try {
    const journal = await Journal.findById(req.params.id);

    if (!journal) {
      return res.status(404).json({
        success: false,
        message: 'Journal not found',
      });
    }

    res.status(200).json({
      success: true,
      data: journal,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update journal
// @route   PUT /api/v1/journals/:id
// @access  Private
exports.updateJournal = async (req, res, next) => {
  try {
    const journal = await Journal.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!journal) {
      return res.status(404).json({
        success: false,
        message: 'Journal not found',
      });
    }

    res.status(200).json({
      success: true,
      data: journal,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete journal
// @route   DELETE /api/v1/journals/:id
// @access  Private
exports.deleteJournal = async (req, res, next) => {
  try {
    const journal = await Journal.findByIdAndDelete(req.params.id);

    if (!journal) {
      return res.status(404).json({
        success: false,
        message: 'Journal not found',
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
