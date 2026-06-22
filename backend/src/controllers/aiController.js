const aiService = require('../services/aiService');

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildFallbackResearchDirections = body => {
  const keywords = Array.from(
    new Set((body.keywords || []).map(keyword => String(keyword || '').trim()).filter(Boolean))
  );
  const trendContext = body.trendContext || {};
  const status = String(trendContext.trendStatus || '').toLowerCase();
  const statusScore = {
    exploding: 0.92,
    growing: 0.78,
    stable: 0.52,
    declining: 0.28,
  }[status] || 0.5;
  const averageGrowthRate = toNumber(trendContext.averageGrowthRate, 0);
  const growthScore = clamp((averageGrowthRate + 20) / 100);
  const basePriority = clamp((statusScore * 0.6) + (growthScore * 0.4), 0.08, 0.95);

  const directions = keywords.slice(0, 10).map((keyword, index) => {
    const words = keyword.split(/\s+/).filter(Boolean);
    const specificity = clamp(0.35 + words.length * 0.12, 0.35, 0.85);
    const priority = clamp(basePriority * 0.78 + specificity * 0.22 - index * 0.015, 0.05, 0.95);
    return {
      direction: keyword.charAt(0).toUpperCase() + keyword.slice(1),
      keywords: [keyword],
      rationale: `Fallback direction from current ${status || 'tracked'} trend context and keyword signal.`,
      confidence: Number((0.45 + specificity * 0.35).toFixed(4)),
      priority: Number(priority.toFixed(4)),
      source: 'backend_fallback',
      signals: {
        trend: Number(basePriority.toFixed(4)),
        specificity: Number(specificity.toFixed(4)),
      },
    };
  });

  return {
    success: true,
    message: 'AI service unavailable; returned backend fallback research directions',
    fallback: true,
    directions,
  };
};

const getHealth = async (req, res, next) => {
  try {
    const result = await aiService.getHealth();
    res.status(200).json(result);
  } catch (error) {
    // Return a graceful response when AI service is unavailable
    res.status(200).json({
      success: true,
      status: 'unavailable',
      service: 'AI Service',
      message: 'AI service is not running. Please start the AI service on port 8000.',
      error: error.message,
    });
  }
};

const embedText = async (req, res, next) => {
  try {
    const result = await aiService.proxyRequest('/api/v1/embeddings/embed', req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const embedBatch = async (req, res, next) => {
  try {
    const result = await aiService.proxyRequest('/api/v1/embeddings/embed-batch', req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const computeSimilarity = async (req, res, next) => {
  try {
    const result = await aiService.proxyRequest('/api/v1/embeddings/similarity', req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const recommendPapers = async (req, res, next) => {
  try {
    const result = await aiService.proxyRequest('/api/v1/recommendations/papers', req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const recommendResearchDirections = async (req, res, next) => {
  try {
    const result = await aiService.proxyRequest('/api/v1/recommendations/research-directions', req.body, 'post');
    res.status(200).json(result);
  } catch (error) {
    console.warn(`[AI fallback] research-directions: ${error.message}`);
    res.status(200).json(buildFallbackResearchDirections(req.body || {}));
  }
};

const summarizeAbstract = async (req, res, next) => {
  try {
    const result = await aiService.proxyRequest('/api/v1/summarization/abstract', req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const extractProblem = async (req, res, next) => {
  try {
    const result = await aiService.proxyRequest('/api/v1/summarization/extract-problem', req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHealth,
  embedText,
  embedBatch,
  computeSimilarity,
  recommendPapers,
  recommendResearchDirections,
  summarizeAbstract,
  extractProblem,
};
