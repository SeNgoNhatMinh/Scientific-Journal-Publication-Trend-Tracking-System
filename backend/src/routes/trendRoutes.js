const express = require('express');
const trendController = require('../controllers/trendController');

const router = express.Router();

/**
 * @swagger
 * /trends/keyword:
 *   get:
 *     tags:
 *       - Trends
 *     security: []
 *     summary: Lấy dữ liệu xu hướng theo từ khóa
 *     description: Retrieve publication trend analysis for a specific keyword
 *     parameters:
 *       - in: query
 *         name: keyword
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startYear
 *         schema:
 *           type: integer
 *           default: 2010
 *     responses:
 *       200:
 *         description: Trend data retrieved
 *       400:
 *         description: Missing required parameters
 */
router.get('/keyword', trendController.getTrendData);

/**
 * @swagger
 * /trends/compare:
 *   post:
 *     tags:
 *       - Trends
 *     summary: So sánh xu hướng nhiều từ khóa
 *     description: Compare publication trends across multiple keywords
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - keywords
 *             properties:
 *               keywords:
 *                 type: array
 *                 items:
 *                   type: string
 *               startYear:
 *                 type: integer
 *                 default: 2010
 *     responses:
 *       200:
 *         description: Trend comparisons retrieved
 */
router.post('/compare', trendController.compareTrends);

/**
 * @swagger
 * /trends/emerging:
 *   get:
 *     tags:
 *       - Trends
 *     security: []
 *     summary: Lấy chủ đề mới nổi
 *     description: From corpus-backed Topic docs. Run POST /corpus/runs first. Optional query analysisRunId.
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Emerging topics retrieved
 */
router.get('/emerging', trendController.getEmergingTopics);

/**
 * @swagger
 * /trends/trending:
 *   get:
 *     tags:
 *       - Trends
 *     summary: Lấy chủ đề đang thịnh hành
 *     description: From corpus-backed Topic docs. Optional query analysisRunId.
 *     security: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Trending topics retrieved
 */
router.get('/trending', trendController.getTrendingTopics);

/**
 * @swagger
 * /trends/topics/{topicId}:
 *   get:
 *     tags:
 *       - Trends
 *     summary: Lấy chi tiết chủ đề
 *     description: Retrieve detailed information about a specific topic
 *     parameters:
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Topic details retrieved
 *       404:
 *         description: Topic not found
 */
router.get('/topics/:topicId', trendController.getTopicDetails);

module.exports = router;
