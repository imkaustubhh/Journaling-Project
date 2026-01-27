/**
 * Viral News Controller
 * Handles viral news detection, verification, and fact-checking endpoints
 */

const ViralNews = require('../models/ViralNews');
const logger = require('../utils/logger');
const { cache } = require('../config/redis');
const {
  detectViralStories,
  verifyViralNews,
  getVerificationSummary,
  analyzeForMisinformation,
  FACT_CHECK_SOURCES
} = require('../services/factChecker');

// @desc    Get all trending/viral news
// @route   GET /api/viral
// @access  Public
const getTrendingViralNews = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      minVirality = 0
    } = req.query;

    const query = { isActive: true, isTrending: true };

    if (status) {
      query['verification.status'] = status;
    }

    if (minVirality > 0) {
      query['virality.score'] = { $gte: parseInt(minVirality) };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [viralNews, total] = await Promise.all([
      ViralNews.find(query)
        .sort({ 'virality.score': -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('categories', 'name slug'),
      ViralNews.countDocuments(query)
    ]);

    // Add verification summary to each item
    const enrichedNews = viralNews.map(vn => ({
      ...vn.toObject(),
      summary: getVerificationSummary(vn)
    }));

    res.status(200).json({
      success: true,
      data: enrichedNews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error fetching viral news:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching viral news',
      error: error.message
    });
  }
};

// @desc    Get single viral news with full details
// @route   GET /api/viral/:id
// @access  Public
const getViralNewsById = async (req, res) => {
  try {
    const viralNews = await ViralNews.findById(req.params.id)
      .populate('categories', 'name slug')
      .populate('relatedArticles.articleId', 'title url source publishedAt');

    if (!viralNews) {
      return res.status(404).json({
        success: false,
        message: 'Viral news not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ...viralNews.toObject(),
        summary: getVerificationSummary(viralNews),
        reliabilityScore: viralNews.reliabilityScore
      }
    });
  } catch (error) {
    logger.error('Error fetching viral news:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching viral news',
      error: error.message
    });
  }
};

// @desc    Get fake/misleading news
// @route   GET /api/viral/fake
// @access  Public
const getFakeNews = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const query = {
      isActive: true,
      'verification.status': { $in: ['verified_false', 'misleading'] }
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [fakeNews, total] = await Promise.all([
      ViralNews.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('categories', 'name slug'),
      ViralNews.countDocuments(query)
    ]);

    const enrichedNews = fakeNews.map(vn => ({
      ...vn.toObject(),
      summary: getVerificationSummary(vn)
    }));

    res.status(200).json({
      success: true,
      data: enrichedNews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error fetching fake news:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching fake news',
      error: error.message
    });
  }
};

// @desc    Get verified true news
// @route   GET /api/viral/verified
// @access  Public
const getVerifiedNews = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const query = {
      isActive: true,
      'verification.status': { $in: ['verified_true', 'partially_true'] }
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [verifiedNews, total] = await Promise.all([
      ViralNews.find(query)
        .sort({ 'verification.confidenceScore': -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('categories', 'name slug'),
      ViralNews.countDocuments(query)
    ]);

    const enrichedNews = verifiedNews.map(vn => ({
      ...vn.toObject(),
      summary: getVerificationSummary(vn)
    }));

    res.status(200).json({
      success: true,
      data: enrichedNews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error fetching verified news:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching verified news',
      error: error.message
    });
  }
};

// @desc    Get unverified/pending news
// @route   GET /api/viral/unverified
// @access  Public
const getUnverifiedNews = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const query = {
      isActive: true,
      'verification.status': { $in: ['unverified', 'under_review'] }
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [unverifiedNews, total] = await Promise.all([
      ViralNews.find(query)
        .sort({ 'virality.score': -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('categories', 'name slug'),
      ViralNews.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: unverifiedNews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error fetching unverified news:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unverified news',
      error: error.message
    });
  }
};

// @desc    Detect new viral stories
// @route   POST /api/viral/detect
// @access  Public (should be protected in production)
const runViralDetection = async (req, res) => {
  try {
    // Rate limit
    const cacheKey = 'viral:lastDetection';
    const lastRun = await cache.get(cacheKey);

    if (lastRun) {
      return res.status(429).json({
        success: false,
        message: 'Please wait before running detection again',
        lastRun
      });
    }

    const viralStories = await detectViralStories();

    await cache.set(cacheKey, new Date().toISOString(), 300);

    res.status(200).json({
      success: true,
      message: `Detected ${viralStories.length} new viral stories`,
      data: viralStories.map(v => ({
        id: v._id,
        title: v.title,
        viralityScore: v.virality.score,
        sourcesCount: v.relatedArticles.length
      }))
    });
  } catch (error) {
    logger.error('Error in viral detection:', error);
    res.status(500).json({
      success: false,
      message: 'Error detecting viral stories',
      error: error.message
    });
  }
};

// @desc    Verify a viral news story
// @route   POST /api/viral/:id/verify
// @access  Public (should be protected in production)
const verifyStory = async (req, res) => {
  try {
    const viralNews = await verifyViralNews(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Verification complete',
      data: {
        id: viralNews._id,
        title: viralNews.title,
        verification: viralNews.verification,
        summary: getVerificationSummary(viralNews)
      }
    });
  } catch (error) {
    logger.error('Error verifying story:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying story',
      error: error.message
    });
  }
};

// @desc    Add a fact-check reference
// @route   POST /api/viral/:id/factcheck
// @access  Public (should be protected in production)
const addFactCheck = async (req, res) => {
  try {
    const { source, url, rating, normalizedRating, summary } = req.body;

    if (!source || !url) {
      return res.status(400).json({
        success: false,
        message: 'Source and URL are required'
      });
    }

    const viralNews = await ViralNews.findById(req.params.id);

    if (!viralNews) {
      return res.status(404).json({
        success: false,
        message: 'Viral news not found'
      });
    }

    await viralNews.addFactCheck({
      source,
      url,
      rating,
      normalizedRating,
      summary
    });

    // Re-verify with new fact-check
    const updated = await verifyViralNews(viralNews._id);

    res.status(200).json({
      success: true,
      message: 'Fact-check added',
      data: {
        id: updated._id,
        factChecks: updated.factChecks,
        verification: updated.verification
      }
    });
  } catch (error) {
    logger.error('Error adding fact-check:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding fact-check',
      error: error.message
    });
  }
};

// @desc    Analyze text for misinformation
// @route   POST /api/viral/analyze
// @access  Public
const analyzeText = async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    const analysis = analyzeForMisinformation(title, content);

    res.status(200).json({
      success: true,
      data: {
        type: analysis.type,
        flags: analysis.flags,
        riskScore: analysis.riskScore,
        recommendation: analysis.riskScore > 50
          ? 'High risk of misinformation. Verify with trusted sources.'
          : analysis.riskScore > 25
            ? 'Moderate risk. Cross-check key claims.'
            : 'Low risk detected. Standard verification recommended.'
      }
    });
  } catch (error) {
    logger.error('Error analyzing text:', error);
    res.status(500).json({
      success: false,
      message: 'Error analyzing text',
      error: error.message
    });
  }
};

// @desc    Get fact-checker sources info
// @route   GET /api/viral/factcheckers
// @access  Public
const getFactCheckers = async (req, res) => {
  try {
    const factCheckers = Object.entries(FACT_CHECK_SOURCES).map(([key, value]) => ({
      id: key,
      ...value
    }));

    res.status(200).json({
      success: true,
      data: factCheckers
    });
  } catch (error) {
    logger.error('Error fetching fact-checkers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching fact-checkers',
      error: error.message
    });
  }
};

// @desc    Get viral news statistics
// @route   GET /api/viral/stats
// @access  Public
const getViralStats = async (req, res) => {
  try {
    const [
      total,
      verified,
      fake,
      unverified,
      trending
    ] = await Promise.all([
      ViralNews.countDocuments({ isActive: true }),
      ViralNews.countDocuments({ isActive: true, 'verification.status': { $in: ['verified_true', 'partially_true'] } }),
      ViralNews.countDocuments({ isActive: true, 'verification.status': { $in: ['verified_false', 'misleading'] } }),
      ViralNews.countDocuments({ isActive: true, 'verification.status': 'unverified' }),
      ViralNews.countDocuments({ isActive: true, isTrending: true })
    ]);

    // Get top misinformation types
    const misinfoTypes = await ViralNews.aggregate([
      { $match: { isActive: true, 'misinformationAnalysis.type': { $ne: 'none' } } },
      { $group: { _id: '$misinformationAnalysis.type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        total,
        verified,
        fake,
        unverified,
        trending,
        verificationRate: total > 0 ? ((verified + fake) / total * 100).toFixed(1) : 0,
        fakeNewsRate: total > 0 ? (fake / total * 100).toFixed(1) : 0,
        topMisinfoTypes: misinfoTypes
      }
    });
  } catch (error) {
    logger.error('Error fetching viral stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
};

module.exports = {
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
};
