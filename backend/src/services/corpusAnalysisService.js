const Paper = require('../models/Paper');
const Topic = require('../models/Topic');
const AnalysisRun = require('../models/AnalysisRun');
const PublicationTrend = require('../models/PublicationTrend');
const authorKeywordService = require('./authorKeywordService');
const notificationService = require('./notificationService');

const attachGrowthRates = trends => {
  return trends.map((entry, index) => {
    if (index === 0) return { ...entry, growthRate: 0 };
    const prev = trends[index - 1].count || 0;
    const cur = entry.count || 0;
    const growthRate =
      prev > 0 ? Number((((cur - prev) / prev) * 100).toFixed(2)) : cur > 0 ? 100 : 0;
    return { ...entry, growthRate };
  });
};

const classifyTrendStatus = avgGrowth => {
  if (avgGrowth > 20) return 'exploding';
  if (avgGrowth > 10) return 'growing';
  if (avgGrowth < -5) return 'declining';
  return 'stable';
};

const computeEmergenceScore = (yearlyData, avgGrowth) => {
  if (!yearlyData.length) return 0;
  const recent = yearlyData.slice(-3);
  const older = yearlyData.slice(0, Math.max(0, yearlyData.length - 3));
  const recentAvg = recent.reduce((s, y) => s + y.count, 0) / (recent.length || 1);
  const olderAvg = older.length
    ? older.reduce((s, y) => s + y.count, 0) / older.length
    : recentAvg;
  const recencyBoost = olderAvg > 0 ? Math.min(1, recentAvg / olderAvg / 2) : 0.5;
  const growthNorm = Math.min(1, Math.max(0, avgGrowth / 50));
  return Number((0.5 * recencyBoost + 0.5 * growthNorm).toFixed(4));
};

/**
 * Aggregate papers in corpus by year; update AnalysisRun + Topic evidence.
 */
const analyzeRun = async runId => {
  const run = await AnalysisRun.findById(runId);
  if (!run) throw new Error('Analysis run not found');

  await AnalysisRun.findByIdAndUpdate(runId, { status: 'analyzing' });

  const counts = await Paper.aggregate([
    { $match: { analysisRunId: run._id, publicationYear: { $ne: null } } },
    { $group: { _id: '$publicationYear', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  const yearMap = new Map();
  for (let y = run.startYear; y <= run.endYear; y += 1) yearMap.set(y, 0);
  for (const row of counts) {
    if (row._id >= run.startYear && row._id <= run.endYear) {
      yearMap.set(row._id, row.count);
    }
  }

  const rawTrends = Array.from(yearMap.entries()).map(([year, count]) => ({ year, count }));
  const yearlyData = attachGrowthRates(rawTrends);

  const latest = yearlyData.slice(-5);
  const avgGrowth = latest.length
    ? latest.reduce((s, t) => s + (t.growthRate || 0), 0) / latest.length
    : 0;
  const trendStatus = classifyTrendStatus(avgGrowth);
  const emergenceScore = computeEmergenceScore(yearlyData, avgGrowth);
  const isEmerging = emergenceScore >= 0.55 && avgGrowth > 8 && run.paperCount >= 15;

  const topPaperIds = await Paper.find({ analysisRunId: runId })
    .sort({ citationCount: -1 })
    .limit(10)
    .select('_id');

  const topicName = run.seedKeyword.trim();
  let topic = await Topic.findOne({ analysisRunId: runId });
  const topicPayload = {
    name: topicName,
    seedKeyword: run.seedKeyword,
    analysisRunId: runId,
    description: `Corpus trend for "${run.seedKeyword}" (${run.startYear}-${run.endYear})`,
    relatedKeywords: [run.seedKeyword],
    paperCount: run.paperCount,
    trendStatus,
    growthRate: Number(avgGrowth.toFixed(2)),
    yearlyData,
    isEmerging,
    emergenceScore,
    papers: topPaperIds.map(p => p._id),
    lastAnalyzedAt: new Date(),
  };

  if (topic) {
    topic = await Topic.findByIdAndUpdate(topic._id, topicPayload, { new: true });
  } else {
    topic = await Topic.create(topicPayload);
  }

  const seedKeyword = await authorKeywordService.upsertKeyword(run.seedKeyword, run.source);

  const trendRows = [];
  for (let i = 0; i < yearlyData.length; i += 1) {
    const entry = yearlyData[i];
    const previousCount = i > 0 ? yearlyData[i - 1].count : null;
    const growthRate = entry.growthRate ?? null;
    const isTrending = (growthRate || 0) >= 20 && entry.count >= 5;

    trendRows.push({
      updateOne: {
        filter: {
          keywordId: seedKeyword._id,
          journalId: null,
          year: entry.year,
          month: null,
        },
        update: {
          $set: {
            keywordText: run.seedKeyword,
            analysisRunId: runId,
            paperCount: entry.count,
            previousCount,
            growthRate,
            isTrending,
            calculatedAt: new Date(),
          },
        },
        upsert: true,
      },
    });
  }
  if (trendRows.length) {
    await PublicationTrend.bulkWrite(trendRows);
  }

  const completed = await AnalysisRun.findByIdAndUpdate(
    runId,
    {
      status: 'completed',
      yearlyData,
      averageGrowthRate: Number(avgGrowth.toFixed(2)),
      trendStatus,
      emergenceScore,
      isEmerging,
      topicId: topic._id,
      keywordId: seedKeyword._id,
      completedAt: new Date(),
    },
    { new: true }
  );

  try {
    await notificationService.notifyCorpusComplete(completed);
    await notificationService.notifyTrendingIfEmerging(completed, seedKeyword._id);
  } catch (notifyErr) {
    console.error('[corpus] notification failed:', notifyErr.message);
  }

  return { run: completed, topic };
};

module.exports = {
  analyzeRun,
  attachGrowthRates,
  classifyTrendStatus,
};
