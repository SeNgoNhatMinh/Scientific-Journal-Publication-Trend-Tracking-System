const express = require('express');
const keywordController = require('../controllers/keywordController');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

router
  .route('/')
  .get(keywordController.getKeywords)
  .post(authMiddleware.protect, keywordController.createKeyword);

router
  .route('/:id')
  .get(keywordController.getKeyword)
  .put(authMiddleware.protect, keywordController.updateKeyword)
  .delete(authMiddleware.protect, keywordController.deleteKeyword);

module.exports = router;
