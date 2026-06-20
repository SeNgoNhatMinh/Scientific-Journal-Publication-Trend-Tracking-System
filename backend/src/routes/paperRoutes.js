const express = require('express');
const paperController = require('../controllers/paperController');
const authMiddleware = require('../middlewares/auth');
const { uploadPdf } = require('../middlewares/pdfUpload');

const router = express.Router();

/**
 * @swagger
 * /papers/search:
 *   get:
 *     tags:
 *       - Papers
 *     security: []
 *     summary: Tìm kiếm bài báo đã lưu trong database
 *     description: Search locally saved papers from MongoDB. Use /sources/search for live external search.
 *     parameters:
 *       - in: query
 *         name: keyword
 *         required: true
 *         schema:
 *           type: string
 *         description: Search keyword
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [openalex, semantic_scholar, crossref, arxiv, ieee, exa]
 *         description: Optional local database source filter
 *       - in: query
 *         name: analysisRunId
 *         schema:
 *           type: string
 *         description: Optional corpus run filter
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [relevance, citations, newest, oldest]
 *           default: relevance
 *     responses:
 *       200:
 *         description: Papers found
 *       400:
 *         description: Missing required parameters
 */
router.get('/search', paperController.searchPapers);

/**
 * @swagger
 * /papers/bookmarks:
 *   get:
 *     tags:
 *       - Papers
 *     summary: Lấy danh sách bài báo đã lưu
 *     description: Retrieve all bookmarked papers for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Bookmarks retrieved
 *       401:
 *         description: Unauthorized
 */
router.get('/bookmarks', authMiddleware.protect, paperController.getUserBookmarks);

/**
 * @swagger
 * /papers/{paperId}/pdf:
 *   post:
 *     tags:
 *       - Papers
 *     summary: Upload file PDF cho một bài báo
 *     description: Uploads a research paper PDF, stores file metadata, updates pdfUrl, and tries to extract full text.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paperId
 *         required: true
 *         schema:
 *           type: string
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
 *         description: PDF uploaded
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Paper not found
 */
router.post(
  '/:paperId/pdf',
  authMiddleware.protect,
  uploadPdf.single('pdf'),
  paperController.uploadPaperPdf
);

/**
 * @swagger
 * /papers/{paperId}:
 *   get:
 *     tags:
 *       - Papers
 *     summary: Lấy chi tiết bài báo
 *     description: Retrieve detailed information about a specific paper
 *     parameters:
 *       - in: path
 *         name: paperId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paper details
 *       404:
 *         description: Paper not found
 */
router.get('/:paperId', paperController.getPaperDetails);

/**
 * @swagger
 * /papers:
 *   post:
 *     tags:
 *       - Papers
 *     summary: Lưu bài báo vào cơ sở dữ liệu
 *     description: Save a paper from external API to local database
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paper:
 *                 type: object
 *     responses:
 *       201:
 *         description: Paper saved successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/', authMiddleware.protect, paperController.savePaper);

/**
 * @swagger
 * /papers/{paperId}/bookmark:
 *   post:
 *     tags:
 *       - Papers
 *     summary: Đánh dấu bài báo yêu thích
 *     description: Add paper to user's bookmarks
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paperId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paper bookmarked
 *       404:
 *         description: Paper not found
 */
router.post('/:paperId/bookmark', authMiddleware.protect, paperController.bookmarkPaper);

module.exports = router;
