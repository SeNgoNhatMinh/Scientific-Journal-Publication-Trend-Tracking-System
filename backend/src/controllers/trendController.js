const academicApiService = require('../services/academicApiService');
const Topic = require('../models/Topic');
const AnalysisRun = require('../models/AnalysisRun');

/**
 * Trend Analytics Controller
 * Handles publication trend analysis and insights
 */

// Get trend data for a keyword
const getTrendData = async (req, res, next) => {
  try {
    const { source = 'openalex', keyword, startYear = 2010 } = req.query;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: 'Keyword is required',
      });
    }

    const trendData = await academicApiService.getTrendData(
      source,
      keyword,
      parseInt(startYear)
    );

    // Analyze trend status
    const latestTrends = trendData.trends.slice(-5); // Last 5 years
    const avgGrowth =
      latestTrends.reduce((sum, t) => sum + t.growthRate, 0) / latestTrends.length;

    let trendStatus = 'stable';
    if (avgGrowth > 20) trendStatus = 'exploding';
    else if (avgGrowth > 10) trendStatus = 'growing';
    else if (avgGrowth < -5) trendStatus = 'declining';

    res.status(200).json({
      success: true,
      keyword,
      trendStatus,
      averageGrowthRate: avgGrowth.toFixed(2),
      ...trendData,
    });
  } catch (error) {
    next(error);
  }
};

// Compare trends for multiple keywords
const compareTrends = async (req, res, next) => {
  try {
    const { source = 'openalex', keywords, startYear = 2010 } = req.body;

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Keywords array is required',
      });
    }

    // Fetch trend data for each keyword
    const comparisons = await Promise.all(
      keywords.map(keyword =>
        academicApiService.getTrendData(source, keyword, parseInt(startYear))
      )
    );

    res.status(200).json({
      success: true,
      comparisons,
    });
  } catch (error) {
    next(error);
  }
};

// Get emerging topics (from corpus-backed Topic documents)
const getEmergingTopics = async (req, res, next) => {
  try {
    const { limit = 10, analysisRunId } = req.query;
    const filter = { isEmerging: true };
    if (analysisRunId) filter.analysisRunId = analysisRunId;

    const topics = await Topic.find(filter)
      .sort({ emergenceScore: -1 })
      .limit(parseInt(limit, 10))
      .populate('papers', 'title citationCount publicationYear');

    const runs = await AnalysisRun.find({ isEmerging: true, status: 'completed' })
      .sort({ emergenceScore: -1 })
      .limit(parseInt(limit, 10))
      .select('seedKeyword paperCount yearlyData trendStatus emergenceScore topicId');

    res.status(200).json({
      success: true,
      source: analysisRunId ? 'corpus_run' : 'all',
      topics,
      corpusRuns: runs,
    });
  } catch (error) {
    next(error);
  }
};

// Get trending topics
const getTrendingTopics = async (req, res, next) => {
  try {
    const { limit = 10, analysisRunId } = req.query;
    const filter = { trendStatus: { $in: ['exploding', 'growing'] } };
    if (analysisRunId) filter.analysisRunId = analysisRunId;

    const topics = await Topic.find(filter)
      .sort({ growthRate: -1 })
      .limit(parseInt(limit, 10))
      .populate('papers', 'title citationCount publicationYear');

    res.status(200).json({
      success: true,
      source: analysisRunId ? 'corpus_run' : 'all',
      topics,
    });
  } catch (error) {
    next(error);
  }
};

// Get topic details with yearly data
const getTopicDetails = async (req, res, next) => {
  try {
    const { topicId } = req.params;

    const topic = await Topic.findById(topicId)
      .populate('papers', 'title citationCount publishedDate')
      .populate('parentTopics', 'name')
      .populate('relatedTopics', 'name');

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    res.status(200).json({
      success: true,
      topic,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTrendData,
  compareTrends,
  getEmergingTopics,
  getTrendingTopics,
  getTopicDetails,
};
