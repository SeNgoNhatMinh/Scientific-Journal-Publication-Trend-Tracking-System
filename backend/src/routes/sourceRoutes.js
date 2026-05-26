const express = require('express');
const sourceController = require('../controllers/sourceController');

const router = express.Router();

/**
 * @swagger
 * /sources/search:
 *   get:
 *     tags:
 *       - Sources
 *     security: []
 *     summary: Tìm bài báo từ OpenAlex, Semantic Scholar hoặc Crossref
 *     description: Call academic search APIs through the backend using a source selector
 *     parameters:
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [openalex, semanticscholar, crossref]
 *           default: openalex
 *       - in: query
 *         name: keyword
 *         required: true
 *         schema:
 *           type: string
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
 *     responses:
 *       200:
 *         description: Search results retrieved
 */
router.get('/search', sourceController.searchPapers);

/**
 * @swagger
 * /sources/trend:
 *   get:
 *     tags:
 *       - Sources
 *     security: []
 *     summary: Lấy xu hướng theo năm từ API nguồn
 *     parameters:
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [openalex, semanticscholar, crossref]
 *           default: openalex
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
 */
router.get('/trend', sourceController.getTrendData);

/**
 * @swagger
 * /sources/journal:
 *   get:
 *     tags:
 *       - Sources
 *     summary: Tìm metadata tạp chí/nguồn
 *     parameters:
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [openalex]
 *           default: openalex
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Journal info retrieved
 */
router.get('/journal', sourceController.getJournalInfo);

/**
 * @swagger
 * /sources/author:
 *   get:
 *     tags:
 *       - Sources
 *     summary: Tìm metadata tác giả
 *     parameters:
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [openalex, semanticscholar]
 *           default: openalex
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Author info retrieved
 */
router.get('/author', sourceController.getAuthorInfo);

module.exports = router;