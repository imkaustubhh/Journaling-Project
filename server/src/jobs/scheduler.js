/**
 * Background Job Scheduler
 * Manages scheduled tasks for news fetching and processing
 */

const cron = require('node-cron');
const { fetchAndStoreNews } = require('../services/newsAggregator');
const { initializeDefaultSources } = require('../services/credibilityService');
const Category = require('../models/Category');
const Article = require('../models/Article');
const logger = require('../utils/logger');

// Store active jobs for management
const activeJobs = {};

/**
 * Initialize scheduled jobs
 */
function initializeJobs() {
  logger.info('Initializing scheduled jobs...');

  // Job: Fetch news every hour
  // Cron expression: '0 * * * *' = at minute 0 of every hour
  activeJobs.fetchNews = cron.schedule('0 * * * *', async () => {
    logger.info('[CRON] Starting hourly news fetch...');
    try {
      const results = await fetchAndStoreNews();
      logger.info(`[CRON] Hourly fetch complete: ${results.stored} new articles`);
    } catch (error) {
      logger.error('[CRON] Error in hourly news fetch:', error);
    }
  }, {
    scheduled: true,
    timezone: 'UTC'
  });

  // Job: Cleanup old articles (runs daily at midnight)
  // Keeps articles from the last 30 days
  activeJobs.cleanup = cron.schedule('0 0 * * *', async () => {
    logger.info('[CRON] Starting daily cleanup...');
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await Article.deleteMany({
        publishedAt: { $lt: thirtyDaysAgo },
        'curation.status': { $ne: 'approved' } // Keep manually approved articles
      });

      logger.info(`[CRON] Cleanup complete: Removed ${result.deletedCount} old articles`);
    } catch (error) {
      logger.error('[CRON] Error in daily cleanup:', error);
    }
  }, {
    scheduled: true,
    timezone: 'UTC'
  });

  logger.info('Scheduled jobs initialized:');
  logger.info('  - News fetch: Every hour at :00');
  logger.info('  - Cleanup: Daily at 00:00 UTC');
}

/**
 * Run initial setup tasks
 */
async function runInitialSetup() {
  logger.info('Running initial setup...');

  try {
    // Initialize default categories
    await Category.initializeDefaults();
    logger.info('Default categories initialized');

    // Initialize default source ratings
    await initializeDefaultSources();
    logger.info('Default source ratings initialized');

    // Fetch initial news (if API key is configured)
    if (process.env.NEWSAPI_KEY) {
      logger.info('Fetching initial news batch...');
      const results = await fetchAndStoreNews({ category: 'general' });
      logger.info(`Initial fetch complete: ${results.stored} articles stored`);
    } else {
      logger.warn('NewsAPI key not configured. Skipping initial fetch.');
      logger.warn('Set NEWSAPI_KEY in .env to enable news fetching.');
    }
  } catch (error) {
    logger.error('Error in initial setup:', error);
  }
}

/**
 * Manually trigger a news fetch
 * @param {Object} options - Fetch options
 */
async function triggerNewsFetch(options = {}) {
  logger.info('[MANUAL] Triggering news fetch...');
  try {
    const results = await fetchAndStoreNews(options);
    logger.info(`[MANUAL] Fetch complete: ${results.stored} new articles`);
    return results;
  } catch (error) {
    logger.error('[MANUAL] Error in news fetch:', error);
    throw error;
  }
}

/**
 * Stop all scheduled jobs
 */
function stopAllJobs() {
  logger.info('Stopping all scheduled jobs...');
  for (const [name, job] of Object.entries(activeJobs)) {
    job.stop();
    logger.info(`  - Stopped: ${name}`);
  }
}

/**
 * Get status of all jobs
 */
function getJobsStatus() {
  return Object.entries(activeJobs).map(([name, job]) => ({
    name,
    running: job.running || false
  }));
}

module.exports = {
  initializeJobs,
  runInitialSetup,
  triggerNewsFetch,
  stopAllJobs,
  getJobsStatus
};
