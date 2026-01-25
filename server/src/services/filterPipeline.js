/**
 * Filter Pipeline Service
 * Orchestrates multi-layer filtering for articles
 */

const { analyzeKeywords } = require('./keywordFilter');
const { getSourceCredibility } = require('./credibilityService');
const { analyzeWithAI, isAIAvailable } = require('./aiAnalyzer');
const Category = require('../models/Category');
const logger = require('../utils/logger');

// Weights for each filtering layer
const WEIGHTS = {
  keyword: 0.20,      // 20% - Keyword-based filtering
  credibility: 0.30,  // 30% - Source credibility
  aiQuality: 0.25,    // 25% - AI quality analysis (placeholder for Phase 4)
  aiCredibility: 0.10,// 10% - AI credibility analysis (placeholder for Phase 4)
  engagement: 0.15    // 15% - User engagement (placeholder)
};

// Threshold for automatic approval
const PASSING_THRESHOLD = 60;

/**
 * Process an article through the filtering pipeline
 * @param {Object} article - Article document (mongoose model)
 * @returns {Object} Updated article with filtering metadata
 */
async function processArticle(article) {
  try {
    // Layer 1: Keyword-based filtering
    const keywordResults = analyzeKeywords({
      title: article.title,
      description: article.description,
      content: article.content
    });

    article.filteringMetadata.keywordFilter = {
      passed: keywordResults.passed,
      flaggedKeywords: keywordResults.flaggedKeywords,
      clickbaitScore: keywordResults.clickbaitScore,
      sensationalismScore: keywordResults.sensationalismScore,
      score: keywordResults.score
    };

    // Layer 2: Source credibility
    const credibilityResults = await getSourceCredibility(article.source.name);
    article.filteringMetadata.credibility = {
      sourceRating: credibilityResults.sourceRating,
      biasRating: credibilityResults.biasRating,
      factualReporting: credibilityResults.factualReporting,
      overallScore: credibilityResults.overallScore
    };

    // Layer 3: AI Analysis (uses heuristics if OpenAI not configured)
    const aiResults = await analyzeWithAI(article);
    article.filteringMetadata.aiAnalysis = {
      qualityScore: aiResults.qualityScore,
      biasScore: aiResults.biasScore,
      credibilityScore: aiResults.credibilityScore,
      sentiment: aiResults.sentiment,
      isOpinion: aiResults.isOpinion,
      isFactual: aiResults.isFactual,
      analyzedAt: aiResults.analyzedAt,
      model: aiResults.model
    };

    // Layer 4: Calculate overall score
    const overallScore = calculateOverallScore(article);
    article.filteringMetadata.overallScore = overallScore;
    article.filteringMetadata.isPassing = overallScore >= PASSING_THRESHOLD;
    article.filteringMetadata.filterVersion = '1.0';

    // Auto-categorize article
    const categoryIds = await Category.categorizeArticle(
      article.title,
      article.description
    );
    article.categories = categoryIds;

    // Set curation status based on score
    if (overallScore >= 70) {
      article.curation.status = 'approved';
    } else if (overallScore < 40) {
      article.curation.status = 'rejected';
    } else {
      article.curation.status = 'pending';
    }

    logger.info(`Processed article: "${article.title.substring(0, 50)}..." - Score: ${overallScore}`);

    return article;
  } catch (error) {
    logger.error(`Error processing article through pipeline:`, error);
    throw error;
  }
}

/**
 * Calculate overall score from all layers
 * @param {Object} article - Article with filtering metadata
 * @returns {number} Overall score (0-100)
 */
function calculateOverallScore(article) {
  const metadata = article.filteringMetadata;

  // Get scores from each layer (with defaults)
  const scores = {
    keyword: metadata.keywordFilter?.score || 50,
    credibility: metadata.credibility?.overallScore || 50,
    aiQuality: metadata.aiAnalysis?.qualityScore || 50,
    aiCredibility: metadata.aiAnalysis?.credibilityScore || 50,
    engagement: 50 // Default engagement score
  };

  // Calculate weighted average
  let totalScore = 0;
  let totalWeight = 0;

  for (const [layer, weight] of Object.entries(WEIGHTS)) {
    if (scores[layer] !== undefined && scores[layer] !== null) {
      totalScore += scores[layer] * weight;
      totalWeight += weight;
    }
  }

  // Normalize if not all weights are used
  const normalizedScore = totalWeight > 0 ? totalScore / totalWeight * (1 / Math.max(...Object.values(WEIGHTS))) : 50;

  return Math.round(Math.max(0, Math.min(100, totalScore)));
}

/**
 * Estimate quality score based on available data
 * (Placeholder until AI analysis is implemented)
 */
function estimateQualityScore(article, keywordResults) {
  let score = 60; // Start with neutral score

  // Boost for longer content
  if (article.content && article.content.length > 500) {
    score += 5;
  }

  // Penalize for missing description
  if (!article.description) {
    score -= 10;
  }

  // Use keyword analysis results
  if (keywordResults.qualityIndicators && keywordResults.qualityIndicators.length > 0) {
    score += keywordResults.qualityIndicators.length * 5;
  }

  // Penalize for clickbait
  if (keywordResults.clickbaitScore > 50) {
    score -= 15;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Batch process multiple articles
 * @param {Array} articles - Array of article documents
 * @returns {Array} Processed articles
 */
async function processArticles(articles) {
  const processed = [];

  for (const article of articles) {
    try {
      const processedArticle = await processArticle(article);
      processed.push(processedArticle);
    } catch (error) {
      logger.error(`Failed to process article: ${article.title}`, error);
    }
  }

  return processed;
}

/**
 * Reprocess all articles (useful after filter updates)
 * @param {Object} options - Processing options
 */
async function reprocessAllArticles(options = {}) {
  const Article = require('../models/Article');
  const { batchSize = 100 } = options;

  let processed = 0;
  let skip = 0;

  while (true) {
    const articles = await Article.find({})
      .skip(skip)
      .limit(batchSize);

    if (articles.length === 0) break;

    for (const article of articles) {
      await processArticle(article);
      await article.save();
      processed++;
    }

    skip += batchSize;
    logger.info(`Reprocessed ${processed} articles...`);
  }

  logger.info(`Finished reprocessing ${processed} articles`);
  return processed;
}

module.exports = {
  processArticle,
  processArticles,
  calculateOverallScore,
  reprocessAllArticles,
  WEIGHTS,
  PASSING_THRESHOLD
};
