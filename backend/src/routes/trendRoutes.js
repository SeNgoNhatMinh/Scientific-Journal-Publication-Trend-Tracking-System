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
 * /trends/research-directions:
 *   post:
 *     tags:
 *       - Trends
 *     security: []
 *     summary: Sinh hướng nghiên cứu có evidence papers
 *     description: Builds evidence-backed research directions from one trend keyword.
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
 *                 example: mamba
 *               trendContext:
 *                 type: object
 *               limit:
 *                 type: integer
 *                 default: 5
 *     responses:
 *       200:
 *         description: Evidence-backed research directions retrieved
 */
router.post('/research-directions', trendController.getResearchDirections);

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
 * /trends/keyword-categories:
 *   get:
 *     tags:
 *       - Trends
 *     security: []
 *     summary: Thống kê keyword theo loại
 *     description: Returns locally stored keywords grouped by category. Optional analysisRunId narrows results to one corpus run.
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [domain, algorithm, application, method, dataset, tool, general]
 *       - in: query
 *         name: analysisRunId
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Keyword category stats retrieved
 */
router.get('/keyword-categories', trendController.getKeywordCategories);

/**
 * @swagger
 * /trends/keyword-graph:
 *   get:
 *     tags:
 *       - Trends
 *     security: []
 *     summary: Lấy graph đồng xuất hiện keyword
 *     description: Returns nodes and edges for keyword co-occurrence visualization from locally stored papers.
 *     parameters:
 *       - in: query
 *         name: analysisRunId
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: paperLimit
 *         schema:
 *           type: integer
 *           default: 300
 *     responses:
 *       200:
 *         description: Keyword graph retrieved
 */
router.get('/keyword-graph', trendController.getKeywordGraph);

/**
 * @swagger
 * /trends/algorithm-domains:
 *   get:
 *     tags:
 *       - Trends
 *     security: []
 *     summary: Lấy cặp thuật toán và domain
 *     description: Returns algorithm-domain co-occurrence pairs from locally stored papers.
 *     parameters:
 *       - in: query
 *         name: analysisRunId
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: paperLimit
 *         schema:
 *           type: integer
 *           default: 500
 *     responses:
 *       200:
 *         description: Algorithm-domain pairs retrieved
 */
router.get('/algorithm-domains', trendController.getAlgorithmDomains);

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

/**
 * @swagger
 * /trends/related-keywords:
 *   get:
 *     tags:
 *       - Trends
 *     security: []
 *     summary: Thống kê và tính trend của các từ khóa phụ liên quan đến từ khóa chính
 *     description: Search papers matching a keyword, extract and aggregate their keywords by year from 2010 to present to show sub-trends.
 *     parameters:
 *       - in: query
 *         name: keyword
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [openalex, local]
 *           default: openalex
 *       - in: query
 *         name: startYear
 *         schema:
 *           type: integer
 *           default: 2010
 *     responses:
 *       200:
 *         description: Related keywords trends and papers retrieved successfully
 *       400:
 *         description: Missing or invalid parameters
 */
router.get('/related-keywords', trendController.getRelatedKeywordsTrend);

/**
 * @swagger
 * /trends/insights/top-topics:
 *   get:
 *     tags:
 *       - Insights
 *     security: []
 *     summary: Top chủ đề và từ khóa trong khoảng thời gian
 *     description: Returns top fields of study (domain keywords) and all keywords ranked by paper count. Powers the Bar Chart and Word Cloud on the Insights page.
 *     parameters:
 *       - in: query
 *         name: startYear
 *         schema:
 *           type: integer
 *           default: 2015
 *       - in: query
 *         name: endYear
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Top topics and keywords retrieved
 */
router.get('/insights/top-topics', trendController.getInsightTopTopics);

/**
 * @swagger
 * /trends/insights/emerging-trends:
 *   get:
 *     tags:
 *       - Insights
 *     security: []
 *     summary: Xu hướng mới nổi với Δ% tăng trưởng
 *     description: Returns keywords with yearly publication counts and growth rates. Keywords with high growth (Δ% > 50%) are labeled as Emerging Trends. Powers the Line Chart on the Insights page.
 *     parameters:
 *       - in: query
 *         name: startYear
 *         schema:
 *           type: integer
 *           default: 2015
 *       - in: query
 *         name: endYear
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Emerging trends retrieved
 */
router.get('/insights/emerging-trends', trendController.getInsightEmergingTrends);

/**
 * @swagger
 * /trends/insights/top-affiliations:
 *   get:
 *     tags:
 *       - Insights
 *     security: []
 *     summary: Tổ chức và tác giả dẫn đầu
 *     description: Returns top affiliations (universities, research institutes) and authors ranked by number of publications. Powers the ranking table on the Insights page.
 *     parameters:
 *       - in: query
 *         name: startYear
 *         schema:
 *           type: integer
 *           default: 2015
 *       - in: query
 *         name: endYear
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Top affiliations and authors retrieved
 */
router.get('/insights/top-affiliations', trendController.getInsightTopAffiliations);

module.exports = router;

