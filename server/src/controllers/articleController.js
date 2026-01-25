const Article = require('../models/Article');
const Category = require('../models/Category');
const Source = require('../models/Source');
const logger = require('../utils/logger');

// @desc    Get all articles with filtering
// @route   GET /api/articles
// @access  Public
const getArticles = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      source,
      minScore = 0,
      status = 'approved',
      search,
      startDate,
      endDate,
      sortBy = 'publishedAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = { isActive: true };

    // Filter by curation status
    if (status && status !== 'all') {
      query['curation.status'] = status;
    }

    // Filter by minimum score
    if (minScore > 0) {
      query['filteringMetadata.overallScore'] = { $gte: parseInt(minScore) };
    }

    // Filter by category
    if (category) {
      const categoryDoc = await Category.findOne({ slug: category });
      if (categoryDoc) {
        query.categories = categoryDoc._id;
      }
    }

    // Filter by source
    if (source) {
      query['source.name'] = source;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.publishedAt = {};
      if (startDate) query.publishedAt.$gte = new Date(startDate);
      if (endDate) query.publishedAt.$lte = new Date(endDate);
    }

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort object
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    // Execute query
    const [articles, total] = await Promise.all([
      Article.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('categories', 'name slug color icon'),
      Article.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: articles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error fetching articles:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching articles',
      error: error.message
    });
  }
};

// @desc    Get single article by ID
// @route   GET /api/articles/:id
// @access  Public
const getArticle = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id)
      .populate('categories', 'name slug color icon')
      .populate('curation.curatedBy', 'name');

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    // Increment view count
    article.interactions.views += 1;
    await article.save();

    res.status(200).json({
      success: true,
      data: article
    });
  } catch (error) {
    logger.error('Error fetching article:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching article',
      error: error.message
    });
  }
};

// @desc    Get trending articles
// @route   GET /api/articles/trending
// @access  Public
const getTrendingArticles = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Get articles from last 24 hours with high scores
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const articles = await Article.find({
      isActive: true,
      'curation.status': 'approved',
      publishedAt: { $gte: oneDayAgo },
      'filteringMetadata.overallScore': { $gte: 60 }
    })
      .sort({ 'interactions.views': -1, 'filteringMetadata.overallScore': -1 })
      .limit(parseInt(limit))
      .populate('categories', 'name slug color');

    res.status(200).json({
      success: true,
      data: articles
    });
  } catch (error) {
    logger.error('Error fetching trending articles:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trending articles',
      error: error.message
    });
  }
};

// @desc    Get all categories
// @route   GET /api/articles/categories
// @access  Public
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 });

    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
};

// @desc    Get all sources
// @route   GET /api/articles/sources
// @access  Public
const getSources = async (req, res) => {
  try {
    const sources = await Source.find({ isEnabled: true })
      .select('name credibilityRating.overallScore credibilityRating.biasRating')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: sources
    });
  } catch (error) {
    logger.error('Error fetching sources:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sources',
      error: error.message
    });
  }
};

// @desc    Get article statistics
// @route   GET /api/articles/stats
// @access  Public
const getStats = async (req, res) => {
  try {
    const [
      totalArticles,
      approvedArticles,
      pendingArticles,
      rejectedArticles,
      totalSources,
      avgScore
    ] = await Promise.all([
      Article.countDocuments({ isActive: true }),
      Article.countDocuments({ isActive: true, 'curation.status': 'approved' }),
      Article.countDocuments({ isActive: true, 'curation.status': 'pending' }),
      Article.countDocuments({ isActive: true, 'curation.status': 'rejected' }),
      Source.countDocuments({ isEnabled: true }),
      Article.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, avgScore: { $avg: '$filteringMetadata.overallScore' } } }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalArticles,
        approvedArticles,
        pendingArticles,
        rejectedArticles,
        totalSources,
        averageScore: avgScore[0]?.avgScore?.toFixed(1) || 0
      }
    });
  } catch (error) {
    logger.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
};

module.exports = {
  getArticles,
  getArticle,
  getTrendingArticles,
  getCategories,
  getSources,
  getStats
};
