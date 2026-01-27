/**
 * Fact Checker Service
 * Cross-references news with fact-checking sources and analyzes claims
 */

const axios = require('axios');
const Article = require('../models/Article');
const ViralNews = require('../models/ViralNews');
const logger = require('../utils/logger');

// Known fact-checking websites and their APIs/RSS feeds
const FACT_CHECK_SOURCES = {
  alt_news: {
    name: 'Alt News',
    domain: 'altnews.in',
    searchUrl: 'https://www.altnews.in/?s=',
    country: 'india',
    credibilityScore: 82
  },
  boom_live: {
    name: 'Boom Live',
    domain: 'boomlive.in',
    searchUrl: 'https://www.boomlive.in/search?q=',
    country: 'india',
    credibilityScore: 80
  },
  snopes: {
    name: 'Snopes',
    domain: 'snopes.com',
    searchUrl: 'https://www.snopes.com/?s=',
    country: 'usa',
    credibilityScore: 85
  },
  politifact: {
    name: 'PolitiFact',
    domain: 'politifact.com',
    searchUrl: 'https://www.politifact.com/search/?q=',
    country: 'usa',
    credibilityScore: 88
  },
  factcheck_org: {
    name: 'FactCheck.org',
    domain: 'factcheck.org',
    searchUrl: 'https://www.factcheck.org/?s=',
    country: 'usa',
    credibilityScore: 90
  },
  afp_factcheck: {
    name: 'AFP Fact Check',
    domain: 'factcheck.afp.com',
    searchUrl: 'https://factcheck.afp.com/search?search=',
    country: 'international',
    credibilityScore: 92
  },
  reuters_factcheck: {
    name: 'Reuters Fact Check',
    domain: 'reuters.com/fact-check',
    searchUrl: 'https://www.reuters.com/site-search/?query=',
    country: 'international',
    credibilityScore: 95
  }
};

// Misinformation patterns to detect
const MISINFORMATION_PATTERNS = {
  fabricated: [
    /breaking\s*:?\s*\d+\s*(dead|killed|injured)/i,
    /exposed\s*:?\s*(secret|hidden|truth)/i,
    /they\s+don'?t\s+want\s+you\s+to\s+know/i
  ],
  clickbait: [
    /you\s+won'?t\s+believe/i,
    /what\s+happened\s+next/i,
    /shocking\s+(truth|revelation|secret)/i,
    /\d+\s+reasons?\s+why/i
  ],
  emotional_manipulation: [
    /(outrage|outraged|furious|anger|angry)\s+over/i,
    /slam(s|med)?\s+/i,
    /destroy(s|ed)?\s+/i,
    /epic(ally)?\s+(fail|burn|destroy)/i
  ],
  out_of_context: [
    /old\s+(video|photo|image|news)/i,
    /resurfaced\s+(video|photo|clip)/i
  ]
};

// Claim extraction patterns
const CLAIM_PATTERNS = {
  statistic: /(\d+[\.,]?\d*)\s*(percent|%|million|billion|crore|lakh|thousand)/gi,
  quote: /"([^"]+)"\s*(?:said|says|stated|claimed|according to)\s*([A-Z][a-z]+\s+[A-Z][a-z]+)?/gi,
  event: /(happened|occurred|took place|broke out)\s+(in|at|on)\s+([A-Z][a-zA-Z\s]+)/gi,
  date_claim: /(on|since|from|until)\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}|January|February|March|April|May|June|July|August|September|October|November|December)/gi
};

/**
 * Detect viral stories by analyzing article patterns
 */
async function detectViralStories() {
  logger.info('Detecting viral stories...');

  try {
    // Get articles from last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Find clusters of articles about same topic
    const articles = await Article.aggregate([
      {
        $match: {
          publishedAt: { $gte: oneDayAgo },
          isActive: true
        }
      },
      {
        $group: {
          _id: { $toLower: { $arrayElemAt: [{ $split: ['$title', ':'] }, 0] } },
          count: { $sum: 1 },
          articles: {
            $push: {
              id: '$_id',
              title: '$title',
              source: '$source.name',
              url: '$url',
              publishedAt: '$publishedAt',
              score: '$filteringMetadata.overallScore'
            }
          },
          sources: { $addToSet: '$source.name' },
          avgScore: { $avg: '$filteringMetadata.overallScore' }
        }
      },
      {
        $match: { count: { $gte: 3 } } // At least 3 sources covering
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 20
      }
    ]);

    const viralStories = [];

    for (const cluster of articles) {
      // Check if already tracked
      const existing = await ViralNews.findOne({
        keywords: { $in: cluster._id.split(' ').filter(w => w.length > 3) }
      });

      if (!existing) {
        const viralNews = new ViralNews({
          title: cluster.articles[0].title,
          keywords: cluster._id.split(' ').filter(w => w.length > 3),
          virality: {
            score: Math.min(100, cluster.count * 10 + cluster.avgScore * 0.5),
            sourcesCount: cluster.sources.length,
            velocity: cluster.count / 24 // articles per hour
          },
          relatedArticles: cluster.articles.map(a => ({
            articleId: a.id,
            url: a.url,
            title: a.title,
            source: a.source,
            publishedAt: a.publishedAt,
            credibilityScore: a.score
          }))
        });

        await viralNews.save();
        viralStories.push(viralNews);
      }
    }

    logger.info(`Detected ${viralStories.length} new viral stories`);
    return viralStories;
  } catch (error) {
    logger.error('Error detecting viral stories:', error);
    return [];
  }
}

/**
 * Extract claims from text
 */
function extractClaims(text) {
  const claims = [];

  // Extract statistics
  const statMatches = text.matchAll(CLAIM_PATTERNS.statistic);
  for (const match of statMatches) {
    claims.push({
      text: match[0],
      type: 'statistic',
      verification: { status: 'unverified' }
    });
  }

  // Extract quotes
  const quoteMatches = text.matchAll(CLAIM_PATTERNS.quote);
  for (const match of quoteMatches) {
    claims.push({
      text: match[0],
      type: 'quote',
      verification: { status: 'unverified' }
    });
  }

  // Extract event claims
  const eventMatches = text.matchAll(CLAIM_PATTERNS.event);
  for (const match of eventMatches) {
    claims.push({
      text: match[0],
      type: 'event',
      verification: { status: 'unverified' }
    });
  }

  return claims;
}

/**
 * Analyze text for misinformation patterns
 */
function analyzeForMisinformation(title, content) {
  const analysis = {
    type: 'none',
    flags: [],
    riskScore: 0
  };

  const fullText = `${title} ${content || ''}`;

  // Check for fabricated content patterns
  for (const pattern of MISINFORMATION_PATTERNS.fabricated) {
    if (pattern.test(fullText)) {
      analysis.flags.push('fabricated_pattern');
      analysis.riskScore += 30;
    }
  }

  // Check for clickbait
  for (const pattern of MISINFORMATION_PATTERNS.clickbait) {
    if (pattern.test(fullText)) {
      analysis.flags.push('clickbait');
      analysis.riskScore += 15;
    }
  }

  // Check for emotional manipulation
  for (const pattern of MISINFORMATION_PATTERNS.emotional_manipulation) {
    if (pattern.test(fullText)) {
      analysis.flags.push('emotional_manipulation');
      analysis.riskScore += 10;
    }
  }

  // Check for out of context indicators
  for (const pattern of MISINFORMATION_PATTERNS.out_of_context) {
    if (pattern.test(fullText)) {
      analysis.flags.push('possibly_old_content');
      analysis.riskScore += 20;
    }
  }

  // Determine type based on flags
  if (analysis.flags.includes('fabricated_pattern')) {
    analysis.type = 'fabricated';
  } else if (analysis.flags.includes('possibly_old_content')) {
    analysis.type = 'out_of_context';
  } else if (analysis.flags.includes('clickbait')) {
    analysis.type = 'misleading_headline';
  }

  return analysis;
}

/**
 * Cross-reference a claim with multiple sources
 */
async function crossReferenceWithSources(claim, relatedArticles) {
  const evidence = [];

  for (const article of relatedArticles) {
    // Simple text matching for now
    const articleData = await Article.findById(article.articleId);
    if (!articleData) continue;

    const articleText = `${articleData.title} ${articleData.description || ''} ${articleData.content || ''}`.toLowerCase();
    const claimWords = claim.text.toLowerCase().split(' ').filter(w => w.length > 3);

    const matchCount = claimWords.filter(word => articleText.includes(word)).length;
    const matchRatio = matchCount / claimWords.length;

    if (matchRatio > 0.5) {
      evidence.push({
        source: article.source,
        url: article.url,
        supports: matchRatio > 0.7,
        excerpt: articleData.description?.substring(0, 200),
        credibilityScore: article.credibilityScore || 50
      });
    }
  }

  return evidence;
}

/**
 * Calculate verification confidence based on evidence
 */
function calculateVerificationConfidence(evidence, factChecks) {
  if (evidence.length === 0 && factChecks.length === 0) {
    return { status: 'unverified', confidence: 0 };
  }

  let supportingCount = 0;
  let contradictingCount = 0;
  let totalCredibility = 0;

  // Analyze article evidence
  for (const e of evidence) {
    if (e.supports) {
      supportingCount++;
    } else {
      contradictingCount++;
    }
    totalCredibility += e.credibilityScore || 50;
  }

  // Analyze fact-checks (heavily weighted)
  const factCheckWeight = 3; // Fact-checks count 3x
  for (const fc of factChecks) {
    const rating = fc.normalizedRating;
    if (['true', 'mostly_true'].includes(rating)) {
      supportingCount += factCheckWeight;
    } else if (['false', 'mostly_false', 'pants_on_fire'].includes(rating)) {
      contradictingCount += factCheckWeight;
    }
  }

  const total = supportingCount + contradictingCount;
  if (total === 0) {
    return { status: 'unverified', confidence: 0 };
  }

  const supportRatio = supportingCount / total;

  let status;
  if (supportRatio >= 0.8) {
    status = 'verified_true';
  } else if (supportRatio >= 0.6) {
    status = 'partially_true';
  } else if (supportRatio >= 0.4) {
    status = 'misleading';
  } else {
    status = 'verified_false';
  }

  const confidence = Math.round(Math.abs(supportRatio - 0.5) * 2 * 100);

  return { status, confidence };
}

/**
 * Verify a viral news story
 */
async function verifyViralNews(viralNewsId) {
  try {
    const viralNews = await ViralNews.findById(viralNewsId);
    if (!viralNews) {
      throw new Error('Viral news not found');
    }

    logger.info(`Verifying viral news: ${viralNews.title}`);

    // Mark as under review
    viralNews.verification.status = 'under_review';
    viralNews.verification.lastChecked = new Date();
    viralNews.verification.checkedBy = 'auto';

    // Extract claims if not already done
    if (viralNews.claims.length === 0) {
      const articleTexts = [];
      for (const related of viralNews.relatedArticles.slice(0, 5)) {
        const article = await Article.findById(related.articleId);
        if (article) {
          articleTexts.push(`${article.title} ${article.description || ''}`);
        }
      }

      const claims = extractClaims(articleTexts.join(' '));
      viralNews.claims = claims;
    }

    // Cross-reference claims with sources
    for (let i = 0; i < viralNews.claims.length; i++) {
      const claim = viralNews.claims[i];
      const evidence = await crossReferenceWithSources(claim, viralNews.relatedArticles);
      viralNews.claims[i].verification.evidence = evidence;

      const { status, confidence } = calculateVerificationConfidence(evidence, []);
      viralNews.claims[i].verification.status = status;
      viralNews.claims[i].verification.confidenceScore = confidence;
    }

    // Analyze for misinformation patterns
    const misinfoAnalysis = analyzeForMisinformation(viralNews.title, viralNews.summary);
    if (misinfoAnalysis.type !== 'none') {
      viralNews.misinformationAnalysis.type = misinfoAnalysis.type;
    }

    // Calculate overall verification
    const { status, confidence } = calculateVerificationConfidence(
      viralNews.claims.flatMap(c => c.verification.evidence || []),
      viralNews.factChecks
    );

    // Adjust based on misinformation flags
    let finalStatus = status;
    let finalConfidence = confidence;

    if (misinfoAnalysis.riskScore > 50) {
      if (status === 'verified_true') {
        finalStatus = 'partially_true';
      } else if (status === 'partially_true') {
        finalStatus = 'misleading';
      }
      finalConfidence = Math.max(0, confidence - misinfoAnalysis.riskScore);
    }

    viralNews.verification.status = finalStatus;
    viralNews.verification.confidenceScore = finalConfidence;
    viralNews.verification.verifiedAt = new Date();

    await viralNews.save();

    logger.info(`Verified viral news "${viralNews.title}" - Status: ${finalStatus}, Confidence: ${finalConfidence}%`);

    return viralNews;
  } catch (error) {
    logger.error('Error verifying viral news:', error);
    throw error;
  }
}

/**
 * Get verification summary for a story
 */
function getVerificationSummary(viralNews) {
  const summary = {
    title: viralNews.title,
    verificationStatus: viralNews.verification.status,
    confidenceScore: viralNews.verification.confidenceScore,
    viralityScore: viralNews.virality.score,
    sourcesCount: viralNews.relatedArticles.length,
    factChecksCount: viralNews.factChecks.length,
    claimsAnalyzed: viralNews.claims.length,
    claimsSummary: {
      verified_true: 0,
      verified_false: 0,
      partially_true: 0,
      unverified: 0
    },
    misinformationType: viralNews.misinformationAnalysis?.type || 'none',
    recommendation: ''
  };

  // Count claim statuses
  for (const claim of viralNews.claims) {
    const status = claim.verification?.status || 'unverified';
    if (summary.claimsSummary[status] !== undefined) {
      summary.claimsSummary[status]++;
    }
  }

  // Generate recommendation
  switch (viralNews.verification.status) {
    case 'verified_true':
      summary.recommendation = 'This story appears to be accurate based on multiple credible sources.';
      break;
    case 'verified_false':
      summary.recommendation = 'This story has been debunked. Exercise caution before sharing.';
      break;
    case 'partially_true':
      summary.recommendation = 'This story contains both accurate and inaccurate elements. Verify specific claims.';
      break;
    case 'misleading':
      summary.recommendation = 'This story may be misleading. Check the original sources for context.';
      break;
    default:
      summary.recommendation = 'This story has not been fully verified. Wait for more information.';
  }

  return summary;
}

module.exports = {
  detectViralStories,
  extractClaims,
  analyzeForMisinformation,
  crossReferenceWithSources,
  verifyViralNews,
  getVerificationSummary,
  FACT_CHECK_SOURCES,
  MISINFORMATION_PATTERNS
};
