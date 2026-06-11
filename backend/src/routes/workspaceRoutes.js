const express = require('express');
const workspaceController = require('../controllers/workspaceController');
const { protect } = require('../middlewares/auth');
const { uploadPdf } = require('../middlewares/pdfUpload');

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * /workspaces:
 *   post:
 *     tags: [Workspaces]
 *     summary: Tạo Research Workspace
 *     security:
 *       - bearerAuth: []
 */
router.post('/', workspaceController.createWorkspace);

/**
 * @swagger
 * /workspaces:
 *   get:
 *     tags: [Workspaces]
 *     summary: Danh sách workspace của user hiện tại
 *     security:
 *       - bearerAuth: []
 */
router.get('/', workspaceController.listWorkspaces);

/**
 * @swagger
 * /workspaces/{workspaceId}:
 *   get:
 *     tags: [Workspaces]
 *     summary: Chi tiết workspace kèm thống kê
 *     security:
 *       - bearerAuth: []
 */
router.get('/:workspaceId', workspaceController.getWorkspace);

/**
 * @swagger
 * /workspaces/{workspaceId}/members:
 *   post:
 *     tags: [Workspaces]
 *     summary: Thêm hoặc cập nhật thành viên workspace
 *     security:
 *       - bearerAuth: []
 */
router.post('/:workspaceId/members', workspaceController.addMember);

/**
 * @swagger
 * /workspaces/{workspaceId}/papers:
 *   post:
 *     tags: [Workspaces]
 *     summary: Thêm paper vào workspace
 *     security:
 *       - bearerAuth: []
 */
router.post('/:workspaceId/papers', workspaceController.addPaper);

/**
 * @swagger
 * /workspaces/{workspaceId}/papers:
 *   get:
 *     tags: [Workspaces]
 *     summary: Danh sách paper trong workspace
 *     security:
 *       - bearerAuth: []
 */
router.get('/:workspaceId/papers', workspaceController.listPapers);

/**
 * @swagger
 * /workspaces/{workspaceId}/papers/{paperId}/pdf:
 *   post:
 *     tags: [Workspaces]
 *     summary: Upload PDF cho paper trong workspace
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/:workspaceId/papers/:paperId/pdf',
  uploadPdf.single('pdf'),
  workspaceController.uploadPaperPdf
);

/**
 * @swagger
 * /workspaces/{workspaceId}/corpus/runs:
 *   post:
 *     tags: [Workspaces]
 *     summary: Tạo corpus run trong workspace
 *     security:
 *       - bearerAuth: []
 */
router.post('/:workspaceId/corpus/runs', workspaceController.createCorpusRun);

/**
 * @swagger
 * /workspaces/{workspaceId}/notes:
 *   post:
 *     tags: [Workspaces]
 *     summary: Thêm note nghiên cứu vào workspace
 *     security:
 *       - bearerAuth: []
 */
router.post('/:workspaceId/notes', workspaceController.createNote);

/**
 * @swagger
 * /workspaces/{workspaceId}/notes:
 *   get:
 *     tags: [Workspaces]
 *     summary: Danh sách note trong workspace
 *     security:
 *       - bearerAuth: []
 */
router.get('/:workspaceId/notes', workspaceController.listNotes);

/**
 * @swagger
 * /workspaces/{workspaceId}/alerts:
 *   post:
 *     tags: [Workspaces]
 *     summary: Tạo mobile/research alert cho keyword trong workspace
 *     security:
 *       - bearerAuth: []
 */
router.post('/:workspaceId/alerts', workspaceController.createAlert);

/**
 * @swagger
 * /workspaces/{workspaceId}/alerts:
 *   get:
 *     tags: [Workspaces]
 *     summary: Danh sách alert trong workspace
 *     security:
 *       - bearerAuth: []
 */
router.get('/:workspaceId/alerts', workspaceController.listAlerts);

/**
 * @swagger
 * /workspaces/{workspaceId}/trends:
 *   get:
 *     tags: [Workspaces]
 *     summary: Trend riêng của workspace
 *     security:
 *       - bearerAuth: []
 */
router.get('/:workspaceId/trends', workspaceController.getTrends);

/**
 * @swagger
 * /workspaces/{workspaceId}/keyword-graph:
 *   get:
 *     tags: [Workspaces]
 *     summary: Keyword graph riêng của workspace
 *     security:
 *       - bearerAuth: []
 */
router.get('/:workspaceId/keyword-graph', workspaceController.getKeywordGraph);

module.exports = router;
