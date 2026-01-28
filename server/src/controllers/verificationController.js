/**
 * Verification Controller
 * Handles manual news verification requests from users
 */

const axios = require('axios');
const Article = require('../models/Article');
const { analyzeWithAI } = require('../services/aiAnalyzer');
const { analyzeForMisinformation, extractClaims, crossReferenceWithSources } = require('../services/factChecker');
const { getSourceCredibility } = require('../services/credibilityService');
const logger = require('../utils/logger');

/**
 * Fetch article content from URL
 */
async function fetchArticleFromURL(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    // Extract basic metadata (simple extraction - can be enhanced with cheerio)
    const html = response.data;

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'Untitled';

    // Extract meta description
    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    const description = descMatch ? descMatch[1].trim() : '';

    // Extract domain/source
    const urlObj = new URL(url);
    const source = urlObj.hostname.replace('www.', '');

    return {
      title,
      description,
      url,
      source: { name: source, url: urlObj.origin },
      content: description // Use description as content for now
    };
  } catch (error) {
    logger.error('Error fetching URL:', error.message);
    throw new Error('Unable to fetch article from URL. Please check if the URL is valid and accessible.');
  }
}

/**
 * Search for articles by keywords
 */
async function searchArticlesByKeywords(keywords) {
  try {
    const searchQuery = keywords.trim();

    // Search in existing articles
    const articles = await Article.find({
      $or: [
        { title: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } }
      ],
      isActive: true
    })
      .sort({ publishedAt: -1 })
      .limit(10)
      .lean();

    return articles;
  } catch (error) {
    logger.error('Error searching articles:', error.message);
    return [];
  }
}

/**
 * Verify news by URL
 */
exports.verifyByURL = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url || !url.startsWith('http')) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid URL starting with http:// or https://'
      });
    }

    logger.info(`Verifying URL: ${url}`);

    // Fetch article content
    const articleData = await fetchArticleFromURL(url);

    // Check if article already exists in database
    const existingArticle = await Article.findOne({ url }).lean();
    if (existingArticle && existingArticle.filteringMetadata) {
      return res.json({
        success: true,
        source: 'database',
        verification: {
          title: existingArticle.title,
          source: existingArticle.source,
          url: existingArticle.url,
          publishedAt: existingArticle.publishedAt,
          overallScore: existingArticle.filteringMetadata.overallScore,
          credibilityScore: existingArticle.filteringMetadata.credibility?.overallScore || 50,
          qualityScore: existingArticle.filteringMetadata.aiAnalysis?.qualityScore || 50,
          biasScore: existingArticle.filteringMetadata.aiAnalysis?.biasScore || 0,
          isFactual: existingArticle.filteringMetadata.aiAnalysis?.isFactual,
          sentiment: existingArticle.filteringMetadata.aiAnalysis?.sentiment,
          status: existingArticle.curation?.status || 'unknown',
          recommendation: generateRecommendation(existingArticle.filteringMetadata)
        }
      });
    }

    // Perform fresh analysis
    const [aiAnalysis, misinfoAnalysis, sourceCredibility] = await Promise.all([
      analyzeWithAI(articleData),
      Promise.resolve(analyzeForMisinformation(articleData.title, articleData.description)),
      getSourceCredibility(articleData.source.name)
    ]);

    // Extract claims
    const claims = extractClaims(`${articleData.title} ${articleData.description}`);

    // Calculate overall score
    const overallScore = Math.round(
      (aiAnalysis.qualityScore * 0.35) +
      (aiAnalysis.credibilityScore * 0.35) +
      (sourceCredibility * 0.30)
    );

    const verification = {
      title: articleData.title,
      source: articleData.source,
      url: articleData.url,
      overallScore,
      credibilityScore: aiAnalysis.credibilityScore,
      qualityScore: aiAnalysis.qualityScore,
      biasScore: aiAnalysis.biasScore,
      isFactual: aiAnalysis.isFactual,
      sentiment: aiAnalysis.sentiment,
      sourceCredibility,
      misinformation: {
        type: misinfoAnalysis.type,
        flags: misinfoAnalysis.flags,
        riskScore: misinfoAnalysis.riskScore
      },
      claims: claims.slice(0, 5), // Top 5 claims
      recommendation: generateRecommendation({
        overallScore,
        aiAnalysis,
        credibility: { overallScore: sourceCredibility },
        misinformation: misinfoAnalysis
      })
    };

    res.json({
      success: true,
      source: 'fresh_analysis',
      verification
    });

  } catch (error) {
    logger.error('Error verifying URL:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify URL'
    });
  }
};

/**
 * Verify news by keywords
 */
exports.verifyByKeywords = async (req, res) => {
  try {
    const { keywords } = req.body;

    if (!keywords || keywords.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Please provide keywords (at least 3 characters)'
      });
    }

    logger.info(`Searching for: ${keywords}`);

    // Search for related articles
    const articles = await searchArticlesByKeywords(keywords);

    if (articles.length === 0) {
      return res.json({
        success: true,
        found: false,
        message: 'No articles found matching your keywords. Try different search terms.',
        articles: []
      });
    }

    // Analyze the search results
    const avgScore = articles.reduce((sum, a) => sum + (a.filteringMetadata?.overallScore || 0), 0) / articles.length;
    const highCredibilitySources = articles.filter(a => (a.filteringMetadata?.credibility?.overallScore || 0) >= 70).length;
    const lowCredibilitySources = articles.filter(a => (a.filteringMetadata?.credibility?.overallScore || 0) < 50).length;

    // Analyze misinformation patterns across articles
    const misinfoTypes = articles.map(a => {
      const analysis = analyzeForMisinformation(a.title, a.description);
      return analysis.type;
    }).filter(t => t !== 'none');

    const verification = {
      keywords,
      articlesFound: articles.length,
      averageScore: Math.round(avgScore),
      sourcesAnalysis: {
        highCredibility: highCredibilitySources,
        lowCredibility: lowCredibilitySources,
        total: articles.length
      },
      misinformationFlags: [...new Set(misinfoTypes)],
      articles: articles.slice(0, 5).map(a => ({
        id: a._id,
        title: a.title,
        source: a.source?.name,
        url: a.url,
        publishedAt: a.publishedAt,
        score: a.filteringMetadata?.overallScore || 0,
        credibilityScore: a.filteringMetadata?.credibility?.overallScore || 0
      })),
      recommendation: generateKeywordRecommendation({
        avgScore,
        articlesCount: articles.length,
        highCredibilitySources,
        lowCredibilitySources,
        misinfoTypes
      })
    };

    res.json({
      success: true,
      found: true,
      verification
    });

  } catch (error) {
    logger.error('Error verifying keywords:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify keywords'
    });
  }
};

/**
 * Generate recommendation based on verification results
 */
function generateRecommendation(metadata) {
  const score = metadata.overallScore || 0;
  const misinfoType = metadata.misinformation?.type || metadata.aiAnalysis?.misinformation?.type;

  if (misinfoType && misinfoType !== 'none') {
    return `⚠️ Warning: This article shows signs of ${misinfoType.replace(/_/g, ' ')}. Exercise caution before sharing.`;
  }

  if (score >= 80) {
    return '✅ This article appears highly credible based on our analysis. Multiple quality indicators suggest reliable reporting.';
  } else if (score >= 60) {
    return '✓ This article shows reasonable credibility. Review the source and cross-check key claims if important.';
  } else if (score >= 40) {
    return '⚠️ This article has mixed credibility signals. Verify important claims with other trusted sources.';
  } else {
    return '❌ This article shows low credibility indicators. Strong recommendation to verify with multiple trusted sources.';
  }
}

/**
 * Generate recommendation for keyword search results
 */
function generateKeywordRecommendation({ avgScore, articlesCount, highCredibilitySources, lowCredibilitySources, misinfoTypes }) {
  if (misinfoTypes.length > articlesCount / 2) {
    return '🚨 High misinformation risk: Many articles about this topic show problematic patterns. Verify carefully with trusted sources.';
  }

  if (highCredibilitySources >= articlesCount * 0.7) {
    return `✅ Well-covered topic: Found ${articlesCount} articles, most from credible sources. This appears to be legitimate news.`;
  }

  if (lowCredibilitySources >= articlesCount * 0.7) {
    return `⚠️ Low credibility sources: Most articles are from sources with credibility concerns. Verify with established news outlets.`;
  }

  if (avgScore >= 70) {
    return `✓ Generally reliable: ${articlesCount} articles found with good average credibility (${Math.round(avgScore)}/100).`;
  } else if (avgScore >= 50) {
    return `⚠️ Mixed credibility: ${articlesCount} articles found with varying quality. Cross-check important details.`;
  } else {
    return `❌ Low credibility: Articles about this topic show concerning patterns. Treat with skepticism.`;
  }
}
