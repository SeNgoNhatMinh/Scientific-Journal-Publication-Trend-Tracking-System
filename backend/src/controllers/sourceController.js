const academicApiService = require('../services/academicApiService');

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
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      year: year ? parseInt(year, 10) : null,
    });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

const getTrendData = async (req, res, next) => {
  try {
    const { source = 'openalex', keyword, startYear = 2010 } = req.query;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: 'Keyword is required',
      });
    }

    const result = await academicApiService.getTrendData(source, keyword, parseInt(startYear, 10));

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

const getJournalInfo = async (req, res, next) => {
  try {
    const { source = 'openalex', query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query is required',
      });
    }

    const result = await academicApiService.getJournalInfo(source, query);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

const getAuthorInfo = async (req, res, next) => {
  try {
    const { source = 'openalex', query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query is required',
      });
    }

    const result = await academicApiService.getAuthorInfo(source, query);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchPapers,
  getTrendData,
  getJournalInfo,
  getAuthorInfo,
};