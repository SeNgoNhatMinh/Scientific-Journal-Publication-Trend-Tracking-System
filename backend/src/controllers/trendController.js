const mongoose = require('mongoose');
const academicApiService = require('../services/academicApiService');
const Topic = require('../models/Topic');
const AnalysisRun = require('../models/AnalysisRun');
const Keyword = require('../models/Keyword');
const Paper = require('../models/Paper');

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
    } else if (normalizedSource === 'openalex') {
      // Fetch from OpenAlex API
      const result = await academicApiService.getRelatedKeywordsTrend('openalex', keyword, startYearNum);
      papers = result.papers || [];
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

module.exports = {
  getTrendData,
  compareTrends,
  getEmergingTopics,
  getTrendingTopics,
  getTopicDetails,
  getKeywordCategories,
  getKeywordGraph,
  getAlgorithmDomains,
  getRelatedKeywordsTrend,
};

