const mongoose = require('mongoose');
const Workspace = require('../models/Workspace');
const WorkspaceMember = require('../models/WorkspaceMember');
const WorkspacePaper = require('../models/WorkspacePaper');
const WorkspaceCorpus = require('../models/WorkspaceCorpus');
const WorkspaceNote = require('../models/WorkspaceNote');
const WorkspaceAlert = require('../models/WorkspaceAlert');
const User = require('../models/User');
const Paper = require('../models/Paper');
const Keyword = require('../models/Keyword');
const corpusService = require('./corpusService');

const roleRank = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

const parseLimit = (value, fallback = 20, max = 100) =>
  Math.min(Math.max(parseInt(value, 10) || fallback, 1), max);

const normalizeText = value =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const normalizeTags = tags =>
  Array.isArray(tags)
    ? Array.from(new Set(tags.map(tag => normalizeText(tag)).filter(Boolean))).slice(0, 20)
    : [];

const createError = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const ensureObjectId = (value, name = 'id') => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw createError(`Invalid ${name}`, 400);
  }
};

const getMembership = async (workspaceId, userId) => {
  ensureObjectId(workspaceId, 'workspaceId');

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace || workspace.isArchived) {
    throw createError('Workspace not found', 404);
  }

  if (String(workspace.owner) === String(userId)) {
    return { workspace, role: 'owner' };
  }

  const member = await WorkspaceMember.findOne({ workspaceId, userId });
  if (!member) {
    throw createError('You do not have access to this workspace', 403);
  }

  return { workspace, role: member.role };
};

const assertWorkspaceRole = async (workspaceId, userId, requiredRole = 'viewer') => {
  const membership = await getMembership(workspaceId, userId);
  if (roleRank[membership.role] < roleRank[requiredRole]) {
    throw createError('Insufficient workspace permission', 403);
  }
  return membership;
};

const createWorkspace = async (userId, { name, description, visibility = 'private', plan = 'free' }) => {
  if (!name?.trim()) throw createError('Workspace name is required', 400);

  const workspace = await Workspace.create({
    name: name.trim(),
    description,
    visibility,
    plan,
    owner: userId,
  });

  await WorkspaceMember.create({
    workspaceId: workspace._id,
    userId,
    role: 'owner',
    invitedBy: userId,
  });

  return workspace;
};

const listWorkspaces = async (userId, { page = 1, limit = 20 } = {}) => {
  const safeLimit = parseLimit(limit, 20, 100);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const memberships = await WorkspaceMember.find({ userId }).select('workspaceId role');
  const workspaceIds = memberships.map(member => member.workspaceId);
  const roleByWorkspace = new Map(
    memberships.map(member => [String(member.workspaceId), member.role])
  );

  const filter = {
    _id: { $in: workspaceIds },
    isArchived: false,
  };

  const [workspaces, total] = await Promise.all([
    Workspace.find(filter)
      .sort({ updatedAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
    Workspace.countDocuments(filter),
  ]);

  return {
    workspaces: workspaces.map(workspace => ({
      ...workspace,
      role: roleByWorkspace.get(String(workspace._id)) || 'viewer',
    })),
    total,
    page: safePage,
    limit: safeLimit,
  };
};

const getWorkspaceById = async (workspaceId, userId) => {
  const { workspace, role } = await assertWorkspaceRole(workspaceId, userId, 'viewer');

  const [membersCount, papersCount, corpusCount, notesCount] = await Promise.all([
    WorkspaceMember.countDocuments({ workspaceId }),
    WorkspacePaper.countDocuments({ workspaceId }),
    WorkspaceCorpus.countDocuments({ workspaceId }),
    WorkspaceNote.countDocuments({ workspaceId }),
  ]);

  return {
    workspace,
    role,
    stats: {
      membersCount,
      papersCount,
      corpusCount,
      notesCount,
    },
  };
};

const addMember = async (workspaceId, userId, { userId: targetUserId, email, role = 'viewer' }) => {
  await assertWorkspaceRole(workspaceId, userId, 'owner');

  if (!['owner', 'editor', 'viewer'].includes(role)) {
    throw createError('Invalid workspace role', 400);
  }

  const targetUser = targetUserId
    ? await User.findById(targetUserId)
    : await User.findOne({ email: normalizeText(email) });
  if (!targetUser) {
    throw createError('User not found', 404);
  }

  const member = await WorkspaceMember.findOneAndUpdate(
    { workspaceId, userId: targetUser._id },
    {
      workspaceId,
      userId: targetUser._id,
      role,
      invitedBy: userId,
      joinedAt: new Date(),
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).populate('userId', 'name email role institution');

  return member;
};

const findOrCreatePaper = async paperInput => {
  if (!paperInput || typeof paperInput !== 'object') {
    throw createError('paperId or paper object is required', 400);
  }
  if (!paperInput.title?.trim()) {
    throw createError('paper.title is required', 400);
  }
  if (!paperInput.source) {
    throw createError('paper.source is required', 400);
  }

  const or = [];
  if (paperInput.doi) or.push({ doi: paperInput.doi });
  for (const [source, externalId] of Object.entries(paperInput.externalIds || {})) {
    if (externalId) or.push({ [`externalIds.${source}`]: externalId });
  }

  const existing = or.length ? await Paper.findOne({ $or: or }) : null;
  if (existing) return existing;

  return Paper.create(paperInput);
};

const addPaper = async (workspaceId, userId, { paperId, paper, tags, note, source = 'manual' }) => {
  await assertWorkspaceRole(workspaceId, userId, 'editor');

  let paperDoc;
  if (paperId) {
    ensureObjectId(paperId, 'paperId');
    paperDoc = await Paper.findById(paperId);
    if (!paperDoc) throw createError('Paper not found', 404);
  } else {
    paperDoc = await findOrCreatePaper(paper);
  }

  const update = {
    $setOnInsert: {
      workspaceId,
      paperId: paperDoc._id,
      addedBy: userId,
      source,
    },
  };
  const set = {};
  if (Array.isArray(tags)) set.tags = normalizeTags(tags);
  if (typeof note === 'string') set.note = note;
  if (Object.keys(set).length) update.$set = set;

  const workspacePaper = await WorkspacePaper.findOneAndUpdate(
    { workspaceId, paperId: paperDoc._id },
    update,
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).populate('paperId', 'title abstract publicationYear citationCount journalName doi source url keywords keywordIds');

  return workspacePaper;
};

const listPapers = async (workspaceId, userId, { page = 1, limit = 20, tag } = {}) => {
  await assertWorkspaceRole(workspaceId, userId, 'viewer');
  const safeLimit = parseLimit(limit, 20, 100);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const filter = { workspaceId };
  if (tag) filter.tags = normalizeText(tag);

  const [papers, total] = await Promise.all([
    WorkspacePaper.find(filter)
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .populate('paperId', 'title abstract publicationYear citationCount journalName doi source url keywords keywordIds')
      .populate('addedBy', 'name email'),
    WorkspacePaper.countDocuments(filter),
  ]);

  return { papers, total, page: safePage, limit: safeLimit };
};

const createCorpusRun = async (
  workspaceId,
  userId,
  { seedKeyword, source, startYear, endYear, maxPages, perPage }
) => {
  await assertWorkspaceRole(workspaceId, userId, 'editor');

  const run = await corpusService.createRun({
    seedKeyword,
    source,
    startYear,
    endYear,
    maxPages,
    perPage,
    createdBy: userId,
  });

  const workspaceCorpus = await WorkspaceCorpus.create({
    workspaceId,
    analysisRunId: run._id,
    seedKeyword: run.seedKeyword,
    createdBy: userId,
  });

  return { run, workspaceCorpus };
};

const createNote = async (workspaceId, userId, { paperId, title, content, tags }) => {
  await assertWorkspaceRole(workspaceId, userId, 'editor');
  if (!content?.trim()) throw createError('Note content is required', 400);
  if (paperId) {
    ensureObjectId(paperId, 'paperId');
    const paperExists = await Paper.exists({ _id: paperId });
    if (!paperExists) throw createError('Paper not found', 404);
  }

  return WorkspaceNote.create({
    workspaceId,
    paperId: paperId || null,
    title,
    content,
    tags: normalizeTags(tags),
    createdBy: userId,
  });
};

const listNotes = async (workspaceId, userId, { page = 1, limit = 20 } = {}) => {
  await assertWorkspaceRole(workspaceId, userId, 'viewer');
  const safeLimit = parseLimit(limit, 20, 100);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const [notes, total] = await Promise.all([
    WorkspaceNote.find({ workspaceId })
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .populate('paperId', 'title publicationYear doi')
      .populate('createdBy', 'name email'),
    WorkspaceNote.countDocuments({ workspaceId }),
  ]);
  return { notes, total, page: safePage, limit: safeLimit };
};

const createAlert = async (workspaceId, userId, { keyword, type = 'keyword', notifyEnabled = true }) => {
  await assertWorkspaceRole(workspaceId, userId, 'editor');
  if (!keyword?.trim()) throw createError('keyword is required', 400);

  return WorkspaceAlert.findOneAndUpdate(
    { workspaceId, keyword: normalizeText(keyword), type },
    {
      workspaceId,
      keyword: normalizeText(keyword),
      type,
      notifyEnabled,
      createdBy: userId,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

const listAlerts = async (workspaceId, userId) => {
  await assertWorkspaceRole(workspaceId, userId, 'viewer');
  return WorkspaceAlert.find({ workspaceId }).sort({ createdAt: -1 });
};

const getWorkspacePaperFilter = async workspaceId => {
  const [workspacePapers, workspaceCorpusRuns] = await Promise.all([
    WorkspacePaper.find({ workspaceId }).select('paperId'),
    WorkspaceCorpus.find({ workspaceId }).select('analysisRunId'),
  ]);

  const paperIds = workspacePapers.map(entry => entry.paperId);
  const analysisRunIds = workspaceCorpusRuns.map(entry => entry.analysisRunId);
  const or = [];
  if (paperIds.length) or.push({ _id: { $in: paperIds } });
  if (analysisRunIds.length) or.push({ analysisRunId: { $in: analysisRunIds } });

  return { or, paperIds, analysisRunIds };
};

const assertPaperInWorkspace = async (workspaceId, userId, paperId, requiredRole = 'viewer') => {
  await assertWorkspaceRole(workspaceId, userId, requiredRole);
  ensureObjectId(paperId, 'paperId');

  const directPaper = await WorkspacePaper.exists({ workspaceId, paperId });
  if (directPaper) return true;

  const workspaceCorpusRuns = await WorkspaceCorpus.find({ workspaceId }).select('analysisRunId');
  const analysisRunIds = workspaceCorpusRuns.map(entry => entry.analysisRunId);
  if (analysisRunIds.length) {
    const corpusPaper = await Paper.exists({
      _id: paperId,
      analysisRunId: { $in: analysisRunIds },
    });
    if (corpusPaper) return true;
  }

  throw createError('Paper is not part of this workspace', 404);
};

const loadWorkspaceKeywordSets = async (workspaceId, paperLimit = 500) => {
  const { or } = await getWorkspacePaperFilter(workspaceId);
  if (!or.length) return [];

  const papers = await Paper.find({
    $or: or,
    $and: [
      {
        $or: [
          { keywordIds: { $exists: true, $ne: [] } },
          { keywords: { $exists: true, $ne: [] } },
        ],
      },
    ],
  })
    .sort({ citationCount: -1, publishedDate: -1 })
    .limit(paperLimit)
    .select('keywordIds keywords citationCount publishedDate publicationYear');

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
      else keywordTexts.add(normalizeText(value));
    }
  }

  const lookup = [];
  if (keywordIds.size) {
    lookup.push({ _id: { $in: Array.from(keywordIds).map(id => new mongoose.Types.ObjectId(id)) } });
  }
  if (keywordTexts.size) {
    lookup.push({ normalizedText: { $in: Array.from(keywordTexts) } });
  }

  const keywords = lookup.length
    ? await Keyword.find({ $or: lookup }).select('name normalizedText category paperCount growthRate trendScore')
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
      else addKeyword(byText.get(normalizeText(value)));
    }

    return docs;
  });
};

const getTrends = async (workspaceId, userId, { limit = 20 } = {}) => {
  await assertWorkspaceRole(workspaceId, userId, 'viewer');
  const safeLimit = parseLimit(limit, 20, 100);
  const { or } = await getWorkspacePaperFilter(workspaceId);

  if (!or.length) {
    return {
      paperCount: 0,
      yearlyData: [],
      byCategory: {},
      topKeywords: [],
      topAlgorithms: [],
      topDomains: [],
      topApplications: [],
    };
  }

  const [yearlyData, keywordSets, paperCount] = await Promise.all([
    Paper.aggregate([
      { $match: { $or: or, publicationYear: { $ne: null } } },
      { $group: { _id: '$publicationYear', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, year: '$_id', count: 1 } },
    ]),
    loadWorkspaceKeywordSets(workspaceId, 1000),
    Paper.countDocuments({ $or: or }),
  ]);

  const keywordMap = new Map();
  const byCategory = {};
  for (const keywords of keywordSets) {
    for (const keyword of keywords) {
      const id = String(keyword._id);
      const entry = keywordMap.get(id) || {
        keywordId: keyword._id,
        name: keyword.name || keyword.normalizedText,
        category: keyword.category || 'general',
        paperCount: 0,
        growthRate: keyword.growthRate || 0,
        trendScore: keyword.trendScore || 0,
      };
      entry.paperCount += 1;
      keywordMap.set(id, entry);
      byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
    }
  }

  const topKeywords = Array.from(keywordMap.values())
    .sort((a, b) => b.paperCount - a.paperCount || a.name.localeCompare(b.name))
    .slice(0, safeLimit);

  const byType = category =>
    topKeywords.filter(keyword => keyword.category === category).slice(0, safeLimit);

  return {
    paperCount,
    yearlyData,
    byCategory,
    topKeywords,
    topAlgorithms: byType('algorithm'),
    topDomains: byType('domain'),
    topApplications: byType('application'),
  };
};

const getKeywordGraph = async (workspaceId, userId, { limit = 50, paperLimit = 500 } = {}) => {
  await assertWorkspaceRole(workspaceId, userId, 'viewer');
  const safeLimit = parseLimit(limit, 50, 150);
  const safePaperLimit = parseLimit(paperLimit, 500, 1500);
  const keywordSets = await loadWorkspaceKeywordSets(workspaceId, safePaperLimit);
  const nodeMap = new Map();
  const edgeMap = new Map();

  for (const keywords of keywordSets) {
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
      .slice(0, safeLimit)
      .map(node => node.id)
  );
  const nodes = Array.from(nodeMap.values()).filter(node => topNodeIds.has(node.id));
  const edges = Array.from(edgeMap.values())
    .filter(edge => topNodeIds.has(edge.source) && topNodeIds.has(edge.target))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, safeLimit * 2);

  return {
    nodes,
    edges,
    meta: {
      paperCount: keywordSets.length,
      nodeCount: nodes.length,
      edgeCount: edges.length,
    },
  };
};

module.exports = {
  createWorkspace,
  listWorkspaces,
  getWorkspaceById,
  addMember,
  addPaper,
  listPapers,
  createCorpusRun,
  createNote,
  listNotes,
  createAlert,
  listAlerts,
  getTrends,
  getKeywordGraph,
  assertWorkspaceRole,
  assertPaperInWorkspace,
};
