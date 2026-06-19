const Author = require('../models/Author');

// @desc    Create a new author
// @route   POST /api/v1/authors
// @access  Private
exports.createAuthor = async (req, res, next) => {
  try {
    const author = await Author.create(req.body);
    res.status(201).json({
      success: true,
      data: author,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all authors
// @route   GET /api/v1/authors
// @access  Public
exports.getAuthors = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const query = {};

    if (search) {
      query.$text = { $search: search };
    }

    const authors = await Author.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ worksCount: -1 });

    const total = await Author.countDocuments(query);

    res.status(200).json({
      success: true,
      count: authors.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      data: authors,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single author
// @route   GET /api/v1/authors/:id
// @access  Public
exports.getAuthor = async (req, res, next) => {
  try {
    const author = await Author.findById(req.params.id);

    if (!author) {
      return res.status(404).json({
        success: false,
        message: 'Author not found',
      });
    }

    res.status(200).json({
      success: true,
      data: author,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update author
// @route   PUT /api/v1/authors/:id
// @access  Private
exports.updateAuthor = async (req, res, next) => {
  try {
    const author = await Author.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!author) {
      return res.status(404).json({
        success: false,
        message: 'Author not found',
      });
    }

    res.status(200).json({
      success: true,
      data: author,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete author
// @route   DELETE /api/v1/authors/:id
// @access  Private
exports.deleteAuthor = async (req, res, next) => {
  try {
    const author = await Author.findByIdAndDelete(req.params.id);

    if (!author) {
      return res.status(404).json({
        success: false,
        message: 'Author not found',
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
