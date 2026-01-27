const axios = require('axios');
const logger = require('../utils/logger');

const X_API_BASE = 'https://api.twitter.com/2';

// News accounts to follow for reliable news
const NEWS_ACCOUNTS = [
  'Reuters', 'AP', 'BBCWorld', 'CNN', 'nytimes',
  'washingtonpost', 'WSJ', 'TheEconomist', 'FT',
  'guardian', 'NPR', 'CBSNews', 'ABCNews', 'NBCNews',
  'business', 'CNBC', 'Forbes', 'TIME', 'Newsweek'
];

class XAggregator {
  constructor() {
    this.bearerToken = process.env.X_BEARER_TOKEN;
    this.isConfigured = !!this.bearerToken;

    if (!this.isConfigured) {
      logger.warn('X/Twitter API not configured - X news aggregation disabled');
    }
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${this.bearerToken}`,
      'Content-Type': 'application/json'
    };
  }

  async searchNews(query, options = {}) {
    if (!this.isConfigured) {
      return { articles: [], meta: { result_count: 0 } };
    }

    const {
      maxResults = 100,
      startTime = null,
      endTime = null
    } = options;

    try {
      // Build search query - filter for news-like content
      const searchQuery = `${query} -is:retweet -is:reply lang:en has:links`;

      const params = new URLSearchParams({
        query: searchQuery,
        max_results: Math.min(maxResults, 100),
        'tweet.fields': 'created_at,public_metrics,author_id,entities,context_annotations',
        'user.fields': 'name,username,verified,description',
        'expansions': 'author_id,entities.mentions.username'
      });

      if (startTime) params.append('start_time', startTime);
      if (endTime) params.append('end_time', endTime);

      const response = await axios.get(
        `${X_API_BASE}/tweets/search/recent?${params}`,
        { headers: this.getHeaders() }
      );

      const { data, includes, meta } = response.data;

      if (!data || data.length === 0) {
        return { articles: [], meta: { result_count: 0 } };
      }

      // Map users by ID for easy lookup
      const usersMap = {};
      if (includes?.users) {
        includes.users.forEach(user => {
          usersMap[user.id] = user;
        });
      }

      // Transform tweets to article format
      const articles = data.map(tweet => this.transformTweetToArticle(tweet, usersMap));

      logger.info(`Fetched ${articles.length} posts from X for query: ${query}`);
      return { articles, meta };

    } catch (error) {
      if (error.response?.status === 429) {
        logger.warn('X API rate limit reached');
      } else {
        logger.error('X API error:', error.message);
      }
      return { articles: [], meta: { result_count: 0 } };
    }
  }

  async fetchFromNewsAccounts(options = {}) {
    if (!this.isConfigured) {
      return { articles: [], meta: { result_count: 0 } };
    }

    const { maxResults = 50 } = options;

    try {
      // Search for tweets from verified news accounts
      const accountsQuery = NEWS_ACCOUNTS.map(a => `from:${a}`).join(' OR ');
      const searchQuery = `(${accountsQuery}) -is:retweet -is:reply has:links`;

      const params = new URLSearchParams({
        query: searchQuery,
        max_results: Math.min(maxResults, 100),
        'tweet.fields': 'created_at,public_metrics,author_id,entities',
        'user.fields': 'name,username,verified',
        'expansions': 'author_id'
      });

      const response = await axios.get(
        `${X_API_BASE}/tweets/search/recent?${params}`,
        { headers: this.getHeaders() }
      );

      const { data, includes, meta } = response.data;

      if (!data || data.length === 0) {
        return { articles: [], meta: { result_count: 0 } };
      }

      const usersMap = {};
      if (includes?.users) {
        includes.users.forEach(user => {
          usersMap[user.id] = user;
        });
      }

      const articles = data.map(tweet => this.transformTweetToArticle(tweet, usersMap));

      logger.info(`Fetched ${articles.length} posts from X news accounts`);
      return { articles, meta };

    } catch (error) {
      logger.error('X API fetch from news accounts error:', error.message);
      return { articles: [], meta: { result_count: 0 } };
    }
  }

  async getTrendingNews(options = {}) {
    if (!this.isConfigured) {
      return { articles: [], meta: { result_count: 0 } };
    }

    const { maxResults = 50 } = options;

    try {
      // Search for trending news topics
      const searchQuery = '(breaking OR "breaking news" OR developing) -is:retweet -is:reply lang:en has:links';

      const params = new URLSearchParams({
        query: searchQuery,
        max_results: Math.min(maxResults, 100),
        'tweet.fields': 'created_at,public_metrics,author_id,entities,context_annotations',
        'user.fields': 'name,username,verified',
        'expansions': 'author_id',
        'sort_order': 'relevancy'
      });

      const response = await axios.get(
        `${X_API_BASE}/tweets/search/recent?${params}`,
        { headers: this.getHeaders() }
      );

      const { data, includes, meta } = response.data;

      if (!data || data.length === 0) {
        return { articles: [], meta: { result_count: 0 } };
      }

      const usersMap = {};
      if (includes?.users) {
        includes.users.forEach(user => {
          usersMap[user.id] = user;
        });
      }

      // Filter for high-engagement tweets
      const filtered = data.filter(tweet => {
        const metrics = tweet.public_metrics || {};
        return (metrics.retweet_count > 10 || metrics.like_count > 50);
      });

      const articles = filtered.map(tweet => this.transformTweetToArticle(tweet, usersMap));

      logger.info(`Fetched ${articles.length} trending news posts from X`);
      return { articles, meta };

    } catch (error) {
      logger.error('X API trending news error:', error.message);
      return { articles: [], meta: { result_count: 0 } };
    }
  }

  transformTweetToArticle(tweet, usersMap) {
    const user = usersMap[tweet.author_id] || {};
    const metrics = tweet.public_metrics || {};

    // Extract URLs from entities
    const urls = tweet.entities?.urls || [];
    const externalUrl = urls.find(u => !u.expanded_url?.includes('twitter.com'))?.expanded_url;

    // Calculate engagement score
    const engagement = (
      (metrics.retweet_count * 2) +
      (metrics.like_count) +
      (metrics.reply_count * 0.5) +
      (metrics.quote_count * 1.5)
    );

    return {
      externalId: `x_${tweet.id}`,
      title: tweet.text.substring(0, 100) + (tweet.text.length > 100 ? '...' : ''),
      description: tweet.text,
      content: tweet.text,
      url: `https://twitter.com/${user.username}/status/${tweet.id}`,
      externalUrl: externalUrl || null,
      urlToImage: null,
      publishedAt: new Date(tweet.created_at),
      source: {
        id: `x_${user.username}`,
        name: `X: @${user.username}`,
        type: 'social'
      },
      author: user.name || user.username,
      platform: 'x',
      metrics: {
        retweets: metrics.retweet_count || 0,
        likes: metrics.like_count || 0,
        replies: metrics.reply_count || 0,
        quotes: metrics.quote_count || 0,
        engagement
      },
      isVerified: user.verified || false,
      isNewsAccount: NEWS_ACCOUNTS.some(
        acc => acc.toLowerCase() === user.username?.toLowerCase()
      )
    };
  }
}

module.exports = new XAggregator();
