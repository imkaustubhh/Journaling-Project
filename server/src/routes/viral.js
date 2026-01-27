const express = require('express');
const router = express.Router();
const {
  getTrendingViralNews,
  getViralNewsById,
  getFakeNews,
  getVerifiedNews,
  getUnverifiedNews,
  runViralDetection,
  verifyStory,
  addFactCheck,
  analyzeText,
  getFactCheckers,
  getViralStats
} = require('../controllers/viralNewsController');

// Public routes - Reading viral news
router.get('/', getTrendingViralNews);
router.get('/stats', getViralStats);
router.get('/fake', getFakeNews);
router.get('/verified', getVerifiedNews);
router.get('/unverified', getUnverifiedNews);
router.get('/factcheckers', getFactCheckers);

// Analysis routes
router.post('/analyze', analyzeText);
router.post('/detect', runViralDetection);

// Single viral news
router.get('/:id', getViralNewsById);
router.post('/:id/verify', verifyStory);
router.post('/:id/factcheck', addFactCheck);

module.exports = router;
