const express = require('express');
const journalController = require('../controllers/journalController');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

router
  .route('/')
  .get(journalController.getJournals)
  .post(authMiddleware.protect, journalController.createJournal);

router
  .route('/:id')
  .get(journalController.getJournal)
  .put(authMiddleware.protect, journalController.updateJournal)
  .delete(authMiddleware.protect, journalController.deleteJournal);

module.exports = router;
