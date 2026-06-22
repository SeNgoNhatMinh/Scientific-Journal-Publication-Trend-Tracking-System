const axios = require('axios');
const envConfig = require('../config/env');
const Paper = require('../models/Paper');
const AnalysisRun = require('../models/AnalysisRun');
const SyncLog = require('../models/SyncLog');
const Journal = require('../models/Journal');
const authorKeywordService = require('./authorKeywordService');

const openAlexClient = axios.create({
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

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const decodeInvertedAbstract = inverted => {
  if (!inverted || typeof inverted !== 'object') return null;
  const positions = {};
  for (const [word, posList] of Object.entries(inverted)) {
    for (const p of posList) positions[p] = word;
  }
  return Object.keys(positions)
    .sort((a, b) => Number(a) - Number(b))
    .map(p => positions[p])
    .join(' ');
};

const mapOpenAlexWorkToPaper = (work, analysisRunId) => {
  const openalexId = work.id?.replace('https://openalex.org/', '') || work.id;
  const doi = work.doi?.replace('https://doi.org/', '') || null;

  return {
    title: work.title || 'Untitled',
    abstract: decodeInvertedAbstract(work.abstract_inverted_index),
    doi,
    publishedDate: work.publication_date ? new Date(work.publication_date) : null,
    publicationYear: work.publication_year || null,
    externalIds: { openalex: openalexId },
    authors: (work.authorships || []).slice(0, 15).map(a => ({
      name: a.author?.display_name || 'Unknown',
      affiliations: (a.institutions || []).map(i => i.display_name).filter(Boolean),
      externalId: a.author?.id,
    })),
    journalName: work.primary_location?.source?.display_name || null,
    citationCount: work.cited_by_count || 0,
    openAccessUrl: work.open_access?.oa_url || null,
    keywords: (work.keywords || []).map(k => k.display_name || k).filter(Boolean).slice(0, 15),
    source: 'openalex',
    url: work.doi || work.primary_location?.landing_page_url || work.id,
    analysisRunId,
    lastSyncedAt: new Date(),
    journalRaw: work.primary_location?.source || null,
  };
};

const upsertJournal = async (source) => {
  if (!source || !source.display_name) return null;
  
  const title = source.display_name;
  const openalexId = source.id ? source.id.replace('https://openalex.org/', '') : null;
  const issn = source.issn_l || null;

  try {
    let journal = null;
    if (openalexId) {
      journal = await Journal.findOne({ 'externalIds.openalex': openalexId });
    }
    if (!journal && title) {
      journal = await Journal.findOne({ title });
    }

    if (journal) {
      await Journal.findByIdAndUpdate(journal._id, { $inc: { paperCount: 1 } });
      return journal._id;
    }

    const newJournal = await Journal.create({
      title,
      issn,
      externalIds: { openalex: openalexId },
      source: 'openalex',
      paperCount: 1,
      lastSyncedAt: new Date()
    });
    return newJournal._id;
  } catch (err) {
    console.error(`[corpus] error upserting journal: ${err.message}`);
    return null;
  }
};

/**
 * Ingest OpenAlex works into Paper collection for an AnalysisRun.
 */
const ingestRun = async runId => {
  const run = await AnalysisRun.findById(runId);
  if (!run) throw new Error('Analysis run not found');

  if (run.source !== 'openalex') {
    throw new Error(`Corpus ingestion currently supports openalex only (requested: ${run.source})`);
  }

  const syncLog = await SyncLog.create({
    apiSource: run.source,
    analysisRunId: runId,
    seedKeyword: run.seedKeyword,
    status: 'running',
  });

  await AnalysisRun.findByIdAndUpdate(runId, {
    status: 'ingesting',
    startedAt: new Date(),
    errorMessage: null,
    syncLogId: syncLog._id,
  });

  let papersAdded = 0;
  let papersSkipped = 0;

  const yearFilter = `publication_year:${run.startYear}-${run.endYear}`;

  for (let page = 1; page <= run.maxPages; page += 1) {
    const currentRun = await AnalysisRun.findById(runId);
    if (!currentRun || currentRun.status !== 'ingesting') {
      console.log(`[corpus] run ${runId} was stopped or deleted. Aborting ingestion.`);
      break;
    }
    const { data } = await openAlexClient.get('/works', {
      params: withOpenAlexParams({
        filter: `default.search:${run.seedKeyword},type:article,${yearFilter}`,
        select:
          'id,doi,title,abstract_inverted_index,publication_year,publication_date,authorships,primary_location,keywords,cited_by_count,open_access',
        sort: 'cited_by_count:desc',
        per_page: run.perPage,
        page,
      }),
    });

    const results = data.results || [];
    if (results.length === 0) break;

    for (const work of results) {
      try {
        const openalexId = work.id?.replace('https://openalex.org/', '') || work.id;
        const exists = await Paper.findOne({
          analysisRunId: runId,
          'externalIds.openalex': openalexId,
        });

        if (exists) {
          papersSkipped += 1;
          continue;
        }

        const paperData = mapOpenAlexWorkToPaper(work, runId);
        paperData.authors = await authorKeywordService.upsertAuthors(paperData.authors);
        paperData.keywordIds = await authorKeywordService.linkPaperKeywords(paperData.keywords);
        
        if (paperData.journalRaw) {
          paperData.journal = await upsertJournal(paperData.journalRaw);
          delete paperData.journalRaw;
        }

        await Paper.create(paperData);
        papersAdded += 1;
      } catch (err) {
        if (err.code === 11000) {
          papersSkipped += 1;
        } else {
          console.error(`[corpus] skip paper: ${err.message}`);
          papersSkipped += 1;
        }
      }
    }

    if (page < run.maxPages) await sleep(1000);
  }

  const paperCount = await Paper.countDocuments({ analysisRunId: runId });

  await AnalysisRun.findByIdAndUpdate(runId, {
    papersAdded,
    papersSkipped,
    paperCount,
  });

  await SyncLog.findByIdAndUpdate(syncLog._id, {
    finishedAt: new Date(),
    papersAdded,
    papersSkipped,
    status: 'success',
  });

  return { papersAdded, papersSkipped, paperCount, syncLogId: syncLog._id };
};

module.exports = {
  ingestRun,
  mapOpenAlexWorkToPaper,
};
