const workspaceService = require('../services/workspaceService');
const paperPdfService = require('../services/paperPdfService');

const createWorkspace = async (req, res, next) => {
  try {
    const workspace = await workspaceService.createWorkspace(req.user.id, req.body);
    res.status(201).json({
      success: true,
      message: 'Workspace created successfully',
      workspace,
    });
  } catch (error) {
    next(error);
  }
};

const listWorkspaces = async (req, res, next) => {
  try {
    const result = await workspaceService.listWorkspaces(req.user.id, req.query);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

const getWorkspace = async (req, res, next) => {
  try {
    const result = await workspaceService.getWorkspaceById(req.params.workspaceId, req.user.id);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

const deleteWorkspace = async (req, res, next) => {
  try {
    const result = await workspaceService.deleteWorkspace(req.params.workspaceId, req.user.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const addMember = async (req, res, next) => {
  try {
    const member = await workspaceService.addMember(req.params.workspaceId, req.user.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Workspace invitation sent successfully',
      member,
    });
  } catch (error) {
    next(error);
  }
};

const joinWorkspace = async (req, res, next) => {
  try {
    const result = await workspaceService.joinWorkspace(req.params.workspaceId, req.user.id, req.body.token);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const listMembers = async (req, res, next) => {
  try {
    const members = await workspaceService.listMembers(req.params.workspaceId, req.user.id);
    res.status(200).json({ success: true, members });
  } catch (error) {
    next(error);
  }
};

const removeMember = async (req, res, next) => {
  try {
    const result = await workspaceService.removeMember(req.params.workspaceId, req.user.id, req.params.userId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const leaveWorkspace = async (req, res, next) => {
  try {
    const result = await workspaceService.leaveWorkspace(req.params.workspaceId, req.user.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const addPaper = async (req, res, next) => {
  try {
    const workspacePaper = await workspaceService.addPaper(
      req.params.workspaceId,
      req.user.id,
      req.body
    );
    res.status(201).json({
      success: true,
      message: 'Paper added to workspace',
      workspacePaper,
    });
  } catch (error) {
    next(error);
  }
};

const listPapers = async (req, res, next) => {
  try {
    const result = await workspaceService.listPapers(
      req.params.workspaceId,
      req.user.id,
      req.query
    );
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};



const createNote = async (req, res, next) => {
  try {
    const note = await workspaceService.createNote(req.params.workspaceId, req.user.id, req.body);
    res.status(201).json({
      success: true,
      message: 'Workspace note created successfully',
      note,
    });
  } catch (error) {
    next(error);
  }
};

const listNotes = async (req, res, next) => {
  try {
    const result = await workspaceService.listNotes(
      req.params.workspaceId,
      req.user.id,
      req.query
    );
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

const createAlert = async (req, res, next) => {
  try {
    const alert = await workspaceService.createAlert(req.params.workspaceId, req.user.id, req.body);
    res.status(201).json({
      success: true,
      message: 'Workspace alert saved successfully',
      alert,
    });
  } catch (error) {
    next(error);
  }
};

const listAlerts = async (req, res, next) => {
  try {
    const alerts = await workspaceService.listAlerts(req.params.workspaceId, req.user.id);
    res.status(200).json({ success: true, alerts });
  } catch (error) {
    next(error);
  }
};

const deleteAlert = async (req, res, next) => {
  try {
    const result = await workspaceService.deleteAlert(req.params.workspaceId, req.user.id, req.params.alertId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const updateAlert = async (req, res, next) => {
  try {
    const alert = await workspaceService.updateAlert(req.params.workspaceId, req.user.id, req.params.alertId, req.body);
    res.status(200).json({ success: true, alert });
  } catch (error) {
    next(error);
  }
};

const getTrends = async (req, res, next) => {
  try {
    const trends = await workspaceService.getTrends(
      req.params.workspaceId,
      req.user.id,
      req.query
    );
    res.status(200).json({
      success: true,
      source: 'workspace',
      workspaceId: req.params.workspaceId,
      ...trends,
    });
  } catch (error) {
    next(error);
  }
};

const getKeywordGraph = async (req, res, next) => {
  try {
    const graph = await workspaceService.getKeywordGraph(
      req.params.workspaceId,
      req.user.id,
      req.query
    );
    res.status(200).json({
      success: true,
      source: 'workspace',
      workspaceId: req.params.workspaceId,
      ...graph,
    });
  } catch (error) {
    next(error);
  }
};

const uploadPaperPdf = async (req, res, next) => {
  try {
    const { workspaceId, paperId } = req.params;
    await workspaceService.assertPaperInWorkspace(workspaceId, req.user.id, paperId, 'editor');
    const result = await paperPdfService.uploadPaperPdf({
      paperId,
      userId: req.user.id,
      file: req.file,
    });

    res.status(200).json({
      success: true,
      message: 'Workspace paper PDF uploaded successfully',
      workspaceId,
      paperId: result.paper._id,
      pdfUrl: result.pdfUrl,
      uploadedPdf: result.uploadedPdf,
      fullTextExtracted: result.fullTextExtracted,
      fullTextLength: result.fullTextLength,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createWorkspace,
  listWorkspaces,
  getWorkspace,
  addMember,
  joinWorkspace,
  listMembers,
  removeMember,
  leaveWorkspace,
  addPaper,
  listPapers,
  createNote,
  listNotes,
  createAlert,
  listAlerts,
  deleteAlert,
  updateAlert,
  getTrends,
  getKeywordGraph,
  uploadPaperPdf,
  deleteWorkspace,
};
