const express = require('express');
const router = express.Router();
const {
  getArticles,
  getArticle,
  getTrendingArticles,
  getCategories,
  getSources,
  getStats,
  searchArticles,
  getXNews,
  searchXNews,
  getXTrending,
  getIndianNews,
  fetchFreshIndianNews,
  getIndianSources
} = require('../controllers/articleController');

// Public routes
router.get('/', getArticles);
router.get('/search', searchArticles);
router.get('/trending', getTrendingArticles);
router.get('/categories', getCategories);
router.get('/sources', getSources);
router.get('/stats', getStats);

// X/Twitter routes
router.get('/x/news', getXNews);
router.get('/x/search', searchXNews);
router.get('/x/trending', getXTrending);

// Indian news routes
router.get('/india', getIndianNews);
router.post('/india/fetch', fetchFreshIndianNews);
router.get('/india/sources', getIndianSources);

// Single article (keep at bottom to avoid conflicts)
router.get('/:id', getArticle);

module.exports = router;
