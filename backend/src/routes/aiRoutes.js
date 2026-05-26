const express = require('express');
const aiController = require('../controllers/aiController');

const router = express.Router();

/**
 * @swagger
 * /ai/health:
 *   get:
 *     tags: [AI Service]
 *     security: []
 *     summary: Kiểm tra sức khỏe dịch vụ AI
 *     responses:
 *       200:
 *         description: AI service is healthy
 */
router.get('/health', aiController.getHealth);

/**
 * @swagger
 * /ai/embeddings/embed:
 *   post:
 *     tags: [AI Service]
 *     security: []
 *     summary: Sinh embedding cho một đoạn văn
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text: { type: string, example: "machine learning in healthcare" }
 *     responses:
 *       200:
 *         description: 384-dim embedding vector
 */
router.post('/embeddings/embed', aiController.embedText);

/**
 * @swagger
 * /ai/embeddings/embed-batch:
 *   post:
 *     tags: [AI Service]
 *     security: []
 *     summary: Sinh embedding hàng loạt
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [texts]
 *             properties:
 *               texts:
 *                 type: array
 *                 items: { type: string }
 *                 example: ["deep learning", "neural networks"]
 *     responses:
 *       200:
 *         description: Batch embeddings
 */
router.post('/embeddings/embed-batch', aiController.embedBatch);

/**
 * @swagger
 * /ai/embeddings/similarity:
 *   post:
 *     tags: [AI Service]
 *     security: []
 *     summary: Tính độ tương đồng giữa hai đoạn văn
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text1, text2]
 *             properties:
 *               text1: { type: string, example: "deep learning" }
 *               text2: { type: string, example: "neural networks" }
 *     responses:
 *       200:
 *         description: Cosine similarity score
 */
router.post('/embeddings/similarity', aiController.computeSimilarity);

/**
 * @swagger
 * /ai/recommendations/papers:
 *   post:
 *     tags: [AI Service]
 *     security: []
 *     summary: Gợi ý bài báo theo sở thích và lịch sử
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userInterests, candidatePapers]
 *             properties:
 *               userInterests:
 *                 type: array
 *                 items: { type: string }
 *                 example: ["deep learning"]
 *               userHistory: { type: array, items: { type: object } }
 *               topN: { type: integer, example: 3 }
 *               candidatePapers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     paperId: { type: string }
 *                     title: { type: string }
 *                     abstract: { type: string }
 *                     keywords: { type: array, items: { type: string } }
 *                     citationCount: { type: integer }
 *     responses:
 *       200:
 *         description: Ranked recommendations
 */
router.post('/recommendations/papers', aiController.recommendPapers);

/**
 * @swagger
 * /ai/recommendations/research-directions:
 *   post:
 *     tags: [AI Service]
 *     security: []
 *     summary: Gợi ý hướng nghiên cứu từ từ khóa
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [keywords]
 *             properties:
 *               keywords:
 *                 type: array
 *                 items: { type: string }
 *                 example: ["quantum computing", "machine learning"]
 *     responses:
 *       200:
 *         description: Research direction clusters
 */
router.post('/recommendations/research-directions', aiController.recommendResearchDirections);

/**
 * @swagger
 * /ai/summarization/abstract:
 *   post:
 *     tags: [AI Service]
 *     security: []
 *     summary: Tóm tắt abstract học thuật
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [abstract]
 *             properties:
 *               abstract:
 *                 type: string
 *                 example: "Deep learning has revolutionized medical imaging. We propose a lightweight CNN. Results show improved accuracy."
 *               maxLength: { type: integer, example: 100 }
 *     responses:
 *       200:
 *         description: Summary and key points
 */
router.post('/summarization/abstract', aiController.summarizeAbstract);

/**
 * @swagger
 * /ai/summarization/extract-problem:
 *   post:
 *     tags: [AI Service]
 *     security: []
 *     summary: Trích xuất vấn đề, phương pháp và kết quả từ abstract
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [abstract]
 *             properties:
 *               abstract:
 *                 type: string
 *                 example: "Medical diagnosis remains challenging. We propose a CNN approach. Our method achieves 95% accuracy."
 *     responses:
 *       200:
 *         description: Structured extraction
 */
router.post('/summarization/extract-problem', aiController.extractProblem);

module.exports = router;
