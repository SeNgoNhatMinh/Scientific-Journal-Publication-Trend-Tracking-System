const express = require('express');
const authorController = require('../controllers/authorController');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

router
  .route('/')
  .get(authorController.getAuthors)
  .post(authMiddleware.protect, authorController.createAuthor);

router
  .route('/:id')
  .get(authorController.getAuthor)
  .put(authMiddleware.protect, authorController.updateAuthor)
  .delete(authMiddleware.protect, authorController.deleteAuthor);

module.exports = router;
