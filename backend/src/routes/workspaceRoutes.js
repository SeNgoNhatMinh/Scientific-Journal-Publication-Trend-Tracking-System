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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: My Research Workspace
 *               description:
 *                 type: string
 *                 example: Workspace for tracking NLP trends
 *               visibility:
 *                 type: string
 *                 enum: [private, team, public]
 *                 default: private
 *               plan:
 *                 type: string
 *                 enum: [free, pro, team]
 *                 default: free
 *     responses:
 *       201:
 *         description: Workspace created
 *       401:
 *         description: Unauthorized
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
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *         description: Unauthorized
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
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Workspace not found
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
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Truyền userId hoặc email để xác định thành viên
 *             properties:
 *               userId:
 *                 type: string
 *               email:
 *                 type: string
 *                 example: member@example.com
 *               role:
 *                 type: string
 *                 enum: [owner, editor, viewer]
 *                 default: viewer
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Chỉ owner mới được thêm thành viên
 *       404:
 *         description: User not found
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
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Truyền paperId (paper đã có) HOẶC object paper mới
 *             properties:
 *               paperId:
 *                 type: string
 *               paper:
 *                 type: object
 *                 properties:
 *                   title: { type: string }
 *                   abstract: { type: string }
 *                   doi: { type: string }
 *                   source: { type: string, example: openalex }
 *               tags:
 *                 type: array
 *                 items: { type: string }
 *               note:
 *                 type: string
 *               source:
 *                 type: string
 *                 default: manual
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Cần quyền editor
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
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: tag
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *         description: Unauthorized
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
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: paperId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [pdf]
 *             properties:
 *               pdf:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *         description: Unauthorized
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
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [seedKeyword]
 *             properties:
 *               seedKeyword:
 *                 type: string
 *                 example: machine learning
 *               source:
 *                 type: string
 *                 example: openalex
 *               startYear:
 *                 type: integer
 *                 example: 2018
 *               endYear:
 *                 type: integer
 *                 example: 2024
 *               maxPages:
 *                 type: integer
 *                 example: 5
 *               perPage:
 *                 type: integer
 *                 example: 50
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Cần quyền editor
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
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               paperId:
 *                 type: string
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *                 example: Interesting finding about transformer scaling
 *               tags:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       201:
 *         description: Note created
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Cần quyền editor
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
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *         description: Unauthorized
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
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [keyword]
 *             properties:
 *               keyword:
 *                 type: string
 *                 example: large language models
 *               type:
 *                 type: string
 *                 default: keyword
 *               notifyEnabled:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Cần quyền editor
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
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *         description: Unauthorized
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
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *         description: Unauthorized
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
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: paperLimit
 *         schema: { type: integer, default: 500 }
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *         description: Unauthorized
 */
router.get('/:workspaceId/keyword-graph', workspaceController.getKeywordGraph);

module.exports = router;
