const axios = require('axios');
const NodeCache = require('node-cache');
const envConfig = require('../config/env');

/** OpenAlex search có thể >60s — cache 10 phút giảm timeout cho lần gọi sau */
const searchCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

const normalizeSource = source => {
  const value = String(source || 'openalex').toLowerCase().replace(/[_-]/g, '');

  if (value === 'openalex') return 'openalex';
  if (value === 'semanticscholar' || value === 'semantic') return 'semanticscholar';
  if (value === 'crossref') return 'crossref';

  throw new Error(`Unsupported source: ${source}`);
};

const buildHeaders = source => {
  if (source !== 'semanticscholar' || !envConfig.SEMANTIC_SCHOLAR_API_KEY) {
    return {};
  }

  return {
    'x-api-key': envConfig.SEMANTIC_SCHOLAR_API_KEY,
  };
};

const apiTimeout = envConfig.EXTERNAL_API_TIMEOUT_MS;

const semanticScholarClient = axios.create({
  baseURL: envConfig.SEMANTIC_SCHOLAR_API_URL,
  timeout: apiTimeout,
});

const crossrefClient = axios.create({
  baseURL: envConfig.CROSSREF_API_URL,
  timeout: apiTimeout,
  headers: {
    'User-Agent': `journal-trend-backend (mailto:${envConfig.CROSSREF_MAILTO})`,
  },
});

const openAlexClient = axios.create({
  baseURL: envConfig.OPENALEX_API_URL,
  timeout: apiTimeout,
  headers: {
    'User-Agent': `journal-trend-backend (mailto:${envConfig.OPENALEX_MAILTO})`,
  },
});

/** OpenAlex polite pool: https://docs.openalex.org/how-to-use-the-api/rate-limits-and-authentication */
const withOpenAlexParams = params => ({
  ...params,
  mailto: envConfig.OPENALEX_MAILTO,
});

const normalizePaper = (source, paper) => {
  if (source === 'openalex') {
    return {
      id: paper.id,
      title: paper.title,
      abstract: paper.abstract || paper.abstract_inverted_index || null,
      doi: paper.doi?.replace('https://doi.org/', ''),
      publishedDate: paper.publication_date,
      publicationYear: paper.publication_year,
      citationCount: paper.cited_by_count || 0,
      authors: (paper.authorships || []).map(author => ({
        authorId: author.author?.id,
        name: author.author?.display_name,
      })),
      journalName: paper.primary_location?.source?.display_name,
      url: paper.doi || paper.primary_location?.landing_page_url || paper.id,
      source: 'openalex',
    };
  }

  if (source === 'semanticscholar') {
    return {
      id: paper.paperId,
      title: paper.title,
      abstract: paper.abstract || null,
      doi: paper.externalIds?.DOI,
      publishedDate: paper.year ? `${paper.year}-01-01` : null,
      publicationYear: paper.year || null,
      citationCount: paper.citationCount || 0,
      authors: (paper.authors || []).map(author => ({
        authorId: author.authorId,
        name: author.name,
      })),
      journalName: paper.venue || null,
      url: paper.url || null,
      source: 'semanticscholar',
    };
  }

  return {
    id: paper.DOI || paper.doi || paper.URL,
    title: Array.isArray(paper.title) ? paper.title[0] : paper.title,
    abstract: paper.abstract || null,
    doi: paper.DOI || paper.doi || null,
    publishedDate:
      paper.published?.['date-parts']?.[0]?.join('-') ||
      paper['published-print']?.['date-parts']?.[0]?.join('-') ||
      paper['published-online']?.['date-parts']?.[0]?.join('-') ||
      null,
    publicationYear:
      paper.published?.['date-parts']?.[0]?.[0] ||
      paper['published-print']?.['date-parts']?.[0]?.[0] ||
      paper['published-online']?.['date-parts']?.[0]?.[0] ||
      null,
    citationCount: paper['is-referenced-by-count'] || 0,
    authors: (paper.author || []).map(author => ({
      authorId: author.ORCID || null,
      name: [author.given, author.family].filter(Boolean).join(' '),
    })),
    journalName: paper['container-title']?.[0] || null,
    url: paper.URL || null,
    source: 'crossref',
  };
};

const searchPapers = async (source, keyword, options = {}) => {
  const normalizedSource = normalizeSource(source);
  const { page = 1, limit = 20, year = null } = options;

  if (normalizedSource === 'semanticscholar' && !envConfig.SEMANTIC_SCHOLAR_API_KEY) {
    throw new Error('SEMANTIC_SCHOLAR_API_KEY is required for Semantic Scholar requests');
  }

  if (normalizedSource === 'openalex') {
    const cacheKey = `openalex:search:${keyword}:${page}:${limit}:${year || ''}`;
    const cached = searchCache.get(cacheKey);
    if (cached) return cached;

    const response = await openAlexClient.get('/works', {
      params: withOpenAlexParams({
        search: keyword,
        page,
        per_page: Math.min(limit, 25),
        ...(year ? { filter: `publication_year:${year}` } : {}),
      }),
    });

    const result = {
      source: normalizedSource,
      total: response.data.meta?.count || 0,
      papers: (response.data.results || []).map(paper => normalizePaper('openalex', paper)),
    };
    searchCache.set(cacheKey, result);
    return result;
  }

  if (normalizedSource === 'semanticscholar') {
    const response = await semanticScholarClient.get('/paper/search', {
      headers: buildHeaders(normalizedSource),
      params: {
        query: year ? `${keyword} year:${year}` : keyword,
        fields: 'title,year,citationCount,authors,abstract,venue,externalIds,url',
        limit,
        offset: (page - 1) * limit,
      },
    });

    const papers = (response.data.data || [])
      .map(paper => normalizePaper('semanticscholar', paper))
      .filter(paper => !year || paper.publicationYear === year);

    return {
      source: normalizedSource,
      total: response.data.total || papers.length,
      papers,
    };
  }

  const queryParams = {
    query: keyword,
    rows: limit,
    offset: (page - 1) * limit,
    mailto: envConfig.CROSSREF_MAILTO,
  };

  if (year) {
    queryParams.filter = `from-pub-date:${year}-01-01,until-pub-date:${year}-12-31`;
  }

  const response = await crossrefClient.get('/works', {
    params: queryParams,
  });

  const items = response.data.message?.items || [];

  return {
    source: normalizedSource,
    total: response.data.message?.['total-results'] || items.length,
    papers: items.map(paper => normalizePaper('crossref', paper)),
  };
};

const attachGrowthRates = trends => {
  return trends.map((entry, index) => {
    if (index === 0) {
      return { ...entry, growthRate: 0 };
    }
    const previous = trends[index - 1].count || 0;
    const current = entry.count || 0;
    const growthRate =
      previous > 0 ? Number((((current - previous) / previous) * 100).toFixed(2)) : current > 0 ? 100 : 0;
    return { ...entry, growthRate };
  });
};

const getTrendData = async (source, keyword, startYear = 2010) => {
  const normalizedSource = normalizeSource(source);
  const currentYear = new Date().getFullYear();

  if (normalizedSource === 'semanticscholar' && !envConfig.SEMANTIC_SCHOLAR_API_KEY) {
    throw new Error('SEMANTIC_SCHOLAR_API_KEY is required for Semantic Scholar requests');
  }

  if (normalizedSource === 'openalex') {
    const response = await openAlexClient.get('/works', {
      params: withOpenAlexParams({
        search: keyword,
        group_by: 'publication_year',
      }),
    });

    const counts = new Map();
    for (let year = startYear; year <= currentYear; year += 1) {
      counts.set(year, 0);
    }

    (response.data.group_by || []).forEach(item => {
      const year = parseInt(item.key, 10);
      if (year >= startYear && year <= currentYear) {
        counts.set(year, item.count || 0);
      }
    });

    const trends = attachGrowthRates(
      Array.from(counts.entries()).map(([year, count]) => ({
        year,
        count,
      }))
    );

    return { source: normalizedSource, keyword, trends };
  }

  if (normalizedSource === 'semanticscholar') {
    const response = await semanticScholarClient.get('/paper/search', {
      headers: buildHeaders(normalizedSource),
      params: {
        query: keyword,
        fields: 'title,year',
        limit: 100,
        offset: 0,
      },
    });

    const counts = new Map();
    for (let year = startYear; year <= currentYear; year += 1) {
      counts.set(year, 0);
    }

    (response.data.data || []).forEach(paper => {
      if (paper.year && paper.year >= startYear && paper.year <= currentYear) {
        counts.set(paper.year, (counts.get(paper.year) || 0) + 1);
      }
    });

    const trends = attachGrowthRates(
      Array.from(counts.entries()).map(([year, count]) => ({
        year,
        count,
      }))
    );

    return { source: normalizedSource, keyword, trends };
  }

  const response = await crossrefClient.get('/works', {
    params: {
      query: keyword,
      facet: 'published:*',
      rows: 0,
      mailto: envConfig.CROSSREF_MAILTO,
    },
  });

  const counts = new Map();
  for (let year = startYear; year <= currentYear; year += 1) {
    counts.set(year, 0);
  }

  const values = response.data.message?.facets?.published?.values || [];
  values.forEach(item => {
    const year = parseInt(item.value, 10);
    if (!Number.isNaN(year) && year >= startYear && year <= currentYear) {
      counts.set(year, item.count || 0);
    }
  });

  const trends = attachGrowthRates(
    Array.from(counts.entries()).map(([year, count]) => ({
      year,
      count,
    }))
  );

  return { source: normalizedSource, keyword, trends };
};

const getJournalInfo = async (source, query) => {
  const normalizedSource = normalizeSource(source);

  if (normalizedSource !== 'openalex') {
    throw new Error(`Journal lookup is only supported for OpenAlex in this backend (requested: ${normalizedSource})`);
  }

  const response = await openAlexClient.get('/sources', {
    params: withOpenAlexParams({
      search: query,
      per_page: 20,
    }),
  });

  return {
    source: normalizedSource,
    journals: (response.data.results || []).map(journal => ({
      id: journal.id,
      title: journal.display_name,
      issn: journal.issn_l || journal.issn?.[0] || null,
      publisher: journal.host_organization_name || null,
      impactFactor: journal.impact_factor || null,
      paperCount: journal.work_count || 0,
    })),
  };
};

const getAuthorInfo = async (source, query) => {
  const normalizedSource = normalizeSource(source);

  if (normalizedSource === 'semanticscholar' && !envConfig.SEMANTIC_SCHOLAR_API_KEY) {
    throw new Error('SEMANTIC_SCHOLAR_API_KEY is required for Semantic Scholar requests');
  }

  if (normalizedSource === 'openalex') {
    const response = await openAlexClient.get('/authors', {
      params: withOpenAlexParams({
        search: query,
        per_page: 20,
      }),
    });

    return {
      source: normalizedSource,
      authors: (response.data.results || []).map(author => ({
        id: author.id,
        name: author.display_name,
        citationCount: author.cited_by_count || 0,
        paperCount: author.work_count || 0,
        orcid: author.orcid || null,
      })),
    };
  }

  if (normalizedSource === 'semanticscholar') {
    const response = await semanticScholarClient.get('/author/search', {
      headers: buildHeaders(normalizedSource),
      params: {
        query,
        fields: 'name,citationCount,paperCount',
        limit: 20,
        offset: 0,
      },
    });

    return {
      source: normalizedSource,
      authors: (response.data.data || []).map(author => ({
        id: author.authorId,
        name: author.name,
        citationCount: author.citationCount || 0,
        paperCount: author.paperCount || 0,
      })),
    };
  }

  throw new Error(`Author lookup is not supported for source: ${normalizedSource}`);
};

module.exports = {
  searchPapers,
  getTrendData,
  getJournalInfo,
  getAuthorInfo,
  normalizeSource,
};