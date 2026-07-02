const axios = require('axios');
const NodeCache = require('node-cache');
const envConfig = require('../config/env');

/** OpenAlex search có thể >60s — cache 10 phút giảm timeout cho lần gọi sau */
const searchCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

const normalizeSource = source => {
  const value = String(source || 'openalex').trim().toLowerCase().replace(/[_-]/g, '');

  if (value === 'openalex') return 'openalex';
  if (value === 'semanticscholar' || value === 'semantic') return 'semanticscholar';
  if (value === 'crossref') return 'crossref';
  if (value === 'arxiv') return 'arxiv';
  if (value === 'ieee' || value === 'ieeexplore') return 'ieee';
  if (value === 'exa') return 'exa';

  throw new Error(`Unsupported source: ${source}`);
};

const buildHeaders = source => {
  if (source === 'semanticscholar' && envConfig.SEMANTIC_SCHOLAR_API_KEY) {
    return {
      'x-api-key': envConfig.SEMANTIC_SCHOLAR_API_KEY,
    };
  }

  if (source === 'exa' && envConfig.EXA_API_KEY) {
    return {
      'x-api-key': envConfig.EXA_API_KEY,
      'Content-Type': 'application/json',
    };
  }

  return {};
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

const arxivClient = axios.create({
  baseURL: envConfig.ARXIV_API_URL,
  timeout: apiTimeout,
});

const ieeeClient = axios.create({
  baseURL: envConfig.IEEE_API_URL,
  timeout: apiTimeout,
});

const exaClient = axios.create({
  baseURL: envConfig.EXA_API_URL,
  timeout: apiTimeout,
});

/** OpenAlex polite pool: https://docs.openalex.org/how-to-use-the-api/rate-limits-and-authentication */
const withOpenAlexParams = params => ({
  ...params,
  mailto: envConfig.OPENALEX_MAILTO,
});

const toProviderError = (source, error) => {
  const statusCode = error.response?.status || 500;
  const body = error.response?.data;
  const bodyText = typeof body === 'string' ? body : JSON.stringify(body || {});

  let message = `${source} request failed: ${error.message}`;
  if (statusCode === 401 || statusCode === 403) {
    message = `${source} rejected the request. Check that the API key is active and allowed for this endpoint.`;
  }
  if (/Developer Inactive/i.test(bodyText)) {
    message = `${source} rejected the request: Developer Inactive. Activate the IEEE developer account/key before using this source.`;
  }

  const providerError = new Error(message);
  providerError.statusCode = statusCode;
  throw providerError;
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

let semanticScholarQueue = Promise.resolve();
let lastSemanticScholarRequestAt = 0;

/**
 * Semantic Scholar approved key is limited to 1 request/second cumulatively.
 * Queue all S2 calls in this process to avoid immediate 429s during demos.
 */
const semanticScholarRequest = requestFn => {
  const run = semanticScholarQueue.catch(() => {}).then(async () => {
    const elapsed = Date.now() - lastSemanticScholarRequestAt;
    if (elapsed < 1100) {
      await sleep(1100 - elapsed);
    }
    lastSemanticScholarRequestAt = Date.now();
    return requestFn();
  });

  semanticScholarQueue = run.catch(() => {});
  return run;
};

const cleanDoi = doi => {
  const value = String(doi || '').trim();
  if (!value) return null;
  return (
    value
      .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
      .replace(/[?#].*$/, '')
      .replace(/\/(table|figure|fig|supplement|ref|references)-?\d+$/i, '')
      .trim() || null
  );
};

const doiUrl = doi => {
  const cleaned = cleanDoi(doi);
  return cleaned ? `https://doi.org/${cleaned}` : null;
};

const firstUrl = (...values) =>
  values.find(value => typeof value === 'string' && /^https?:\/\//i.test(value.trim())) || null;

const extractDoiFromText = (...values) => {
  const text = values
    .flat()
    .filter(Boolean)
    .join(' ');
  const match = text.match(/\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+\b/i);
  return cleanDoi(match?.[0]);
};

const decodeXml = value =>
  String(value || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

const getXmlTag = (xml, tagName) => {
  const escapedTag = tagName.replace(':', '\\:');
  const match = String(xml || '').match(new RegExp(`<${escapedTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapedTag}>`, 'i'));
  return match ? decodeXml(match[1]) : null;
};

const getArxivDoi = entry =>
  getXmlTag(entry, 'arxiv:doi') ||
  getXmlTag(entry, 'doi') ||
  extractDoiFromText(entry);

const getArxivLinks = entry => {
  const links = {};
  const linkRegex = /<link\b([^>]*)\/?>/gi;
  let match;
  while ((match = linkRegex.exec(String(entry || ''))) !== null) {
    const attrs = match[1] || '';
    const href = attrs.match(/\bhref="([^"]+)"/i)?.[1];
    const rel = attrs.match(/\brel="([^"]+)"/i)?.[1] || 'alternate';
    const title = attrs.match(/\btitle="([^"]+)"/i)?.[1];
    if (!href) continue;
    if (title === 'pdf' || /\/pdf\//i.test(href)) links.pdf = href;
    if (rel === 'alternate') links.url = href;
  }
  return links;
};

const parseArxivFeed = xml => {
  const total = parseInt(getXmlTag(xml, 'opensearch:totalResults') || '0', 10) || 0;
  const entries = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  let match;
  while ((match = entryRegex.exec(String(xml || ''))) !== null) {
    const entry = match[1];
    const authors = [];
    const authorRegex = /<author>([\s\S]*?)<\/author>/gi;
    let authorMatch;
    while ((authorMatch = authorRegex.exec(entry)) !== null) {
      const name = getXmlTag(authorMatch[1], 'name');
      if (name) authors.push({ authorId: null, name });
    }

    const links = getArxivLinks(entry);
    const id = getXmlTag(entry, 'id');
    const publishedDate = getXmlTag(entry, 'published');
    const publicationYear = publishedDate ? parseInt(publishedDate.slice(0, 4), 10) : extractArxivYear(id);

    entries.push({
      id,
      title: getXmlTag(entry, 'title'),
      abstract: getXmlTag(entry, 'summary'),
      doi: getArxivDoi(entry),
      publishedDate,
      publicationYear: Number.isNaN(publicationYear) ? null : publicationYear,
      citationCount: 0,
      authors,
      journalName: 'arXiv',
      url: firstUrl(links.url, id),
      pdfUrl: links.pdf || null,
      source: 'arxiv',
    });
  }

  return { total, entries };
};

const buildArxivQuery = keyword => {
  const terms = String(keyword || '')
    .trim()
    .split(/\s+/)
    .map(term => term.replace(/[^\w.-]/g, ''))
    .filter(Boolean)
    .slice(0, 8);
  return terms.length ? terms.map(term => `all:${term}`).join(' AND ') : 'all:research';
};

const openAlexInvertedIndexToText = invertedIndex => {
  if (!invertedIndex || typeof invertedIndex !== 'object' || Array.isArray(invertedIndex)) {
    return null;
  }

  const words = [];
  Object.entries(invertedIndex).forEach(([word, positions]) => {
    if (!Array.isArray(positions)) return;
    positions.forEach(position => {
      if (Number.isInteger(position)) words[position] = word;
    });
  });

  return words.filter(Boolean).join(' ') || null;
};

const normalizeAbstractText = abstract => {
  if (typeof abstract === 'string') return abstract;
  return openAlexInvertedIndexToText(abstract);
};

const normalizeTitleForCompare = title =>
  String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const titleSimilarity = (a, b) => {
  const aWords = new Set(normalizeTitleForCompare(a).split(' ').filter(word => word.length > 2));
  const bWords = new Set(normalizeTitleForCompare(b).split(' ').filter(word => word.length > 2));
  if (!aWords.size || !bWords.size) return 0;
  const intersection = Array.from(aWords).filter(word => bWords.has(word)).length;
  return intersection / Math.max(aWords.size, bWords.size);
};

const formatCrossrefAuthors = authors =>
  (authors || [])
    .map(author => ({
      authorId: author.ORCID || null,
      name: [author.given, author.family].filter(Boolean).join(' ') || author.name || null,
    }))
    .filter(author => author.name);

const crossrefDatePartsToDate = item =>
  item.published?.['date-parts']?.[0]?.join('-') ||
  item.issued?.['date-parts']?.[0]?.join('-') ||
  item['published-print']?.['date-parts']?.[0]?.join('-') ||
  item['published-online']?.['date-parts']?.[0]?.join('-') ||
  null;

const crossrefDatePartsToYear = item =>
  item.published?.['date-parts']?.[0]?.[0] ||
  item.issued?.['date-parts']?.[0]?.[0] ||
  item['published-print']?.['date-parts']?.[0]?.[0] ||
  item['published-online']?.['date-parts']?.[0]?.[0] ||
  null;

const enrichArxivPaperDoi = async paper => {
  if (paper.doi || !paper.title) return paper;

  const applyCrossrefItem = item => {
    if (!item) return null;
    const crossrefTitle = Array.isArray(item.title) ? item.title[0] : item.title;
    if (titleSimilarity(paper.title, crossrefTitle) < 0.45) return null;

    const doi = cleanDoi(item.DOI || item.doi);
    if (!doi) return null;

    const authors = formatCrossrefAuthors(item.author);
    return {
      ...paper,
      doi,
      // Keep arXiv URL as primary source link, but expose DOI for DOI badge/save.
      authors: paper.authors?.length ? paper.authors : authors,
      journalName: paper.journalName && paper.journalName !== 'arXiv'
        ? paper.journalName
        : item['container-title']?.[0] || item.publisher || 'arXiv',
      citationCount: paper.citationCount || item['is-referenced-by-count'] || 0,
      publicationYear: paper.publicationYear || crossrefDatePartsToYear(item) || null,
      publishedDate: paper.publishedDate || crossrefDatePartsToDate(item) || null,
    };
  };

  try {
    const titleResponse = await crossrefClient.get('/works', {
      params: {
        'query.title': paper.title,
        rows: 3,
        mailto: envConfig.CROSSREF_MAILTO,
      },
    });
    const byTitle = (titleResponse.data.message?.items || [])
      .map(applyCrossrefItem)
      .find(Boolean);
    if (byTitle) return byTitle;
  } catch { /* fall through */ }

  try {
    const authorText = (paper.authors || []).slice(0, 2).map(author => author.name).join(' ');
    const bibliographicResponse = await crossrefClient.get('/works', {
      params: {
        query: [paper.title, authorText, paper.publicationYear].filter(Boolean).join(' '),
        rows: 3,
        mailto: envConfig.CROSSREF_MAILTO,
      },
    });
    const byBibliographic = (bibliographicResponse.data.message?.items || [])
      .map(applyCrossrefItem)
      .find(Boolean);
    if (byBibliographic) return byBibliographic;
  } catch { /* fall through */ }

  return paper;
};

const extractArxivYear = url => {
  const match = String(url || '').match(/arxiv\.org\/(?:abs|html|pdf)\/(\d{2})(\d{2})\./i);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  return year >= 91 ? 1900 + year : 2000 + year;
};

/** Extract arXiv ID from a URL, e.g. arxiv.org/abs/2301.04567 → "2301.04567" */
const extractArxivId = url => {
  const match = String(url || '').match(/arxiv\.org\/(?:abs|html|pdf)\/([0-9]{4}\.[0-9]{4,5}(?:v\d+)?)/i);
  return match?.[1]?.replace(/v\d+$/, '') || null;
};

/**
 * Enrich an Exa result with full metadata (title, authors, DOI, journal…).
 *
 * Strategy (4 tầng, dừng ngay khi đã có đủ tác giả):
 *  1. DOI → Crossref direct lookup  (chính xác nhất)
 *  2. arXiv ID → Semantic Scholar   (tốt nhất cho preprint arXiv)
 *  3. Title → Crossref query         (fallback rộng)
 *  4. Title → OpenAlex query         (fallback cuối cho tác giả)
 */
const enrichExaPaper = async paper => {
  const mergeFields = (base, extra, crossrefAuthors) => ({
    ...base,
    title: base.title || extra.title || base.title,
    doi: base.doi || extra.doi || null,
    url: firstUrl(base.url, extra.url) || base.url,
    authors: base.authors?.length
      ? base.authors
      : (crossrefAuthors || extra.authors || []),
    journalName: base.journalName || extra.journalName || null,
    citationCount: base.citationCount || extra.citationCount || 0,
    publicationYear: base.publicationYear || extra.publicationYear || null,
    publishedDate: base.publishedDate || extra.publishedDate || null,
  });

  try {
    // ── Strategy 1: DOI → Crossref ──────────────────────────────────────
    if (paper.doi) {
      try {
        const resp = await crossrefClient.get(`/works/${encodeURIComponent(paper.doi)}`, {
          params: { mailto: envConfig.CROSSREF_MAILTO },
        });
        const it = resp.data.message;
        if (it) {
          const doi = cleanDoi(it.DOI || it.doi) || paper.doi;
          const crossrefTitle = Array.isArray(it.title) ? it.title[0] : it.title;
          const enriched = mergeFields(
            paper,
            {
              title: crossrefTitle,
              doi,
              url: firstUrl(it.URL, doiUrl(doi)),
              journalName: it['container-title']?.[0] || it.publisher || null,
              citationCount: it['is-referenced-by-count'] || 0,
              publicationYear: crossrefDatePartsToYear(it),
              publishedDate: crossrefDatePartsToDate(it),
            },
            formatCrossrefAuthors(it.author)
          );
          // Nếu đã có tác giả → trả về luôn
          if (enriched.authors?.length) return enriched;
          // Nếu chưa có tác giả → tiếp tục strategy 2/3/4 nhưng giữ các field đã enrich
          return enrichPaperAuthorsOnly(enriched);
        }
      } catch { /* fall through */ }
    }

    return enrichPaperAuthorsOnly(paper);
  } catch {
    return paper;
  }
};

/**
 * Chỉ bổ sung tác giả (khi đã có các field khác nhưng thiếu authors).
 * Thử: arXiv → Semantic Scholar, rồi title → Crossref, rồi title → OpenAlex.
 */
const enrichPaperAuthorsOnly = async paper => {
  // ── Strategy 2: arXiv ID → Semantic Scholar ────────────────────────────
  const arxivId = extractArxivId(paper.url);
  if (arxivId && envConfig.SEMANTIC_SCHOLAR_API_KEY) {
    try {
      const resp = await semanticScholarRequest(() =>
        semanticScholarClient.get(`/paper/arXiv:${arxivId}`, {
          headers: buildHeaders('semanticscholar'),
          params: { fields: 'title,authors,year,externalIds,venue,citationCount,abstract' },
        })
      );
      const it = resp.data;
      if (it?.authors?.length) {
        return {
          ...paper,
          title: paper.title || it.title,
          doi: paper.doi || cleanDoi(it.externalIds?.DOI) || null,
          authors: it.authors.map(a => ({ authorId: a.authorId, name: a.name })),
          journalName: paper.journalName || it.venue || null,
          citationCount: paper.citationCount || it.citationCount || 0,
          publicationYear: paper.publicationYear || it.year || null,
          abstract: paper.abstract || it.abstract || null,
        };
      }
    } catch { /* fall through */ }
  }

  if (!paper.title) return paper;

  // ── Strategy 3: Title → Crossref ───────────────────────────────────────
  try {
    const resp = await crossrefClient.get('/works', {
      params: { query: paper.title, rows: 3, mailto: envConfig.CROSSREF_MAILTO },
    });
    const candidates = resp.data.message?.items || [];
    const it = candidates.find(c => {
      const t = Array.isArray(c.title) ? c.title[0] : c.title;
      return titleSimilarity(paper.title, t) >= 0.35;
    });
    if (it) {
      const authors = formatCrossrefAuthors(it.author);
      if (authors.length) {
        return {
          ...paper,
          doi: paper.doi || cleanDoi(it.DOI || it.doi) || null,
          url: firstUrl(paper.url, it.URL, doiUrl(it.DOI)) || paper.url,
          authors,
          journalName: paper.journalName || it['container-title']?.[0] || it.publisher || null,
          citationCount: paper.citationCount || it['is-referenced-by-count'] || 0,
          publicationYear: paper.publicationYear || crossrefDatePartsToYear(it) || null,
          publishedDate: paper.publishedDate || crossrefDatePartsToDate(it) || null,
        };
      }
    }
  } catch { /* fall through */ }

  // ── Strategy 4: Title → OpenAlex ───────────────────────────────────────
  try {
    const resp = await openAlexClient.get('/works', {
      params: withOpenAlexParams({ search: paper.title, per_page: 3 }),
    });
    const candidates = resp.data.results || [];
    const it = candidates.find(c => titleSimilarity(paper.title, c.title) >= 0.35);
    if (it) {
      const authors = (it.authorships || []).map(a => ({
        authorId: a.author?.id || null,
        name: a.author?.display_name || null,
      })).filter(a => a.name);
      if (authors.length) {
        const doi = cleanDoi(it.doi);
        return {
          ...paper,
          doi: paper.doi || doi || null,
          url: firstUrl(paper.url, it.primary_location?.landing_page_url, doiUrl(doi)) || paper.url,
          authors,
          journalName: paper.journalName || it.primary_location?.source?.display_name || null,
          citationCount: paper.citationCount || it.cited_by_count || 0,
          publicationYear: paper.publicationYear || it.publication_year || null,
          publishedDate: paper.publishedDate || it.publication_date || null,
          abstract: paper.abstract || null,
        };
      }
    }
  } catch { /* fall through */ }

  return paper;
};

const isResearchLikeExaResult = paper => {
  const url = String(paper.url || '').toLowerCase();
  const title = String(paper.title || '').trim();
  const text = String(paper.text || paper.summary || '').toLowerCase();
  if (!title || !url) return false;

  const researchSignals = [
    'arxiv.org',
    'doi.org',
    'semanticscholar.org',
    'openalex.org',
    'springer.com',
    'sciencedirect.com',
    'ieee.org',
    'acm.org',
    'mdpi.com',
    'nature.com',
    'frontiersin.org',
    'researchgate.net',
    'pubmed.ncbi.nlm.nih.gov',
  ];

  return (
    researchSignals.some(signal => url.includes(signal)) ||
    /\b(abstract|paper|study|research|journal|conference|proceedings|arxiv|doi)\b/i.test(`${title} ${text}`)
  );
};

const normalizePaper = (source, paper) => {
  if (source === 'openalex') {
    const doi = cleanDoi(paper.doi);
    return {
      id: paper.id,
      title: paper.title,
      abstract: normalizeAbstractText(paper.abstract) || normalizeAbstractText(paper.abstract_inverted_index),
      doi,
      publishedDate: paper.publication_date,
      publicationYear: paper.publication_year,
      citationCount: paper.cited_by_count || 0,
      authors: (paper.authorships || []).map(author => ({
        authorId: author.author?.id,
        name: author.author?.display_name,
      })),
      journalName: paper.primary_location?.source?.display_name,
      url: firstUrl(paper.primary_location?.landing_page_url, paper.open_access?.oa_url, doiUrl(doi), paper.id),
      source: 'openalex',
    };
  }

  if (source === 'semanticscholar') {
    const doi = cleanDoi(paper.externalIds?.DOI);
    return {
      id: paper.paperId,
      title: paper.title,
      abstract: paper.abstract || null,
      doi,
      publishedDate: paper.year ? `${paper.year}-01-01` : null,
      publicationYear: paper.year || null,
      citationCount: paper.citationCount || 0,
      authors: (paper.authors || []).map(author => ({
        authorId: author.authorId,
        name: author.name,
      })),
      journalName: paper.venue || null,
      url: firstUrl(paper.url, doiUrl(doi)),
      source: 'semanticscholar',
    };
  }

  if (source === 'ieee') {
    const publicationYear = paper.publication_year
      ? parseInt(paper.publication_year, 10)
      : paper.publication_date
        ? parseInt(String(paper.publication_date).slice(0, 4), 10)
        : null;

    const doi = cleanDoi(paper.doi);
    return {
      id: paper.article_number || paper.doi || paper.pdf_url || paper.html_url,
      title: paper.title,
      abstract: paper.abstract || null,
      doi,
      publishedDate: paper.publication_date || null,
      publicationYear: Number.isNaN(publicationYear) ? null : publicationYear,
      citationCount: paper.citing_paper_count || paper.citing_patent_count || 0,
      authors: (paper.authors?.authors || paper.authors || []).map(author => ({
        authorId: author.id || author.affiliation || null,
        name: author.full_name || author.name,
      })),
      journalName: paper.publication_title || paper.publisher || null,
      url: firstUrl(paper.html_url, paper.pdf_url, doiUrl(doi)),
      source: 'ieee',
    };
  }

  if (source === 'exa') {
    const publishedDate = paper.publishedDate || paper.published_date || null;
    const text = paper.text || paper.summary || paper.highlights?.join(' ') || '';
    const publicationYear =
      (publishedDate ? parseInt(String(publishedDate).slice(0, 4), 10) : null) ||
      extractArxivYear(paper.url);
    const doi = cleanDoi(paper.doi || paper.DOI) || extractDoiFromText(paper.url, text, paper.title);
    const authorName = paper.author || paper.authors?.[0]?.name || paper.authors?.[0];

    return {
      id: paper.id || paper.url,
      title: paper.title,
      abstract: text || null,
      doi,
      publishedDate,
      publicationYear: Number.isNaN(publicationYear) ? null : publicationYear,
      citationCount: 0,
      authors: authorName ? [{ authorId: null, name: authorName }] : [],
      journalName: paper.journal || paper.source || null,
      url: firstUrl(paper.url, doiUrl(doi)),
      source: 'exa',
    };
  }

  if (source === 'arxiv') {
    const doi = cleanDoi(paper.doi);
    const url = firstUrl(paper.url, paper.id);
    return {
      id: paper.id || url,
      title: paper.title,
      abstract: paper.abstract || null,
      doi,
      publishedDate: paper.publishedDate || null,
      publicationYear: paper.publicationYear || extractArxivYear(url),
      citationCount: paper.citationCount || 0,
      authors: paper.authors || [],
      journalName: paper.journalName || 'arXiv',
      url,
      pdfUrl: paper.pdfUrl || null,
      source: 'arxiv',
    };
  }

  return {
    id: paper.DOI || paper.doi || paper.URL,
    title: Array.isArray(paper.title) ? paper.title[0] : paper.title,
    abstract: paper.abstract || null,
    doi: cleanDoi(paper.DOI || paper.doi),
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
    url: firstUrl(paper.URL, doiUrl(paper.DOI || paper.doi)),
    source: 'crossref',
  };
};

const searchPapers = async (source, keyword, options = {}) => {
  const normalizedSource = normalizeSource(source);
  const { page = 1, limit = 20, year = null } = options;

  if (normalizedSource === 'semanticscholar' && !envConfig.SEMANTIC_SCHOLAR_API_KEY) {
    throw new Error('SEMANTIC_SCHOLAR_API_KEY is required for Semantic Scholar requests');
  }
  if (normalizedSource === 'ieee' && !envConfig.IEEE_API_KEY) {
    throw new Error('IEEE_API_KEY is required for IEEE Xplore requests');
  }
  if (normalizedSource === 'exa' && !envConfig.EXA_API_KEY) {
    throw new Error('EXA_API_KEY is required for Exa requests');
  }

  if (normalizedSource === 'openalex') {
    const cacheKey = `openalex:search:${keyword}:${page}:${limit}:${year || ''}`;
    const cached = searchCache.get(cacheKey);
    if (cached) return cached;

    // Chỉ lấy bài báo nghiên cứu: journal-article, conference-paper, preprint
    const typeFilter = 'type:article|proceedings-article|posted-content';
    const yearFilter = year ? `publication_year:${year},` : '';

    const response = await openAlexClient.get('/works', {
      params: withOpenAlexParams({
        search: keyword,
        page,
        per_page: Math.min(limit, 25),
        filter: `${yearFilter}${typeFilter}`,
      }),
    });

    const papers = (response.data.results || []).map(paper => normalizePaper('openalex', paper));

    // Enrich papers không có tác giả bằng Crossref/SemanticScholar/OpenAlex
    const enrichedPapers = await Promise.all(
      papers.map(paper => (paper.authors?.length ? paper : enrichExaPaper(paper)))
    );

    const result = {
      source: normalizedSource,
      total: response.data.meta?.count || 0,
      papers: enrichedPapers,
    };
    searchCache.set(cacheKey, result);
    return result;
  }

  if (normalizedSource === 'semanticscholar') {
    const cacheKey = `semanticscholar:search:${keyword}:${page}:${limit}:${year || ''}`;
    const cached = searchCache.get(cacheKey);
    if (cached) return cached;

    const response = await semanticScholarRequest(() =>
      semanticScholarClient.get('/paper/search', {
        headers: buildHeaders(normalizedSource),
        params: {
          query: year ? `${keyword} year:${year}` : keyword,
          fields: 'title,year,citationCount,authors,abstract,venue,externalIds,url',
          limit,
          offset: (page - 1) * limit,
        },
      })
    );

    const papers = (response.data.data || [])
      .map(paper => normalizePaper('semanticscholar', paper))
      .filter(paper => !year || paper.publicationYear === year);

    const result = {
      source: normalizedSource,
      total: response.data.total || papers.length,
      papers,
    };
    searchCache.set(cacheKey, result);
    return result;
  }

  if (normalizedSource === 'arxiv') {
    const cacheKey = `arxiv:search:${keyword}:${page}:${limit}:${year || ''}`;
    const cached = searchCache.get(cacheKey);
    if (cached) return cached;

    let response;
    try {
      response = await arxivClient.get('/api/query', {
        params: {
          search_query: buildArxivQuery(keyword),
          start: (page - 1) * limit,
          max_results: Math.min(limit, 25),
          sortBy: 'submittedDate',
          sortOrder: 'descending',
        },
      });
    } catch (error) {
      toProviderError('arXiv', error);
    }

    const parsed = parseArxivFeed(response.data);
    const normalizedPapers = parsed.entries
      .map(paper => normalizePaper('arxiv', paper))
      .filter(paper => !year || paper.publicationYear === year);
    const papers = await Promise.all(normalizedPapers.map(enrichArxivPaperDoi));

    const result = {
      source: normalizedSource,
      total: parsed.total || papers.length,
      papers,
    };
    searchCache.set(cacheKey, result);
    return result;
  }

  if (normalizedSource === 'ieee') {
    let response;
    try {
      response = await ieeeClient.get('/api/v1/search/articles', {
        params: {
          apikey: envConfig.IEEE_API_KEY,
          format: 'json',
          querytext: keyword,
          max_records: Math.min(limit, 25),
          start_record: (page - 1) * limit + 1,
          ...(year ? { start_year: year, end_year: year } : {}),
        },
      });
    } catch (error) {
      toProviderError('IEEE Xplore', error);
    }

    const articles = response.data.articles || [];
    return {
      source: normalizedSource,
      total: parseInt(response.data.total_records, 10) || articles.length,
      papers: articles.map(paper => normalizePaper('ieee', paper)),
    };
  }

  if (normalizedSource === 'exa') {
    let response;
    try {
      response = await exaClient.post(
        '/search',
        {
          query: keyword,
          type: 'auto',
          category: 'research paper',
          numResults: Math.min(limit, 25),
          contents: {
            text: { maxCharacters: 1500 },
            // highlights giúp extract DOI + tác giả từ đoạn văn liên quan
            highlights: {
              numSentences: 3,
              highlightsPerUrl: 2,
              query: 'DOI author abstract',
            },
          },
          ...(year
            ? {
              startPublishedDate: `${year}-01-01T00:00:00.000Z`,
              endPublishedDate: `${year}-12-31T23:59:59.999Z`,
            }
            : {}),
        },
        {
          headers: buildHeaders(normalizedSource),
        }
      );
    } catch (error) {
      toProviderError('Exa', error);
    }

    const results = response.data.results || [];
    const normalizedPapers = results
      .filter(isResearchLikeExaResult)
      .map(paper => normalizePaper('exa', paper));

    // Enrich tất cả kết quả Exa với 4-tầng: DOI→Crossref, arXiv→S2, title→Crossref, title→OpenAlex
    const papers = await Promise.all(normalizedPapers.map(enrichExaPaper));

    return {
      source: normalizedSource,
      total: papers.length,
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
    for (let year = startYear - 1; year <= currentYear; year += 1) {
      counts.set(year, 0);
    }

    (response.data.group_by || []).forEach(item => {
      const year = parseInt(item.key, 10);
      if (year >= startYear - 1 && year <= currentYear) {
        counts.set(year, item.count || 0);
      }
    });

    const trends = attachGrowthRates(
      Array.from(counts.entries()).map(([year, count]) => ({
        year,
        count,
      }))
    ).slice(1);

    return { source: normalizedSource, keyword, trends };
  }

  if (normalizedSource === 'semanticscholar') {
    const response = await semanticScholarRequest(() =>
      semanticScholarClient.get('/paper/search', {
        headers: buildHeaders(normalizedSource),
        params: {
          query: keyword,
          fields: 'title,year',
          limit: 100,
          offset: 0,
        },
      })
    );

    const counts = new Map();
    for (let year = startYear - 1; year <= currentYear; year += 1) {
      counts.set(year, 0);
    }

    (response.data.data || []).forEach(paper => {
      if (paper.year && paper.year >= startYear - 1 && paper.year <= currentYear) {
        counts.set(paper.year, (counts.get(paper.year) || 0) + 1);
      }
    });

    const trends = attachGrowthRates(
      Array.from(counts.entries()).map(([year, count]) => ({
        year,
        count,
      }))
    ).slice(1);

    return { source: normalizedSource, keyword, trends };
  }

  if (normalizedSource !== 'crossref') {
    const error = new Error(`Trend data is not supported for source: ${normalizedSource}`);
    error.statusCode = 400;
    throw error;
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
  for (let year = startYear - 1; year <= currentYear; year += 1) {
    counts.set(year, 0);
  }

  const values = response.data.message?.facets?.published?.values || [];
  values.forEach(item => {
    const year = parseInt(item.value, 10);
    if (!Number.isNaN(year) && year >= startYear - 1 && year <= currentYear) {
      counts.set(year, item.count || 0);
    }
  });

  const trends = attachGrowthRates(
    Array.from(counts.entries()).map(([year, count]) => ({
      year,
      count,
    }))
  ).slice(1);

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
    const response = await semanticScholarRequest(() =>
      semanticScholarClient.get('/author/search', {
        headers: buildHeaders(normalizedSource),
        params: {
          query,
          fields: 'name,citationCount,paperCount',
          limit: 20,
          offset: 0,
        },
      })
    );

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

const getRelatedKeywordsTrend = async (source, keyword, startYear = 2010) => {
  const normalizedSource = normalizeSource(source);
  const currentYear = new Date().getFullYear();

  if (normalizedSource !== 'openalex') {
    throw new Error(`Related keywords trend is currently only supported for OpenAlex (requested: ${normalizedSource})`);
  }

  const baseFilter = `publication_year:${startYear}-${currentYear},type:article`;
  const normalizedQuery = keyword.trim().toLowerCase();

  // Keep only meaningful co-occurring keywords: drop OpenAlex's "unknown" bucket
  // and the search term itself so it doesn't dominate its own related list.
  const isMeaningful = (entry) => {
    const key = String(entry.key || '');
    const name = entry.key_display_name || '';
    if (!name) return false;
    if (/\/unknown$/i.test(key) || name.toLowerCase() === 'unknown') return false;
    if (name.trim().toLowerCase() === normalizedQuery) return false;
    return true;
  };

  try {
    // 1) True keyword frequencies aggregated over the ENTIRE matched corpus
    //    (group_by counts every matching work, not just a 100-paper sample).
    const freqResp = await openAlexClient.get('/works', {
      params: withOpenAlexParams({
        search: keyword,
        filter: baseFilter,
        group_by: 'keywords.id',
        // group_by buckets are capped by per_page — request the max so we get
        // the full ranking, not just the single top group.
        per_page: 200,
      }),
    });

    const totalPapers = freqResp.data.meta?.count || 0;
    const groups = (freqResp.data.group_by || []).filter(isMeaningful);

    const topKeywords = groups.slice(0, 10).map(g => ({
      keyword: g.key_display_name,
      // Short id form (e.g. "keywords/internet-of-things") for use in filters.
      keyId: String(g.key).replace(/^https?:\/\/openalex\.org\//i, ''),
      count: g.count,
      percentage: totalPapers > 0 ? ((g.count / totalPapers) * 100).toFixed(1) : '0.0',
    }));

    // 2) True yearly co-trends: for each top keyword, count how many of the
    //    matching papers per year also carry that keyword (whole corpus, not a sample).
    const yearlyResults = await Promise.all(
      topKeywords.map(async (kw) => {
        try {
          const resp = await openAlexClient.get('/works', {
            params: withOpenAlexParams({
              search: keyword,
              filter: `${baseFilter},keywords.id:${kw.keyId}`,
              group_by: 'publication_year',
              // Need all year buckets (~18), not just the top one.
              per_page: 200,
            }),
          });
          const byYear = {};
          (resp.data.group_by || []).forEach(g => {
            const y = parseInt(g.key, 10);
            if (!Number.isNaN(y)) byYear[y] = g.count;
          });
          return { keyword: kw.keyword, byYear };
        } catch (e) {
          return { keyword: kw.keyword, byYear: {} };
        }
      })
    );

    const trends = [];
    for (let y = startYear; y <= currentYear; y++) {
      const row = { year: y };
      yearlyResults.forEach(r => { row[r.keyword] = r.byYear[y] || 0; });
      trends.push(row);
    }

    // 3) Sample publications for the display list only (decoupled from the stats above).
    const papersResp = await openAlexClient.get('/works', {
      params: withOpenAlexParams({
        search: keyword,
        filter: baseFilter,
        per_page: 100,
        select: 'title,publication_year,keywords,cited_by_count',
        sort: 'cited_by_count:desc',
      }),
    });
    const papers = (papersResp.data.results || []).map(work => ({
      title: work.title || 'Untitled',
      year: work.publication_year || null,
      citationCount: work.cited_by_count || 0,
      keywords: (work.keywords || [])
        .map(k => k.display_name || k)
        .filter(Boolean)
        .slice(0, 15),
    }));

    return {
      source: normalizedSource,
      keyword,
      totalPapers,
      // Strip the internal keyId before returning to the controller/client.
      topKeywords: topKeywords.map(({ keyword, count, percentage }) => ({ keyword, count, percentage })),
      trends,
      papers,
    };
  } catch (error) {
    toProviderError('OpenAlex', error);
  }
};

/**
 * Map một OpenAlex work về cấu trúc metadata phục vụ phân tích Insight.
 * Trích xuất đúng 5 đặc trưng cốt lõi theo thiết kế:
 *  - Chủ đề lớn (Fields of Study)  → topics[].field / primary_topic
 *  - Từ khóa chính (Keywords)      → keywords[]
 *  - Đơn vị công tác (Affiliation) → authorships[].institutions[]
 *  - Thời gian (Publication Date)  → publication_year
 *  - Trích dẫn (phục vụ xếp hạng)  → cited_by_count
 */
const mapOpenAlexInsightWork = work => {
  const topics = (work.topics || [])
    .map(topic => ({
      topic: topic.display_name || null,
      subfield: topic.subfield?.display_name || null,
      field: topic.field?.display_name || null,
      domain: topic.domain?.display_name || null,
      score: topic.score || 0,
    }))
    .filter(topic => topic.topic || topic.field);

  const keywords = (work.keywords || [])
    .map(keyword =>
      typeof keyword === 'string'
        ? keyword
        : keyword.display_name || keyword.keyword || null
    )
    .filter(Boolean);

  const authorships = work.authorships || [];

  const authors = authorships
    .map(authorship => ({
      name: authorship.author?.display_name || null,
      institutions: (authorship.institutions || [])
        .map(institution => ({
          name: institution.display_name || null,
          country: institution.country_code || null,
        }))
        .filter(institution => institution.name),
    }))
    .filter(author => author.name);

  const institutions = [];
  for (const authorship of authorships) {
    for (const institution of authorship.institutions || []) {
      if (institution.display_name) {
        institutions.push({
          name: institution.display_name,
          country: institution.country_code || null,
        });
      }
    }
  }

  return {
    id: work.id,
    title: work.title || null,
    publicationYear: work.publication_year || null,
    citationCount: work.cited_by_count || 0,
    primaryTopic: work.primary_topic?.display_name || topics[0]?.topic || null,
    primaryField: work.primary_topic?.field?.display_name || topics[0]?.field || null,
    topics,
    keywords,
    authors,
    institutions,
  };
};

/**
 * Lấy tập dữ liệu metadata (Enriched dataset) từ OpenAlex phục vụ 3 nhóm Insight.
 * Một lần gọi /works lấy đủ topics + keywords + institutions, có cache để tái sử dụng
 * giữa 3 endpoint insight (top-topics, emerging-trends, top-affiliations).
 */
const getInsightDataset = async (source, keyword, options = {}) => {
  const normalizedSource = normalizeSource(source);
  if (normalizedSource !== 'openalex') {
    const error = new Error(
      `Insight dataset is currently only supported for OpenAlex (requested: ${normalizedSource})`
    );
    error.statusCode = 400;
    throw error;
  }

  const currentYear = new Date().getFullYear();
  const startYear = options.startYear || 2015;
  const endYear = options.endYear || currentYear;
  const maxPapers = Math.min(Math.max(options.maxPapers || 200, 25), 200);
  const cleanKeyword = String(keyword || '').trim();

  const cacheKey = `openalex:insight:${cleanKeyword}:${startYear}:${endYear}:${maxPapers}`;
  const cached = searchCache.get(cacheKey);
  if (cached) return cached;

  const params = withOpenAlexParams({
    filter: `publication_year:${startYear}-${endYear},type:article|proceedings-article|posted-content`,
    per_page: maxPapers,
    select:
      'id,title,publication_year,cited_by_count,authorships,topics,primary_topic,keywords',
    // Dùng relevance sort (default của OpenAlex khi có search keyword) thay vì
    // cited_by_count:desc để tránh bias về bài cũ/nổi tiếng, lấy đại diện đúng hơn.
    // Chỉ sort by citation khi không có keyword (browse tổng quát).
  });
  if (cleanKeyword) {
    params.search = cleanKeyword;
    // Không set sort → OpenAlex mặc định relevance score (đại diện tốt nhất)
  } else {
    params.sort = 'cited_by_count:desc';
  }

  let response;
  try {
    response = await openAlexClient.get('/works', { params });
  } catch (error) {
    toProviderError('OpenAlex', error);
  }

  const papers = (response.data.results || []).map(mapOpenAlexInsightWork);
  const result = {
    source: normalizedSource,
    keyword: cleanKeyword || null,
    startYear,
    endYear,
    total: response.data.meta?.count || papers.length,
    papers,
  };
  searchCache.set(cacheKey, result);
  return result;
};

module.exports = {
  searchPapers,
  getTrendData,
  getJournalInfo,
  getAuthorInfo,
  normalizeSource,
  getRelatedKeywordsTrend,
  getInsightDataset,
};

