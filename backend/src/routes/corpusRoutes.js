const express = require('express');
const corpusController = require('../controllers/corpusController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

/**
 * @swagger
 * /corpus/runs:
 *   post:
 *     tags: [Corpus]
 *     security: []
 *     summary: Bắt đầu theo dõi corpus theo từ khóa (thu thập + phân tích)
 *     description: Creates an AnalysisRun, ingests papers from OpenAlex in background, then computes yearly trends and Topic evidence.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [seedKeyword]
 *             properties:
 *               seedKeyword: { type: string, example: "federated learning" }
 *               source: { type: string, enum: [openalex], default: openalex }
 *               startYear: { type: integer, example: 2018 }
 *               endYear: { type: integer, example: 2024 }
 *               maxPages: { type: integer, example: 4, description: "Max OpenAlex pages (25 papers each)" }
 *               perPage: { type: integer, example: 25 }
 *     responses:
 *       202:
 *         description: Run accepted (poll GET /corpus/runs/{id})
 */
router.post('/runs', corpusController.createRun);

/**
 * @swagger
 * /corpus/runs:
 *   get:
 *     tags: [Corpus]
 *     security: []
 *     summary: Danh sách lần chạy phân tích corpus
 */
router.get('/runs', corpusController.listRuns);

/**
 * @swagger
 * /corpus/runs/{runId}:
 *   get:
 *     tags: [Corpus]
 *     security: []
 *     summary: Trạng thái lần chạy, xu hướng theo năm và chủ đề liên kết
 */
router.get('/runs/:runId', corpusController.getRun);

/**
 * @swagger
 * /corpus/runs/{runId}/papers:
 *   get:
 *     tags: [Corpus]
 *     security: []
 *     summary: Danh sách bài báo trong một lần chạy corpus
 */
router.get('/runs/:runId/papers', corpusController.getRunPapers);

/**
 * @swagger
 * /corpus/runs/{runId}/follow:
 *   post:
 *     tags: [Corpus]
 *     summary: Theo dõi lần chạy corpus (lưu vào hồ sơ người dùng)
 *     security:
 *       - bearerAuth: []
 */
router.post('/runs/:runId/follow', protect, corpusController.followRun);

/**
 * @swagger
 * /corpus/me/tracked:
 *   get:
 *     tags: [Corpus]
 *     summary: Danh sách lần chạy corpus người dùng đang theo dõi
 *     security:
 *       - bearerAuth: []
 */
router.get('/me/tracked', protect, corpusController.getMyTrackedRuns);

module.exports = router;
