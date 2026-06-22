const express = require('express');
const topicController = require('../controllers/topicController');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

router
  .route('/')
  .get(topicController.getTopics)
  .post(authMiddleware.protect, topicController.createTopic);

router
  .route('/:id')
  .get(topicController.getTopic)
  .put(authMiddleware.protect, topicController.updateTopic)
  .delete(authMiddleware.protect, topicController.deleteTopic);

module.exports = router;
