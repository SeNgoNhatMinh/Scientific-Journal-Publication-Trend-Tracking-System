const aiService = require('../services/aiService');

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
    next(error);
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