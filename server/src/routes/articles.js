const express = require('express');
const router = express.Router();
const {
  getArticles,
  getArticle,
  getTrendingArticles,
  getCategories,
  getSources,
  getStats
} = require('../controllers/articleController');

// Public routes
router.get('/', getArticles);
router.get('/trending', getTrendingArticles);
router.get('/categories', getCategories);
router.get('/sources', getSources);
router.get('/stats', getStats);
router.get('/:id', getArticle);

module.exports = router;
