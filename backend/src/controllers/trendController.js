const mongoose = require('mongoose');
const academicApiService = require('../services/academicApiService');
const Topic = require('../models/Topic');
const AnalysisRun = require('../models/AnalysisRun');
const Keyword = require('../models/Keyword');
const Paper = require('../models/Paper');
const { suggestResearchKeywords } = require('../services/geminiService');
const { RULES, normalize: normalizeClassifierText } = require('../services/keywordClassificationService');

/**
 * Trend Analytics Controller
 * Handles publication trend analysis and insights
 */

const parseLimit = (value, fallback = 20, max = 100) =>
  Math.min(Math.max(parseInt(value, 10) || fallback, 1), max);

const buildPaperFilter = query => {
  const filter = {};
  if (query.analysisRunId) filter.analysisRunId = query.analysisRunId;
  if (query.year) filter.publicationYear = parseInt(query.year, 10);
  if (query.source) filter.source = query.source;
  return filter;
};

const normalizeKeywordText = text =>
  String(text || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const toTitleCase = text =>
  String(text || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());

const uniqueStrings = values =>
  Array.from(
    new Set(values.map(value => String(value || '').trim()).filter(Boolean))
  );

const termExistsInText = (text, term) => {
  const normalizedText = normalizeClassifierText(text);
  const normalizedTerm = normalizeClassifierText(term);
  if (!normalizedText || !normalizedTerm) return false;
  return new RegExp(`(^|\\s)${normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`).test(
    normalizedText
  );
};

const buildFallbackRelatedKeywords = keyword => {
  const seed = String(keyword || '').trim();
  const lower = seed.toLowerCase();
  const base = [seed];
  const isMedicalKeyword = /\b(health|healthcare|medical|medicine|clinical|radiology|pathology|disease|diagnosis|cancer|brain|ct|mri)\b/.test(lower);

  if (lower.includes('mamba')) {
    base.push('vision mamba', 'mamba unet', 'medical image segmentation', 'state space models', 'selective scan mechanism');
  }
  if (lower.includes('transformer')) {
    base.push('vision transformer', 'efficient transformer', 'transformer classification', 'transformer forecasting');
  }
  if (lower.includes('machine learning')) {
    base.push(
      'machine learning classification',
      'machine learning prediction',
      'machine learning forecasting',
      'machine learning optimization',
      'machine learning feature selection'
    );
  }

  if (isMedicalKeyword) {
    base.push(`${seed} medical imaging`, `${seed} diagnosis`, `${seed} clinical prediction`);
  }

  base.push(
    `${seed} applications`,
    `${seed} architecture`,
    `${seed} methods`,
    `${seed} benchmarks`
  );

  return uniqueStrings(base).slice(0, 8);
};

const safeSuggestRelatedKeywords = async keyword => {
  const fallback = buildFallbackRelatedKeywords(keyword);
  try {
    const suggestions = await suggestResearchKeywords(keyword);
    return uniqueStrings([keyword, ...fallback, ...suggestions]).slice(0, 8);
  } catch (error) {
    console.warn(`[research-directions] keyword suggestion fallback: ${error.message}`);
    return fallback;
  }
};

const compactPaper = paper => ({
  id: paper.id || paper._id || paper.url || paper.title,
  title: paper.title,
  abstract: paper.abstract || '',
  doi: paper.doi || null,
  url: paper.url || null,
  pdfUrl: paper.pdfUrl || null,
  source: paper.source || null,
  publicationYear: paper.publicationYear || null,
  citationCount: paper.citationCount || 0,
  journalName: paper.journalName || null,
  authors: paper.authors || [],
});

const searchEvidencePapers = async (keyword, relatedKeywords, limit) => {
  const queries = uniqueStrings([keyword, ...relatedKeywords]).slice(0, 3);
  const sources = ['openalex', 'arxiv', 'crossref'];
  const perQueryLimit = Math.min(Math.max(limit || 5, 3), 8);
  const calls = [];

  for (const query of queries) {
    for (const source of sources) {
      calls.push(
        academicApiService
          .searchPapers(source, query, { limit: perQueryLimit, page: 1 })
          .then(result => (result.papers || []).map(paper => ({ ...paper, evidenceQuery: query })))
          .catch(error => {
            console.warn(`[research-directions] ${source} evidence search failed: ${error.message}`);
            return [];
          })
      );
    }
  }

  const batches = await Promise.all(calls);
  const paperMap = new Map();
  for (const paper of batches.flat()) {
    const normalized = compactPaper(paper);
    const key = normalized.doi || normalized.url || `${normalizeKeywordText(normalized.title)}::${normalized.source}`;
    if (!key || paperMap.has(key)) continue;
    paperMap.set(key, normalized);
  }

  return Array.from(paperMap.values());
};

const extractRoleTerms = (papers, relatedKeywords) => {
  const text = [
    ...relatedKeywords,
    ...papers.flatMap(paper => [paper.title, paper.abstract]),
  ].join(' ');
  const roleMap = {
    algorithm: new Map(),
    domain: new Map(),
    application: new Map(),
    method: new Map(),
    tool: new Map(),
  };

  for (const rule of RULES) {
    if (!roleMap[rule.category]) continue;
    for (const term of rule.terms) {
      if (!termExistsInText(text, term)) continue;
      const current = roleMap[rule.category].get(term) || { term, count: 0 };
      current.count += 1;
      roleMap[rule.category].set(term, current);
    }
  }

  const normalizedText = normalizeClassifierText(text);
  const addHeuristic = (category, term, pattern) => {
    if (!pattern.test(normalizedText)) return;
    const current = roleMap[category].get(term) || { term, count: 0 };
    current.count += 2;
    roleMap[category].set(term, current);
  };

  addHeuristic('domain', 'medical imaging', /\bmedical image|medical imaging|radiology\b/);
  addHeuristic('domain', 'computer vision', /\bvision|image segmentation|object detection\b/);
  addHeuristic('application', '3d segmentation', /\b3d\b.*\bsegmentation\b|\bsegmentation\b.*\b3d\b/);

  const pick = category =>
    Array.from(roleMap[category].values())
      .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term))
      .map(item => item.term);

  return {
    algorithms: [...pick('algorithm'), ...pick('method'), ...pick('tool')],
    domains: pick('domain'),
    applications: pick('application'),
  };
};

const paperMatchesDirection = (paper, parts) => {
  const text = `${paper.title || ''} ${paper.abstract || ''}`;
  const terms = [parts.algorithm, parts.domain, parts.application].filter(Boolean);
  const matches = terms.filter(term => termExistsInText(text, term));
  return terms.length >= 2 && matches.length >= 2;
};

const scoreDirection = ({ evidenceCount, latestYear, trendContext, specificityCount }) => {
  const status = String(trendContext?.trendStatus || '').toLowerCase();
  const statusScore = { exploding: 0.95, growing: 0.8, stable: 0.55, declining: 0.28 }[status] || 0.55;
  const growth = Number(trendContext?.averageGrowthRate);
  const growthScore = Number.isFinite(growth) ? Math.max(0, Math.min(1, (growth + 20) / 100)) : 0.5;
  const evidenceScore = Math.min(1, evidenceCount / 4);
  const recencyScore = latestYear ? Math.max(0, Math.min(1, (latestYear - 2018) / 8)) : 0.45;
  const specificityScore = Math.min(1, specificityCount / 3);

  return Math.max(
    0.05,
    Math.min(
      0.98,
      statusScore * 0.3 + growthScore * 0.2 + evidenceScore * 0.25 + recencyScore * 0.15 + specificityScore * 0.1
    )
  );
};

const opportunityLevel = score => {
  if (score >= 0.72) return 'High';
  if (score >= 0.48) return 'Medium';
  return 'Low';
};

const buildWhy = (parts, evidenceCount, trendContext) => {
  const status = trendContext?.trendStatus || 'tracked';
  const growth = trendContext?.averageGrowthRate;
  const growthText = growth !== undefined && growth !== null ? ` with average growth around ${growth}%` : '';
  if (!parts.algorithm && parts.domain && parts.application) {
    return `${toTitleCase(parts.domain)} and ${parts.application} appear together in ${evidenceCount} evidence paper(s), and the keyword is currently ${status}${growthText}.`;
  }
  const terms = [parts.algorithm, parts.domain, parts.application].filter(Boolean).map(toTitleCase);
  return `${terms.join(' + ')} appears in ${evidenceCount} evidence paper(s), and the keyword is currently ${status}${growthText}.`;
};

const buildDirectionCandidates = (keyword, relatedKeywords, papers, trendContext, limit) => {
  const roles = extractRoleTerms(papers, relatedKeywords);
  const algorithms = roles.algorithms.length ? uniqueStrings(roles.algorithms).slice(0, 4) : [null];
  const domains = roles.domains.length ? uniqueStrings(roles.domains).slice(0, 4) : [null];
  const applications = roles.applications.length ? uniqueStrings(roles.applications).slice(0, 4) : [null];
  const directions = [];

  for (const algorithm of algorithms) {
    for (const domain of domains) {
      for (const application of applications) {
        const parts = { algorithm, domain, application };
        const specificityCount = [algorithm, domain, application].filter(Boolean).length;
        if (specificityCount < 2) continue;

        const evidencePapers = papers
          .filter(paper => paperMatchesDirection(paper, parts))
          .sort((a, b) => (b.publicationYear || 0) - (a.publicationYear || 0) || (b.citationCount || 0) - (a.citationCount || 0))
          .slice(0, 4);

        if (!evidencePapers.length) continue;

        const latestYear = Math.max(...evidencePapers.map(paper => paper.publicationYear || 0), 0);
        const opportunityScore = scoreDirection({
          evidenceCount: evidencePapers.length,
          latestYear,
          trendContext,
          specificityCount,
        });

        const titleParts = [algorithm, domain, application].filter(Boolean).map(toTitleCase);
        directions.push({
          title: titleParts.length === 3
            ? `${titleParts[0]} for ${titleParts[1]} ${titleParts[2]}`.replace(/\s+/g, ' ')
            : `${titleParts.join(' + ')} Research`,
          formula: {
            algorithm: algorithm ? toTitleCase(algorithm) : 'Not specified by evidence',
            domain: domain ? toTitleCase(domain) : 'Not specified by evidence',
            application: application ? toTitleCase(application) : 'Not specified by evidence',
          },
          why: buildWhy(parts, evidencePapers.length, trendContext),
          relatedKeywords: uniqueStrings([algorithm, domain, application, ...relatedKeywords].filter(Boolean)).slice(0, 8),
          opportunityLevel: opportunityLevel(opportunityScore),
          opportunityScore: Number(opportunityScore.toFixed(4)),
          nextQuery: uniqueStrings([algorithm, domain, application].filter(Boolean)).join(' '),
          evidencePapers,
        });
      }
    }
  }

  return directions
    .sort((a, b) => b.opportunityScore - a.opportunityScore || b.evidencePapers.length - a.evidencePapers.length)
    .slice(0, limit);
};

const validateAnalysisRunId = (analysisRunId, res) => {
  if (!analysisRunId || mongoose.Types.ObjectId.isValid(analysisRunId)) return true;
  res.status(400).json({
    success: false,
    message: 'Invalid analysisRunId',
  });
  return false;
};

const loadPaperKeywordSets = async (paperFilter, paperLimit) => {
  const papers = await Paper.find({
    ...paperFilter,
    $or: [
      { keywordIds: { $exists: true, $ne: [] } },
      { keywords: { $exists: true, $ne: [] } },
    ],
  })
    .sort({ citationCount: -1, publishedDate: -1 })
    .limit(paperLimit)
    .select('keywordIds keywords citationCount publishedDate');

  const keywordIds = new Set();
  const keywordTexts = new Set();

  for (const paper of papers) {
    for (const id of paper.keywordIds || []) {
      if (id) keywordIds.add(String(id));
    }
    for (const keyword of paper.keywords || []) {
      const value = String(keyword || '').trim();
      if (!value) continue;
      if (mongoose.Types.ObjectId.isValid(value)) keywordIds.add(value);
      else keywordTexts.add(normalizeKeywordText(value));
    }
  }

  const or = [];
  if (keywordIds.size) {
    or.push({ _id: { $in: Array.from(keywordIds).map(id => new mongoose.Types.ObjectId(id)) } });
  }
  if (keywordTexts.size) {
    or.push({ normalizedText: { $in: Array.from(keywordTexts) } });
  }

  const keywords = or.length
    ? await Keyword.find({ $or: or }).select('name normalizedText category paperCount growthRate trendScore')
    : [];
  const byId = new Map(keywords.map(keyword => [String(keyword._id), keyword]));
  const byText = new Map(keywords.map(keyword => [keyword.normalizedText, keyword]));

  return papers.map(paper => {
    const docs = [];
    const seen = new Set();

    const addKeyword = keyword => {
      if (!keyword) return;
      const id = String(keyword._id);
      if (seen.has(id)) return;
      seen.add(id);
      docs.push(keyword);
    };

    for (const id of paper.keywordIds || []) addKeyword(byId.get(String(id)));
    for (const keyword of paper.keywords || []) {
      const value = String(keyword || '').trim();
      if (!value) continue;
      if (mongoose.Types.ObjectId.isValid(value)) addKeyword(byId.get(value));
      else addKeyword(byText.get(normalizeKeywordText(value)));
    }

    return docs;
  });
};

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
    // Exclude the current incomplete year from the average to avoid false declining trends
    const completeTrends = trendData.trends.slice(0, -1);
    const latestTrends = completeTrends.slice(-4); // Last 4 complete years for avg
    const avgGrowth = latestTrends.length > 0 
      ? latestTrends.reduce((sum, t) => sum + t.growthRate, 0) / latestTrends.length
      : 0;

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

const getResearchDirections = async (req, res, next) => {
  try {
    const { keyword, trendContext = {}, limit = 5 } = req.body;
    const safeLimit = parseLimit(limit, 5, 8);

    if (!keyword || !String(keyword).trim()) {
      return res.status(400).json({
        success: false,
        message: 'keyword is required',
      });
    }

    const seedKeyword = String(keyword).trim();
    const relatedKeywords = await safeSuggestRelatedKeywords(seedKeyword);
    const evidencePapers = await searchEvidencePapers(seedKeyword, relatedKeywords, 5);
    const directions = buildDirectionCandidates(
      seedKeyword,
      relatedKeywords,
      evidencePapers,
      trendContext,
      safeLimit
    );

    res.status(200).json({
      success: true,
      keyword: seedKeyword,
      relatedKeywords,
      directions,
      meta: {
        evidencePaperCount: evidencePapers.length,
        directionCount: directions.length,
        sources: ['openalex', 'arxiv', 'crossref'],
        rule: 'Directions without evidence papers are excluded from the main list.',
      },
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

const getKeywordCategories = async (req, res, next) => {
  try {
    const { category, analysisRunId } = req.query;
    const limit = parseLimit(req.query.limit, 20, 100);

    if (analysisRunId) {
      if (!validateAnalysisRunId(analysisRunId, res)) return;

      const pipeline = [
        { $match: { analysisRunId: new mongoose.Types.ObjectId(analysisRunId) } },
        { $unwind: '$keywordIds' },
        { $group: { _id: '$keywordIds', paperCount: { $sum: 1 }, citationCount: { $sum: '$citationCount' } } },
        {
          $lookup: {
            from: 'keywords',
            localField: '_id',
            foreignField: '_id',
            as: 'keyword',
          },
        },
        { $unwind: '$keyword' },
      ];

      if (category) pipeline.push({ $match: { 'keyword.category': category } });

      pipeline.push(
        { $sort: { paperCount: -1, citationCount: -1 } },
        { $limit: limit },
        {
          $project: {
            _id: 0,
            keywordId: '$_id',
            name: '$keyword.name',
            normalizedText: '$keyword.normalizedText',
            category: '$keyword.category',
            confidence: '$keyword.classificationConfidence',
            classifiedBy: '$keyword.classifiedBy',
            paperCount: 1,
            citationCount: 1,
            growthRate: '$keyword.growthRate',
            trendScore: '$keyword.trendScore',
          },
        }
      );

      const keywords = await Paper.aggregate(pipeline);
      return res.status(200).json({
        success: true,
        source: 'corpus_run',
        analysisRunId,
        category: category || 'all',
        keywords,
      });
    }

    const filter = {};
    if (category) filter.category = category;

    const keywords = await Keyword.find(filter)
      .sort({ paperCount: -1, growthRate: -1, trendScore: -1, name: 1 })
      .limit(limit)
      .select(
        'name normalizedText category classificationConfidence classifiedBy paperCount citationCount growthRate trendScore source lastClassifiedAt'
      );

    res.status(200).json({
      success: true,
      source: 'all_keywords',
      category: category || 'all',
      keywords,
    });
  } catch (error) {
    next(error);
  }
};

const getKeywordGraph = async (req, res, next) => {
  try {
    const limit = parseLimit(req.query.limit, 50, 150);
    const paperLimit = parseLimit(req.query.paperLimit, 300, 1000);
    if (!validateAnalysisRunId(req.query.analysisRunId, res)) return;
    const paperFilter = buildPaperFilter(req.query);

    const paperKeywordSets = await loadPaperKeywordSets(paperFilter, paperLimit);

    const nodeMap = new Map();
    const edgeMap = new Map();

    for (const keywords of paperKeywordSets) {
      const uniqueKeywords = Array.from(
        new Map(keywords.map(keyword => [String(keyword._id), keyword])).values()
      );

      for (const keyword of uniqueKeywords) {
        const id = String(keyword._id);
        const node = nodeMap.get(id) || {
          id,
          label: keyword.name || keyword.normalizedText,
          category: keyword.category || 'general',
          paperCount: 0,
          growthRate: keyword.growthRate || 0,
          trendScore: keyword.trendScore || 0,
        };
        node.paperCount += 1;
        nodeMap.set(id, node);
      }

      for (let i = 0; i < uniqueKeywords.length; i += 1) {
        for (let j = i + 1; j < uniqueKeywords.length; j += 1) {
          const source = String(uniqueKeywords[i]._id);
          const target = String(uniqueKeywords[j]._id);
          const key = [source, target].sort().join('::');
          const current = edgeMap.get(key) || { source, target, weight: 0 };
          current.weight += 1;
          edgeMap.set(key, current);
        }
      }
    }

    const topNodeIds = new Set(
      Array.from(nodeMap.values())
        .sort((a, b) => b.paperCount - a.paperCount || a.label.localeCompare(b.label))
        .slice(0, limit)
        .map(node => node.id)
    );

    const nodes = Array.from(nodeMap.values()).filter(node => topNodeIds.has(node.id));
    const edges = Array.from(edgeMap.values())
      .filter(edge => topNodeIds.has(edge.source) && topNodeIds.has(edge.target))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, limit * 2);

    res.status(200).json({
      success: true,
      source: req.query.analysisRunId ? 'corpus_run' : 'local_database',
      nodes,
      edges,
        meta: {
        paperCount: paperKeywordSets.length,
        nodeCount: nodes.length,
        edgeCount: edges.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getAlgorithmDomains = async (req, res, next) => {
  try {
    const limit = parseLimit(req.query.limit, 50, 150);
    const paperLimit = parseLimit(req.query.paperLimit, 500, 1500);
    if (!validateAnalysisRunId(req.query.analysisRunId, res)) return;
    const paperFilter = buildPaperFilter(req.query);

    const paperKeywordSets = await loadPaperKeywordSets(paperFilter, paperLimit);

    const pairMap = new Map();

    for (const keywords of paperKeywordSets) {
      const algorithms = keywords.filter(keyword => keyword.category === 'algorithm');
      const domains = keywords.filter(keyword => keyword.category === 'domain');

      for (const algorithm of algorithms) {
        for (const domain of domains) {
          const key = `${algorithm._id}::${domain._id}`;
          const current = pairMap.get(key) || {
            algorithmId: algorithm._id,
            algorithm: algorithm.name || algorithm.normalizedText,
            domainId: domain._id,
            domain: domain.name || domain.normalizedText,
            paperCount: 0,
          };
          current.paperCount += 1;
          pairMap.set(key, current);
        }
      }
    }

    const pairs = Array.from(pairMap.values())
      .sort((a, b) => b.paperCount - a.paperCount || a.algorithm.localeCompare(b.algorithm))
      .slice(0, limit);

    res.status(200).json({
      success: true,
      source: req.query.analysisRunId ? 'corpus_run' : 'local_database',
      pairs,
      meta: {
        paperCount: paperKeywordSets.length,
        pairCount: pairs.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getRelatedKeywordsTrend = async (req, res, next) => {
  try {
    const { source = 'openalex', keyword, startYear = 2010 } = req.query;
    const currentYear = new Date().getFullYear();
    const startYearNum = parseInt(startYear, 10) || 2010;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: 'Keyword is required',
      });
    }

    let papers = [];
    const normalizedSource = source.trim().toLowerCase();

    if (normalizedSource === 'openalex') {
      // OpenAlex computes true frequencies and yearly co-trends over the ENTIRE
      // matched corpus via group_by (not a 100-paper sample), so return its
      // pre-aggregated stats directly.
      const result = await academicApiService.getRelatedKeywordsTrend('openalex', keyword, startYearNum);
      return res.status(200).json({
        success: true,
        keyword,
        source: normalizedSource,
        totalPapers: result.totalPapers || 0,
        topKeywords: result.topKeywords || [],
        trends: result.trends || [],
        papers: (result.papers || []).map(p => ({
          title: p.title,
          year: p.year,
          citationCount: p.citationCount,
          keywords: p.keywords
        }))
      });
    }

    if (normalizedSource === 'local') {
      // Local database search: find matching papers
      const filter = {
        $text: { $search: keyword.trim() },
        publicationYear: { $gte: startYearNum, $lte: currentYear }
      };

      const localPapers = await Paper.find(filter)
        .sort({ citationCount: -1 })
        .limit(100)
        .select('title publicationYear citationCount keywords');

      papers = localPapers.map(p => ({
        title: p.title,
        year: p.publicationYear || null,
        citationCount: p.citationCount || 0,
        keywords: p.keywords || []
      }));
    } else {
      return res.status(400).json({
        success: false,
        message: 'Unsupported source. Use "openalex" or "local".'
      });
    }

    // Statistical aggregation:
    // 1. Calculate overall frequency of each keyword
    const keywordFreq = {};
    papers.forEach(paper => {
      // Lowercase/normalize keywords to avoid duplicates due to casing
      const seenInPaper = new Set();
      (paper.keywords || []).forEach(kw => {
        const normalized = kw.trim().toLowerCase();
        if (!normalized || normalized === keyword.trim().toLowerCase()) return; // Skip search query itself
        seenInPaper.add(normalized);
      });

      seenInPaper.forEach(normalized => {
        keywordFreq[normalized] = (keywordFreq[normalized] || 0) + 1;
      });
    });

    // Sort to find the top keywords
    const topKeywordsList = Object.entries(keywordFreq)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Take top 10 related keywords

    const topKeywordNames = topKeywordsList.map(item => item.name);

    // Initialize yearly trend counts for top keywords
    // We want a list of objects per year from startYearNum to currentYear
    const yearlyDataMap = new Map();
    for (let y = startYearNum; y <= currentYear; y++) {
      const yearObj = { year: y };
      topKeywordNames.forEach(name => {
        yearObj[name] = 0;
      });
      yearlyDataMap.set(y, yearObj);
    }

    // Fill yearly counts
    papers.forEach(paper => {
      const paperYear = paper.year;
      if (paperYear && paperYear >= startYearNum && paperYear <= currentYear) {
        const yearObj = yearlyDataMap.get(paperYear);
        if (yearObj) {
          const seenInPaper = new Set();
          (paper.keywords || []).forEach(kw => {
            const normalized = kw.trim().toLowerCase();
            if (topKeywordNames.includes(normalized)) {
              seenInPaper.add(normalized);
            }
          });
          seenInPaper.forEach(normalized => {
            yearObj[normalized] += 1;
          });
        }
      }
    });

    const trends = Array.from(yearlyDataMap.values());

    // Capitalize keywords for display, mapping normalized names back to a readable format
    // Find the original casing for each top keyword (from the paper lists)
    const displayNameMap = {};
    papers.forEach(paper => {
      (paper.keywords || []).forEach(kw => {
        const normalized = kw.trim().toLowerCase();
        if (topKeywordNames.includes(normalized) && !displayNameMap[normalized]) {
          // Store the original casing
          displayNameMap[normalized] = kw;
        }
      });
    });
    
    // Fallback to name if not found
    topKeywordNames.forEach(name => {
      if (!displayNameMap[name]) {
        displayNameMap[name] = name;
      }
    });

    // Reformat output trends keys and top keywords list with display names
    const formattedTrends = trends.map(t => {
      const newObj = { year: t.year };
      topKeywordNames.forEach(name => {
        newObj[displayNameMap[name]] = t[name];
      });
      return newObj;
    });

    const formattedTopKeywords = topKeywordsList.map(item => ({
      keyword: displayNameMap[item.name],
      count: item.count,
      percentage: papers.length > 0 ? ((item.count / papers.length) * 100).toFixed(1) : '0.0'
    }));

    res.status(200).json({
      success: true,
      keyword,
      source: normalizedSource,
      totalPapers: papers.length,
      topKeywords: formattedTopKeywords,
      trends: formattedTrends,
      papers: papers.map(p => ({
        title: p.title,
        year: p.year,
        citationCount: p.citationCount,
        keywords: p.keywords
      }))
    });

  } catch (error) {
    next(error);
  }
};

// ===================================================================
// INSIGHT ENDPOINTS — Gọi OpenAlex API + Local DB
// ===================================================================

/**
 * Insight 3.1: Top Topics & Keywords
 * Khi có keyword: gọi OpenAlex → thống kê concepts/keywords từ kết quả live
 * Khi không có keyword: aggregate từ local DB
 */
const getInsightTopTopics = async (req, res, next) => {
  try {
    const currentYear = new Date().getFullYear();
    const startYear = parseInt(req.query.startYear, 10) || 2015;
    const endYear = parseInt(req.query.endYear, 10) || currentYear;
    const limit = parseLimit(req.query.limit, 10, 50);
    const keyword = (req.query.keyword || '').trim();

    // ── OpenAlex live search ──
    if (keyword) {
      const dataset = await academicApiService.getInsightDataset('openalex', keyword, {
        startYear,
        endYear,
        maxPapers: 200,
      });
      const papers = dataset.papers;

      // Chủ đề lớn (Fields of Study): đếm theo research topic của OpenAlex → Bar Chart
      const topicFreq = {};
      // Từ khóa chính (Keywords): đếm tần suất → Word Cloud
      const keywordFreq = {};

      for (const paper of papers) {
        const seenTopics = new Set();
        for (const topic of paper.topics || []) {
          const name = (topic.topic || topic.field || '').trim();
          if (!name) continue;
          const key = name.toLowerCase();
          if (seenTopics.has(key)) continue;
          seenTopics.add(key);
          if (!topicFreq[key]) topicFreq[key] = { name, count: 0, category: 'domain' };
          topicFreq[key].count += 1;
        }

        const seenKeywords = new Set();

        // Ưu tiên 1: keywords[] gán nhãn trực tiếp (nếu có)
        for (const kw of paper.keywords || []) {
          const normalized = String(kw).trim().toLowerCase();
          if (!normalized || normalized === keyword.toLowerCase()) continue;
          if (seenKeywords.has(normalized)) continue;
          seenKeywords.add(normalized);
          if (!keywordFreq[normalized]) keywordFreq[normalized] = { name: kw, count: 0, category: 'general' };
          keywordFreq[normalized].count += 1;
        }

        // Fallback: dùng tầng Topic cụ thể nhất trong topics[] khi keywords rỗng
        // Topic là tầng chi tiết nhất (vd: "Creativity in Education and Neuroscience")
        // thay vì Field/Domain quá rộng
        for (const topic of paper.topics || []) {
          const topicName = (topic.topic || '').trim();
          if (!topicName) continue;
          const normalized = topicName.toLowerCase();
          if (normalized === keyword.toLowerCase()) continue;
          if (seenKeywords.has(normalized)) continue;
          seenKeywords.add(normalized);
          if (!keywordFreq[normalized]) keywordFreq[normalized] = { name: topicName, count: 0, category: 'domain' };
          keywordFreq[normalized].count += 1;
        }
      }

      const topics = Object.values(topicFreq)
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
      const wordCloudKeywords = Object.values(keywordFreq)
        .sort((a, b) => b.count - a.count)
        .slice(0, limit * 3);

      return res.status(200).json({
        success: true,
        source: 'openalex',
        keyword,
        startYear,
        endYear,
        totalPapers: papers.length,
        topics: topics.map(t => ({ name: t.name, normalizedText: t.name.toLowerCase(), category: t.category, count: t.count })),
        keywords: wordCloudKeywords.map(t => ({ name: t.name, normalizedText: t.name.toLowerCase(), category: t.category, count: t.count })),
      });
    }

    // ── Local DB fallback ──
    const topicsPipeline = [
      { $match: { publicationYear: { $gte: startYear, $lte: endYear } } },
      { $unwind: '$keywordIds' },
      { $group: { _id: '$keywordIds', count: { $sum: 1 } } },
      { $lookup: { from: 'keywords', localField: '_id', foreignField: '_id', as: 'kw' } },
      { $unwind: '$kw' },
      { $match: { 'kw.category': 'domain' } },
      { $sort: { count: -1 } },
      { $limit: limit },
      { $project: { _id: 0, name: '$kw.name', normalizedText: '$kw.normalizedText', category: '$kw.category', count: 1 } },
    ];

    const keywordsPipeline = [
      { $match: { publicationYear: { $gte: startYear, $lte: endYear } } },
      { $unwind: '$keywordIds' },
      { $group: { _id: '$keywordIds', count: { $sum: 1 } } },
      { $lookup: { from: 'keywords', localField: '_id', foreignField: '_id', as: 'kw' } },
      { $unwind: '$kw' },
      { $sort: { count: -1 } },
      { $limit: limit * 3 },
      { $project: { _id: 0, name: '$kw.name', normalizedText: '$kw.normalizedText', category: '$kw.category', count: 1 } },
    ];

    const totalPipeline = [
      { $match: { publicationYear: { $gte: startYear, $lte: endYear } } },
      { $count: 'total' },
    ];

    const [topics, keywords, totalResult] = await Promise.all([
      Paper.aggregate(topicsPipeline),
      Paper.aggregate(keywordsPipeline),
      Paper.aggregate(totalPipeline),
    ]);

    res.status(200).json({
      success: true,
      source: 'local',
      startYear,
      endYear,
      totalPapers: totalResult[0]?.total || 0,
      topics,
      keywords,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Insight 3.2: Emerging & Trending Topics
 * Khi có keyword: gọi OpenAlex → lấy related keywords trend (count theo năm)
 * Khi không có keyword: aggregate từ local DB
 */
const getInsightEmergingTrends = async (req, res, next) => {
  try {
    const currentYear = new Date().getFullYear();
    const startYear = parseInt(req.query.startYear, 10) || 2015;
    const endYear = parseInt(req.query.endYear, 10) || currentYear;
    const limit = parseLimit(req.query.limit, 10, 30);
    const keyword = (req.query.keyword || '').trim();

    // ── OpenAlex live: dùng getInsightDataset ──
    if (keyword) {
      let dataset = null;
      try {
        dataset = await academicApiService.getInsightDataset('openalex', keyword, {
          startYear,
          endYear,
          maxPapers: 200,
        });
      } catch (err) {
        console.warn('[insight] OpenAlex insight dataset failed:', err.message);
      }

      if (dataset && dataset.papers && dataset.papers.length > 0) {
        const papers = dataset.papers;

        // 1. Đếm tần suất + phân bố theo năm của từng keyword
        const keywordFreq = {};
        const keywordYearlyMap = {};

        papers.forEach(paper => {
          const year = paper.publicationYear;
          const seen = new Set();

          // Ưu tiên 1: keywords[] gán nhãn trực tiếp
          (paper.keywords || []).forEach(kw => {
            const normalized = String(kw).trim().toLowerCase();
            if (!normalized || normalized === keyword.toLowerCase()) return;
            seen.add(normalized);
            if (!keywordFreq[normalized]) keywordFreq[normalized] = { name: kw, count: 0 };
            keywordFreq[normalized].count += 1;
          });

          // Fallback: Topic level cụ thể nhất trong topics[] (phổ biến hơn keywords[])
          (paper.topics || []).forEach(t => {
            const topicName = (t.topic || '').trim();
            if (!topicName) return;
            const normalized = topicName.toLowerCase();
            if (normalized === keyword.toLowerCase() || seen.has(normalized)) return;
            seen.add(normalized);
            if (!keywordFreq[normalized]) keywordFreq[normalized] = { name: topicName, count: 0 };
            keywordFreq[normalized].count += 1;
          });

          seen.forEach(normalized => {
            if (!keywordYearlyMap[normalized]) keywordYearlyMap[normalized] = {};
            if (year && year >= startYear && year <= endYear) {
              keywordYearlyMap[normalized][year] = (keywordYearlyMap[normalized][year] || 0) + 1;
            }
          });
        });

        // 2. Get top keywords
        const topKeywords = Object.entries(keywordFreq)
          .sort(([, a], [, b]) => b.count - a.count)
          .slice(0, limit * 2);

        // 3. Build trends with yearly data + Δ%
        const trends = topKeywords.map(([normalized, info]) => {
          const yearlyMap = keywordYearlyMap[normalized] || {};
          const filled = [];
          for (let y = startYear; y <= endYear; y++) {
            filled.push({ year: y, count: yearlyMap[y] || 0 });
          }

          let growthRate = 0;
          if (filled.length >= 2) {
            const prev = filled[filled.length - 2].count;
            const curr = filled[filled.length - 1].count;
            if (prev > 0) growthRate = ((curr - prev) / prev) * 100;
            else if (curr > 0) growthRate = 100;
          }

          let avgGrowth = 0;
          let growthPairs = 0;
          for (let i = 1; i < filled.length; i++) {
            if (filled[i - 1].count > 0) {
              avgGrowth += ((filled[i].count - filled[i - 1].count) / filled[i - 1].count) * 100;
              growthPairs++;
            }
          }
          if (growthPairs > 0) avgGrowth /= growthPairs;

          const isEmerging = growthRate > 50 || avgGrowth > 30;

          return {
            name: info.name,
            normalizedText: normalized,
            category: 'general',
            totalCount: info.count,
            yearlyData: filled,
            growthRate: Number(growthRate.toFixed(1)),
            avgGrowthRate: Number(avgGrowth.toFixed(1)),
            isEmerging,
          };
        });

        trends.sort((a, b) => {
          if (a.isEmerging !== b.isEmerging) return a.isEmerging ? -1 : 1;
          return b.growthRate - a.growthRate;
        });

        return res.status(200).json({
          success: true,
          source: 'openalex',
          keyword,
          startYear,
          endYear,
          trends: trends.slice(0, limit),
        });
      }
    }

    // ── Local DB fallback ──
    const pipeline = [
      { $match: { publicationYear: { $gte: startYear, $lte: endYear } } },
      { $unwind: '$keywordIds' },
      { $group: { _id: { keywordId: '$keywordIds', year: '$publicationYear' }, count: { $sum: 1 } } },
      { $group: { _id: '$_id.keywordId', yearlyData: { $push: { year: '$_id.year', count: '$count' } }, totalCount: { $sum: '$count' } } },
      { $sort: { totalCount: -1 } },
      { $limit: limit * 2 },
      { $lookup: { from: 'keywords', localField: '_id', foreignField: '_id', as: 'kw' } },
      { $unwind: '$kw' },
      { $project: { _id: 0, keywordId: '$_id', name: '$kw.name', normalizedText: '$kw.normalizedText', category: '$kw.category', totalCount: 1, yearlyData: 1 } },
    ];

    const rawTrends = await Paper.aggregate(pipeline);

    const trends = rawTrends.map(item => {
      const sorted = [...item.yearlyData].sort((a, b) => a.year - b.year);
      const filled = [];
      for (let y = startYear; y <= endYear; y++) {
        const found = sorted.find(d => d.year === y);
        filled.push({ year: y, count: found ? found.count : 0 });
      }

      let growthRate = 0;
      if (filled.length >= 2) {
        const prev = filled[filled.length - 2].count;
        const curr = filled[filled.length - 1].count;
        if (prev > 0) growthRate = ((curr - prev) / prev) * 100;
        else if (curr > 0) growthRate = 100;
      }

      let avgGrowth = 0;
      let growthPairs = 0;
      for (let i = 1; i < filled.length; i++) {
        if (filled[i - 1].count > 0) {
          avgGrowth += ((filled[i].count - filled[i - 1].count) / filled[i - 1].count) * 100;
          growthPairs++;
        }
      }
      if (growthPairs > 0) avgGrowth /= growthPairs;

      return {
        ...item,
        yearlyData: filled,
        growthRate: Number(growthRate.toFixed(1)),
        avgGrowthRate: Number(avgGrowth.toFixed(1)),
        isEmerging: growthRate > 50 || avgGrowth > 30,
      };
    });

    trends.sort((a, b) => {
      if (a.isEmerging !== b.isEmerging) return a.isEmerging ? -1 : 1;
      return b.growthRate - a.growthRate;
    });

    res.status(200).json({
      success: true,
      source: 'local',
      startYear,
      endYear,
      trends: trends.slice(0, limit),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Insight 3.3: Top Influencers & Affiliations
 * Khi có keyword: gọi OpenAlex → thống kê institutions/authors từ papers live
 * Khi không có keyword: aggregate từ local DB
 */
const getInsightTopAffiliations = async (req, res, next) => {
  try {
    const currentYear = new Date().getFullYear();
    const startYear = parseInt(req.query.startYear, 10) || 2015;
    const endYear = parseInt(req.query.endYear, 10) || currentYear;
    const limit = parseLimit(req.query.limit, 10, 50);
    const keyword = (req.query.keyword || '').trim();

    // ── OpenAlex live search ──
    if (keyword) {
      const dataset = await academicApiService.getInsightDataset('openalex', keyword, {
        startYear,
        endYear,
        maxPapers: 200,
      });
      const papers = dataset.papers;

      // Thống kê tổ chức (Affiliation) và tác giả dẫn đầu từ authorships của OpenAlex
      const affMap = {};
      const authorMap = {};

      for (const paper of papers) {
        const paperId = paper.id || paper.title;

        for (const author of paper.authors || []) {
          const authorName = (author.name || '').trim();
          if (!authorName) continue;

          const authorKey = authorName.toLowerCase();
          if (!authorMap[authorKey]) {
            authorMap[authorKey] = { name: authorName, papers: new Set(), affiliation: null };
          }
          authorMap[authorKey].papers.add(paperId);

          for (const institution of author.institutions || []) {
            const affName = (institution.name || '').trim();
            if (!affName) continue;

            const affKey = affName.toLowerCase();
            if (!affMap[affKey]) {
              affMap[affKey] = {
                affiliation: affName,
                country: institution.country || null,
                papers: new Set(),
                authors: new Set(),
              };
            }
            affMap[affKey].papers.add(paperId);
            affMap[affKey].authors.add(authorName);

            if (!authorMap[authorKey].affiliation) {
              authorMap[authorKey].affiliation = affName;
            }
          }
        }
      }

      const affiliations = Object.values(affMap)
        .map(a => ({
          affiliation: a.affiliation,
          country: a.country,
          paperCount: a.papers.size,
          authorCount: a.authors.size,
          topAuthors: Array.from(a.authors).slice(0, 5),
        }))
        .sort((a, b) => b.paperCount - a.paperCount)
        .slice(0, limit);

      const authors = Object.values(authorMap)
        .map(a => ({
          name: a.name,
          paperCount: a.papers.size,
          affiliation: a.affiliation || '',
        }))
        .filter(a => a.paperCount >= 1)
        .sort((a, b) => b.paperCount - a.paperCount)
        .slice(0, limit);

      return res.status(200).json({
        success: true,
        source: 'openalex',
        keyword,
        startYear,
        endYear,
        affiliations,
        authors,
      });
    }

    // ── Local DB fallback ──
    const affiliationPipeline = [
      { $match: { publicationYear: { $gte: startYear, $lte: endYear } } },
      { $unwind: '$authors' },
      { $unwind: { path: '$authors.affiliations', preserveNullAndEmptyArrays: false } },
      { $group: { _id: { $toLower: { $trim: { input: '$authors.affiliations' } } }, paperCount: { $addToSet: '$_id' }, authorNames: { $addToSet: '$authors.name' } } },
      { $project: { _id: 0, affiliation: '$_id', paperCount: { $size: '$paperCount' }, authorCount: { $size: '$authorNames' }, topAuthors: { $slice: ['$authorNames', 5] } } },
      { $match: { affiliation: { $ne: '' } } },
      { $sort: { paperCount: -1 } },
      { $limit: limit },
    ];

    const authorPipeline = [
      { $match: { publicationYear: { $gte: startYear, $lte: endYear } } },
      { $unwind: '$authors' },
      { $group: { _id: { $toLower: { $trim: { input: '$authors.name' } } }, displayName: { $first: '$authors.name' }, paperCount: { $addToSet: '$_id' }, affiliations: { $addToSet: { $arrayElemAt: ['$authors.affiliations', 0] } } } },
      { $project: { _id: 0, name: '$displayName', paperCount: { $size: '$paperCount' }, affiliation: { $arrayElemAt: ['$affiliations', 0] } } },
      { $match: { name: { $ne: '' }, paperCount: { $gte: 2 } } },
      { $sort: { paperCount: -1 } },
      { $limit: limit },
    ];

    const [affiliations, authors] = await Promise.all([
      Paper.aggregate(affiliationPipeline),
      Paper.aggregate(authorPipeline),
    ]);

    res.status(200).json({
      success: true,
      source: 'local',
      startYear,
      endYear,
      affiliations,
      authors,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTrendData,
  compareTrends,
  getResearchDirections,
  getEmergingTopics,
  getTrendingTopics,
  getTopicDetails,
  getKeywordCategories,
  getKeywordGraph,
  getAlgorithmDomains,
  getRelatedKeywordsTrend,
  getInsightTopTopics,
  getInsightEmergingTrends,
  getInsightTopAffiliations,
};
