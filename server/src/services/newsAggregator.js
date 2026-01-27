/**
 * News Aggregator Service
 * Fetches news from external APIs and stores them in the database
 */

const axios = require('axios');
const Article = require('../models/Article');
const Source = require('../models/Source');
const { processArticle } = require('./filterPipeline');
const logger = require('../utils/logger');

const NEWS_API_URL = 'https://newsapi.org/v2';

/**
 * Fetch top headlines from NewsAPI
 * @param {Object} options - Fetch options
 * @returns {Array} Raw articles from API
 */
async function fetchFromNewsAPI(options = {}) {
  const {
    category = 'general',
    country = 'us',
    pageSize = 100
  } = options;

  const apiKey = process.env.NEWSAPI_KEY;

  if (!apiKey) {
    logger.warn('NewsAPI key not configured. Skipping fetch.');
    return [];
  }

  try {
    const response = await axios.get(`${NEWS_API_URL}/top-headlines`, {
      params: {
        apiKey,
        category,
        country,
        pageSize
      }
    });

    if (response.data.status === 'ok') {
      logger.info(`Fetched ${response.data.articles.length} articles from NewsAPI (${category})`);
      return response.data.articles;
    }

    logger.error('NewsAPI returned error:', response.data.message);
    return [];
  } catch (error) {
    logger.error('Error fetching from NewsAPI:', error.message);
    return [];
  }
}

/**
 * Fetch from multiple categories
 * @returns {Array} Combined articles from all categories
 */
async function fetchAllCategories() {
  const categories = ['general', 'technology', 'business', 'science', 'health', 'sports', 'entertainment'];
  const allArticles = [];

  // Note: Free tier has 100 requests/day limit
  // Fetching all categories uses 7 requests
  for (const category of categories) {
    const articles = await fetchFromNewsAPI({ category, pageSize: 20 });
    allArticles.push(...articles);

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return allArticles;
}

/**
 * Fetch news specifically from India
 * @param {Object} options - Fetch options
 * @returns {Array} Articles from Indian sources
 */
async function fetchIndianNews(options = {}) {
  const { category = 'general', pageSize = 100 } = options;

  const apiKey = process.env.NEWSAPI_KEY;
  if (!apiKey) {
    logger.warn('NewsAPI key not configured. Skipping fetch.');
    return [];
  }

  try {
    const response = await axios.get(`${NEWS_API_URL}/top-headlines`, {
      params: {
        apiKey,
        country: 'in',
        category,
        pageSize
      }
    });

    if (response.data.status === 'ok') {
      logger.info(`Fetched ${response.data.articles.length} Indian articles (${category})`);
      return response.data.articles;
    }

    logger.error('NewsAPI returned error:', response.data.message);
    return [];
  } catch (error) {
    logger.error('Error fetching Indian news:', error.message);
    return [];
  }
}

/**
 * Fetch from all categories for India
 * @returns {Array} Combined Indian articles from all categories
 */
async function fetchAllIndianCategories() {
  const categories = ['general', 'technology', 'business', 'science', 'health', 'sports', 'entertainment'];
  const allArticles = [];

  for (const category of categories) {
    const articles = await fetchIndianNews({ category, pageSize: 20 });
    allArticles.push(...articles);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return allArticles;
}

/**
 * Search for news from specific Indian domains
 * @param {Object} options - Search options
 */
async function searchIndianSources(options = {}) {
  const apiKey = process.env.NEWSAPI_KEY;
  if (!apiKey) {
    logger.warn('NewsAPI key not configured');
    return [];
  }

  const indianDomains = [
    'thehindu.com',
    'indianexpress.com',
    'hindustantimes.com',
    'indiatoday.in',
    'ndtv.com',
    'timesofindia.indiatimes.com',
    'economictimes.indiatimes.com',
    'business-standard.com',
    'livemint.com',
    'thewire.in',
    'scroll.in',
    'thequint.com',
    'theprint.in',
    'news18.com',
    'firstpost.com',
    'deccanherald.com',
    'telegraphindia.com',
    'newindianexpress.com',
    'outlookindia.com',
    'moneycontrol.com'
  ];

  try {
    const response = await axios.get(`${NEWS_API_URL}/everything`, {
      params: {
        apiKey,
        domains: indianDomains.join(','),
        language: 'en',
        sortBy: options.sortBy || 'publishedAt',
        pageSize: options.pageSize || 100
      }
    });

    if (response.data.status === 'ok') {
      logger.info(`Fetched ${response.data.articles.length} articles from Indian sources`);
      return response.data.articles;
    }

    return [];
  } catch (error) {
    logger.error('Error fetching from Indian sources:', error.message);
    return [];
  }
}

/**
 * Combined fetch for Indian news (headlines + domain search)
 * @returns {Object} Fetch results
 */
async function fetchAndStoreIndianNews() {
  logger.info('Starting Indian news fetch...');
  const startTime = Date.now();

  // Fetch from both methods
  const [headlines, domainNews] = await Promise.all([
    fetchIndianNews({ pageSize: 100 }),
    searchIndianSources({ pageSize: 100 })
  ]);

  const rawArticles = [...headlines, ...domainNews];

  // Remove duplicates
  const uniqueUrls = new Set();
  const uniqueArticles = rawArticles.filter(article => {
    if (!article.url || uniqueUrls.has(article.url)) {
      return false;
    }
    uniqueUrls.add(article.url);
    return true;
  });

  logger.info(`Processing ${uniqueArticles.length} unique Indian articles...`);

  let stored = 0;
  let duplicates = 0;

  for (const rawArticle of uniqueArticles) {
    if (rawArticle.title === '[Removed]' || rawArticle.content === '[Removed]') {
      continue;
    }

    const result = await processAndStoreArticle(rawArticle);
    if (result) {
      stored++;
    } else {
      duplicates++;
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  const results = {
    fetched: rawArticles.length,
    unique: uniqueArticles.length,
    stored,
    duplicates,
    duration: `${duration}s`
  };

  logger.info(`Indian news fetch complete: ${stored} new articles stored in ${duration}s`);
  return results;
}

/**
 * Process and store a raw article from NewsAPI
 * @param {Object} rawArticle - Raw article from NewsAPI
 * @returns {Object|null} Saved article or null if duplicate
 */
async function processAndStoreArticle(rawArticle) {
  try {
    // Check for duplicate by URL
    const existing = await Article.findOne({ url: rawArticle.url });
    if (existing) {
      return null; // Skip duplicate
    }

    // Create article document
    const article = new Article({
      title: rawArticle.title,
      description: rawArticle.description,
      content: rawArticle.content,
      url: rawArticle.url,
      urlToImage: rawArticle.urlToImage,
      publishedAt: new Date(rawArticle.publishedAt),
      author: rawArticle.author,
      source: {
        id: rawArticle.source?.id,
        name: rawArticle.source?.name || 'Unknown',
        url: rawArticle.url ? new URL(rawArticle.url).origin : null
      }
    });

    // Process through filtering pipeline
    await processArticle(article);

    // Save to database
    await article.save();

    // Update source statistics
    await updateSourceStats(article.source.name);

    return article;
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error - article already exists
      return null;
    }
    logger.error(`Error processing article: ${rawArticle.title}`, error);
    return null;
  }
}

/**
 * Update source statistics after storing an article
 * @param {string} sourceName - Name of the source
 */
async function updateSourceStats(sourceName) {
  try {
    await Source.findOneAndUpdate(
      { name: sourceName },
      {
        $inc: { 'stats.totalArticlesFetched': 1 },
        lastFetched: new Date()
      }
    );
  } catch (error) {
    logger.error(`Error updating source stats for ${sourceName}:`, error);
  }
}

/**
 * Main fetch function - fetches and stores news
 * @param {Object} options - Fetch options
 * @returns {Object} Fetch results
 */
async function fetchAndStoreNews(options = {}) {
  const { category = null } = options;

  logger.info('Starting news fetch...');
  const startTime = Date.now();

  let rawArticles;
  if (category) {
    rawArticles = await fetchFromNewsAPI({ category });
  } else {
    rawArticles = await fetchAllCategories();
  }

  // Remove duplicates from raw articles
  const uniqueUrls = new Set();
  const uniqueArticles = rawArticles.filter(article => {
    if (!article.url || uniqueUrls.has(article.url)) {
      return false;
    }
    uniqueUrls.add(article.url);
    return true;
  });

  logger.info(`Processing ${uniqueArticles.length} unique articles...`);

  // Process and store articles
  let stored = 0;
  let duplicates = 0;
  let failed = 0;

  for (const rawArticle of uniqueArticles) {
    // Skip articles with [Removed] content
    if (rawArticle.title === '[Removed]' || rawArticle.content === '[Removed]') {
      continue;
    }

    const result = await processAndStoreArticle(rawArticle);
    if (result) {
      stored++;
    } else {
      duplicates++;
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  const results = {
    fetched: rawArticles.length,
    unique: uniqueArticles.length,
    stored,
    duplicates,
    failed,
    duration: `${duration}s`
  };

  logger.info(`News fetch complete: ${stored} new articles stored in ${duration}s`);
  return results;
}

/**
 * Fetch news from specific sources (premium sources)
 * @param {Array} sourceIds - Array of NewsAPI source IDs
 */
async function fetchFromSources(sourceIds) {
  const apiKey = process.env.NEWSAPI_KEY;

  if (!apiKey) {
    logger.warn('NewsAPI key not configured');
    return [];
  }

  try {
    const response = await axios.get(`${NEWS_API_URL}/top-headlines`, {
      params: {
        apiKey,
        sources: sourceIds.join(','),
        pageSize: 100
      }
    });

    if (response.data.status === 'ok') {
      return response.data.articles;
    }

    return [];
  } catch (error) {
    logger.error('Error fetching from sources:', error.message);
    return [];
  }
}

/**
 * Search for news articles
 * @param {string} query - Search query
 * @param {Object} options - Search options
 */
async function searchNews(query, options = {}) {
  const apiKey = process.env.NEWSAPI_KEY;

  if (!apiKey) {
    logger.warn('NewsAPI key not configured');
    return [];
  }

  try {
    const response = await axios.get(`${NEWS_API_URL}/everything`, {
      params: {
        apiKey,
        q: query,
        language: 'en',
        sortBy: options.sortBy || 'publishedAt',
        pageSize: options.pageSize || 20
      }
    });

    if (response.data.status === 'ok') {
      return response.data.articles;
    }

    return [];
  } catch (error) {
    logger.error('Error searching news:', error.message);
    return [];
  }
}

module.exports = {
  fetchFromNewsAPI,
  fetchAllCategories,
  fetchAndStoreNews,
  fetchFromSources,
  searchNews,
  processAndStoreArticle,
  // Indian news
  fetchIndianNews,
  fetchAllIndianCategories,
  searchIndianSources,
  fetchAndStoreIndianNews
};
