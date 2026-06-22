const AnalysisRun = require('../models/AnalysisRun');
const Paper = require('../models/Paper');
const SyncLog = require('../models/SyncLog');
const Topic = require('../models/Topic');
const PublicationTrend = require('../models/PublicationTrend');
const corpusIngestionService = require('./corpusIngestionService');
const corpusAnalysisService = require('./corpusAnalysisService');

const runningJobs = new Set();

const processRunAsync = async runId => {
  if (runningJobs.has(String(runId))) return;
  runningJobs.add(String(runId));

  try {
    await corpusIngestionService.ingestRun(runId);
    const checkRun = await AnalysisRun.findById(runId);
    if (checkRun && checkRun.status === 'ingesting') {
      await corpusAnalysisService.analyzeRun(runId);
    } else {
      console.log(`[corpus] run ${runId} is no longer in ingesting state. Skipping analysis.`);
    }
  } catch (err) {
    console.error(`[corpus] run ${runId} failed:`, err.message);
    const failedRun = await AnalysisRun.findByIdAndUpdate(
      runId,
      {
        status: 'failed',
        errorMessage: err.message,
        completedAt: new Date(),
      },
      { new: true }
    );
    if (failedRun?.syncLogId) {
      await SyncLog.findByIdAndUpdate(failedRun.syncLogId, {
        status: 'failed',
        errorMessage: err.message,
        finishedAt: new Date(),
      });
    }
  } finally {
    runningJobs.delete(String(runId));
  }
};

const createRun = async ({
  seedKeyword,
  source = 'openalex',
  startYear,
  endYear,
  maxPages = 4,
  perPage = 25,
  createdBy = null,
}) => {
  const currentYear = new Date().getFullYear();
  const start = parseInt(startYear, 10) || currentYear - 5;
  const end = parseInt(endYear, 10) || currentYear;

  if (!seedKeyword?.trim()) {
    throw new Error('seedKeyword is required');
  }
  if (start > end) {
    throw new Error('startYear must be <= endYear');
  }

  const run = await AnalysisRun.create({
    seedKeyword: seedKeyword.trim(),
    source,
    startYear: start,
    endYear: end,
    maxPages: Math.min(Math.max(parseInt(maxPages, 10) || 4, 1), 20),
    perPage: Math.min(Math.max(parseInt(perPage, 10) || 25, 10), 50),
    status: 'pending',
    createdBy,
  });

  setImmediate(() => processRunAsync(run._id));

  return run;
};

const listRuns = async ({ status, limit = 20, page = 1 } = {}) => {
  const filter = {};
  if (status) filter.status = status;

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const [runs, total] = await Promise.all([
    AnalysisRun.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit, 10)),
    AnalysisRun.countDocuments(filter),
  ]);

  return { runs, total, page: parseInt(page, 10), limit: parseInt(limit, 10) };
};

const getRunById = async runId => {
  const run = await AnalysisRun.findById(runId).populate('topicId');
  if (!run) return null;
  return run;
};

const getRunPapers = async (runId, { page = 1, limit = 20 } = {}) => {
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const filter = { analysisRunId: runId };
  const [papers, total] = await Promise.all([
    Paper.find(filter)
      .sort({ citationCount: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .select('title abstract publicationYear citationCount journalName doi url keywords'),
    Paper.countDocuments(filter),
  ]);
  return { papers, total, page: parseInt(page, 10), limit: parseInt(limit, 10) };
};

const stopRun = async runId => {
  const run = await AnalysisRun.findById(runId);
  if (!run) return null;

  if (run.status === 'ingesting' || run.status === 'analyzing' || run.status === 'pending') {
    run.status = 'failed';
    run.errorMessage = 'Stopped by administrator';
    run.completedAt = new Date();
    await run.save();

    if (run.syncLogId) {
      await SyncLog.findByIdAndUpdate(run.syncLogId, {
        status: 'failed',
        errorMessage: 'Stopped by administrator',
        finishedAt: new Date(),
      });
    }

    runningJobs.delete(String(runId));
  }

  return run;
};

const deleteRun = async runId => {
  const run = await AnalysisRun.findById(runId);
  if (!run) return null;

  // 1. Delete associated papers
  await Paper.deleteMany({ analysisRunId: runId });

  // 2. Delete associated topic
  await Topic.deleteMany({ analysisRunId: runId });

  // 3. Delete associated publication trends
  await PublicationTrend.deleteMany({ analysisRunId: runId });

  // 4. Delete associated sync log
  if (run.syncLogId) {
    await SyncLog.findByIdAndDelete(run.syncLogId);
  }

  // 5. Delete the run itself
  await AnalysisRun.findByIdAndDelete(runId);

  // 6. Clean up running job tracking set
  runningJobs.delete(String(runId));

  return run;
};

module.exports = {
  createRun,
  listRuns,
  getRunById,
  getRunPapers,
  processRunAsync,
  stopRun,
  deleteRun,
};
