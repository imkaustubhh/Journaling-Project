/**
 * Credibility Service (Layer 2)
 * Manages source credibility ratings
 */

const Source = require('../models/Source');
const logger = require('../utils/logger');

/**
 * Get credibility rating for a news source
 * @param {string} sourceName - Name of the news source
 * @returns {Object} Credibility rating object
 */
async function getSourceCredibility(sourceName) {
  try {
    // Get or create the source with default ratings
    const source = await Source.getOrCreateSource(sourceName);

    return {
      sourceRating: source.credibilityRating.overallScore,
      biasRating: source.credibilityRating.biasRating,
      factualReporting: source.credibilityRating.factualReporting,
      overallScore: source.credibilityRating.overallScore,
      ratingSource: source.credibilityRating.source
    };
  } catch (error) {
    logger.error(`Error getting credibility for ${sourceName}:`, error);

    // Return default values on error
    return {
      sourceRating: 50,
      biasRating: 'unknown',
      factualReporting: 'unknown',
      overallScore: 50,
      ratingSource: 'default'
    };
  }
}

/**
 * Update credibility rating for a source
 * @param {string} sourceName - Name of the news source
 * @param {Object} rating - New rating values
 * @returns {Object} Updated source
 */
async function updateSourceCredibility(sourceName, rating) {
  try {
    const source = await Source.findOneAndUpdate(
      { name: sourceName },
      {
        'credibilityRating.overallScore': rating.overallScore,
        'credibilityRating.biasRating': rating.biasRating,
        'credibilityRating.factualReporting': rating.factualReporting,
        'credibilityRating.lastUpdated': new Date(),
        'credibilityRating.source': rating.source || 'manual'
      },
      { new: true, upsert: true }
    );

    logger.info(`Updated credibility for ${sourceName}: ${rating.overallScore}`);
    return source;
  } catch (error) {
    logger.error(`Error updating credibility for ${sourceName}:`, error);
    throw error;
  }
}

/**
 * Get all sources with their ratings
 * @param {Object} options - Query options
 * @returns {Array} List of sources
 */
async function getAllSources(options = {}) {
  const { enabled = true, sortBy = 'name' } = options;

  const query = {};
  if (enabled !== null) {
    query.isEnabled = enabled;
  }

  return Source.find(query).sort({ [sortBy]: 1 });
}

/**
 * Calculate credibility score based on multiple factors
 * @param {Object} source - Source object
 * @returns {number} Calculated score (0-100)
 */
function calculateCredibilityScore(source) {
  const { overallScore, factualReporting, biasRating } = source.credibilityRating;

  // Start with base score
  let score = overallScore;

  // Adjust based on factual reporting
  const factualAdjustments = {
    'very-high': 10,
    'high': 5,
    'mixed': 0,
    'low': -10,
    'very-low': -20,
    'unknown': 0
  };
  score += factualAdjustments[factualReporting] || 0;

  // Slight adjustment for extreme bias (not a penalty, just context)
  const biasAdjustments = {
    'center': 5,
    'center-left': 0,
    'center-right': 0,
    'left': -5,
    'right': -5,
    'unknown': 0
  };
  score += biasAdjustments[biasRating] || 0;

  // Clamp to 0-100
  return Math.max(0, Math.min(100, score));
}

/**
 * Initialize default sources in database
 */
async function initializeDefaultSources() {
  const defaultRatings = Source.DEFAULT_RATINGS;

  for (const [name, rating] of Object.entries(defaultRatings)) {
    await Source.findOneAndUpdate(
      { name },
      {
        name,
        credibilityRating: {
          ...rating,
          lastUpdated: new Date(),
          source: 'curated'
        }
      },
      { upsert: true }
    );
  }

  logger.info(`Initialized ${Object.keys(defaultRatings).length} default source ratings`);
}

module.exports = {
  getSourceCredibility,
  updateSourceCredibility,
  getAllSources,
  calculateCredibilityScore,
  initializeDefaultSources
};
