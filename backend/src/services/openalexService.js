const axios = require('axios');
const envConfig = require('../config/env');
const Paper = require('../models/Paper');
const Journal = require('../models/Journal');

/**
 * OpenAlex API Service
 * Fetches academic papers and metadata from OpenAlex
 * Free, comprehensive, and no API key required
 * 
 * Documentation: https://docs.openalex.org/
 * 
 * Why OpenAlex:
 * - Comprehensive coverage of scholarly metadata
 * - Free to use, no authentication required
 * - Structured API responses
 * - Includes author, journal, and citation data
 */

const openalexClient = axios.create({
  baseURL: envConfig.OPENALEX_API_URL,
  timeout: envConfig.EXTERNAL_API_TIMEOUT_MS,
  headers: {
    'User-Agent': `journal-trend-backend (mailto:${envConfig.OPENALEX_MAILTO})`,
  },
});

const withOpenAlexParams = params => ({
  ...params,
  mailto: envConfig.OPENALEX_MAILTO,
});

/**
 * Search papers by keyword
 * Returns paginated results with full metadata
 */
const searchPapers = async (keyword, options = {}) => {
  try {
    const {
      page = 1,
      perPage = 25,
      year = null,
      sortBy = 'cited_by_count',
    } = options;

    let query = `"${keyword}"`;

    // Add year filter if specified
    if (year) {
      query += ` publication_year:${year}`;
    }

    const response = await openalexClient.get('/works', {
      params: {
        search: query,
        page,
        per_page: perPage,
        sort: sortBy,
      },
    });

    return {
      success: true,
      total: response.data.meta.count,
      papers: response.data.results.map(formatPaperData),
    };
  } catch (error) {
    console.error('OpenAlex search error:', error.message);
    throw new Error(`Failed to search OpenAlex: ${error.message}`);
  }
};

/**
 * Get papers by author
 */
const getAuthorPapers = async (authorId, options = {}) => {
  try {
    const { page = 1, perPage = 25 } = options;

    const response = await openalexClient.get(`/authors/${authorId}/works`, {
      params: {
        page,
        per_page: perPage,
        sort: '-publication_year',
      },
    });

    return {
      success: true,
      total: response.data.meta.count,
      papers: response.data.results.map(formatPaperData),
    };
  } catch (error) {
    console.error('OpenAlex author papers error:', error.message);
    throw new Error(`Failed to fetch author papers: ${error.message}`);
  }
};

/**
 * Get papers by journal
 */
const getJournalPapers = async (journalId, options = {}) => {
  try {
    const { page = 1, perPage = 25 } = options;

    const response = await openalexClient.get(`/venues/${journalId}/works`, {
      params: {
        page,
        per_page: perPage,
        sort: '-publication_year',
      },
    });

    return {
      success: true,
      total: response.data.meta.count,
      papers: response.data.results.map(formatPaperData),
    };
  } catch (error) {
    console.error('OpenAlex journal papers error:', error.message);
    throw new Error(`Failed to fetch journal papers: ${error.message}`);
  }
};

/**
 * Get publication trend for a keyword
 * Aggregates papers by year to show growth trends
 */
const getTrendData = async (keyword, startYear = 2010) => {
  try {
    const currentYear = new Date().getFullYear();
    const trendData = {};

    // Initialize years
    for (let year = startYear; year <= currentYear; year++) {
      trendData[year] = 0;
    }

    // Fetch papers for each year (in batches)
    for (let year = startYear; year <= currentYear; year++) {
      const response = await openalexClient.get('/works', {
        params: {
          search: `"${keyword}"`,
          filter: `publication_year:${year}`,
          per_page: 1, // Only need count
        },
      });

      trendData[year] = response.data.meta.count;
    }

    // Calculate growth rates
    const trends = Object.entries(trendData).map(([year, count]) => ({
      year: parseInt(year),
      count,
      growthRate: trendData[year - 1]
        ? ((count - trendData[year - 1]) / trendData[year - 1]) * 100
        : 0,
    }));

    return {
      success: true,
      keyword,
      trends,
    };
  } catch (error) {
    console.error('OpenAlex trend data error:', error.message);
    throw new Error(`Failed to fetch trend data: ${error.message}`);
  }
};

/**
 * Format OpenAlex paper data to our schema
 */
const formatPaperData = (openalexPaper) => {
  return {
    title: openalexPaper.title,
    abstract: openalexPaper.abstract,
    doi: openalexPaper.doi?.replace('https://doi.org/', ''),
    publishedDate: openalexPaper.publication_date,
    publicationYear: openalexPaper.publication_year,
    externalIds: {
      openalex: openalexPaper.id,
    },
    authors: (openalexPaper.authorships || []).map(auth => ({
      name: auth.author?.display_name,
      affiliations: auth.institutions?.map(inst => inst.display_name) || [],
      externalId: auth.author?.id,
    })),
    journalName: openalexPaper.primary_location?.source?.display_name,
    citationCount: openalexPaper.cited_by_count || 0,
    url: openalexPaper.doi || openalexPaper.primary_location?.landing_page_url,
    openAccessUrl: openalexPaper.open_access?.oa_url,
    source: 'openalex',
    lastSyncedAt: new Date(),
  };
};

module.exports = {
  searchPapers,
  getAuthorPapers,
  getJournalPapers,
  getTrendData,
};
