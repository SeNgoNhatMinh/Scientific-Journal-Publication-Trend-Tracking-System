const Topic = require('../models/Topic');

// @desc    Create a new topic
// @route   POST /api/v1/topics
// @access  Private
exports.createTopic = async (req, res, next) => {
  try {
    const topic = await Topic.create(req.body);
    res.status(201).json({
      success: true,
      data: topic,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all topics
// @route   GET /api/v1/topics
// @access  Public
exports.getTopics = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const query = {};

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const topics = await Topic.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ paperCount: -1 });

    const total = await Topic.countDocuments(query);

    res.status(200).json({
      success: true,
      count: topics.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      data: topics,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single topic
// @route   GET /api/v1/topics/:id
// @access  Public
exports.getTopic = async (req, res, next) => {
  try {
    const topic = await Topic.findById(req.params.id);

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    res.status(200).json({
      success: true,
      data: topic,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update topic
// @route   PUT /api/v1/topics/:id
// @access  Private
exports.updateTopic = async (req, res, next) => {
  try {
    const topic = await Topic.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    res.status(200).json({
      success: true,
      data: topic,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete topic
// @route   DELETE /api/v1/topics/:id
// @access  Private
exports.deleteTopic = async (req, res, next) => {
  try {
    const topic = await Topic.findByIdAndDelete(req.params.id);

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
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
