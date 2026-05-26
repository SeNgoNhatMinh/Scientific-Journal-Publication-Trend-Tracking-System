const corpusService = require('../services/corpusService');
const User = require('../models/User');
const AnalysisRun = require('../models/AnalysisRun');

const createRun = async (req, res, next) => {
  try {
    const { seedKeyword, source, startYear, endYear, maxPages, perPage } = req.body;

    const run = await corpusService.createRun({
      seedKeyword,
      source,
      startYear,
      endYear,
      maxPages,
      perPage,
      createdBy: req.user?.id || null,
    });

    res.status(202).json({
      success: true,
      message: 'Corpus ingestion started. Poll GET /corpus/runs/:id for status.',
      run,
    });
  } catch (error) {
    next(error);
  }
};

const listRuns = async (req, res, next) => {
  try {
    const result = await corpusService.listRuns(req.query);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

const getRun = async (req, res, next) => {
  try {
    const run = await corpusService.getRunById(req.params.runId);
    if (!run) {
      return res.status(404).json({ success: false, message: 'Analysis run not found' });
    }
    res.status(200).json({ success: true, run });
  } catch (error) {
    next(error);
  }
};

const getRunPapers = async (req, res, next) => {
  try {
    const run = await AnalysisRun.findById(req.params.runId);
    if (!run) {
      return res.status(404).json({ success: false, message: 'Analysis run not found' });
    }
    const result = await corpusService.getRunPapers(req.params.runId, req.query);
    res.status(200).json({ success: true, runId: run._id, seedKeyword: run.seedKeyword, ...result });
  } catch (error) {
    next(error);
  }
};

const followRun = async (req, res, next) => {
  try {
    const run = await AnalysisRun.findById(req.params.runId);
    if (!run) {
      return res.status(404).json({ success: false, message: 'Analysis run not found' });
    }

    const user = await User.findById(req.user.id);
    const already = user.trackedRuns.some(
      entry => String(entry.analysisRunId) === String(run._id)
    );
    if (!already) {
      user.trackedRuns.push({
        analysisRunId: run._id,
        notifyEnabled: req.body?.notifyEnabled !== false,
        followedAt: new Date(),
      });
    }
    await user.save();

    res.status(200).json({
      success: true,
      message: already ? 'Already tracking this corpus run' : 'Now tracking this corpus run',
      trackedRuns: user.trackedRuns,
    });
  } catch (error) {
    next(error);
  }
};

const getMyTrackedRuns = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'trackedRuns.analysisRunId',
      select:
        'seedKeyword status paperCount trendStatus isEmerging averageGrowthRate startYear endYear completedAt',
    });

    res.status(200).json({
      success: true,
      trackedRuns: user?.trackedRuns || [],
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRun,
  listRuns,
  getRun,
  getRunPapers,
  followRun,
  getMyTrackedRuns,
};
