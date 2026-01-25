/**
 * AI Analyzer Service (Layer 3)
 * Uses OpenAI to analyze article quality, bias, and credibility
 * Falls back to heuristic analysis when API key not configured
 */

const OpenAI = require('openai');
const logger = require('../utils/logger');

let openai = null;

// Initialize OpenAI client if API key is available
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  logger.info('OpenAI client initialized');
} else {
  logger.warn('OpenAI API key not configured. Using heuristic analysis.');
}

/**
 * Analyze article using OpenAI GPT
 * @param {Object} article - Article to analyze
 * @returns {Object} AI analysis results
 */
async function analyzeWithAI(article) {
  if (!openai) {
    return analyzeWithHeuristics(article);
  }

  try {
    const prompt = `Analyze this news article and provide scores. Be objective and factual.

Title: ${article.title}
Source: ${article.source?.name || 'Unknown'}
Description: ${article.description || 'N/A'}
Content: ${(article.content || '').substring(0, 1500)}

Respond ONLY with valid JSON in this exact format:
{
  "qualityScore": <0-100 based on writing quality, depth, evidence>,
  "biasScore": <-100 to 100, negative=left bias, positive=right bias, 0=neutral>,
  "credibilityScore": <0-100 based on factual claims, sources cited>,
  "sentiment": <"positive" | "neutral" | "negative">,
  "isOpinion": <true if opinion piece, false if factual reporting>,
  "isFactual": <true if fact-based, false if speculation>
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a news analysis expert. Respond only with valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 200
    });

    const content = response.choices[0]?.message?.content;
    const analysis = JSON.parse(content);

    return {
      qualityScore: Math.max(0, Math.min(100, analysis.qualityScore || 50)),
      biasScore: Math.max(-100, Math.min(100, analysis.biasScore || 0)),
      credibilityScore: Math.max(0, Math.min(100, analysis.credibilityScore || 50)),
      sentiment: analysis.sentiment || 'unknown',
      isOpinion: Boolean(analysis.isOpinion),
      isFactual: analysis.isFactual !== false,
      analyzedAt: new Date(),
      model: 'gpt-3.5-turbo'
    };

  } catch (error) {
    logger.error('AI analysis failed:', error.message);
    return analyzeWithHeuristics(article);
  }
}

/**
 * Heuristic analysis when AI is not available
 * Uses text patterns and source data for scoring
 */
function analyzeWithHeuristics(article) {
  const title = (article.title || '').toLowerCase();
  const description = (article.description || '').toLowerCase();
  const content = (article.content || '').toLowerCase();
  const fullText = `${title} ${description} ${content}`;

  // Quality indicators
  const qualityPatterns = [
    'according to', 'research shows', 'study finds', 'data indicates',
    'experts say', 'officials confirm', 'report states', 'analysis'
  ];
  const qualityMatches = qualityPatterns.filter(p => fullText.includes(p)).length;

  // Opinion indicators
  const opinionPatterns = [
    'i think', 'i believe', 'in my opinion', 'arguably', 'seems like',
    'opinion:', 'editorial:', 'commentary:', 'perspective:'
  ];
  const opinionMatches = opinionPatterns.filter(p => fullText.includes(p)).length;

  // Sensational indicators (lower quality)
  const sensationalPatterns = [
    'shocking', 'breaking', 'urgent', 'explosive', 'bombshell',
    'you won\'t believe', 'unbelievable', 'incredible'
  ];
  const sensationalMatches = sensationalPatterns.filter(p => fullText.includes(p)).length;

  // Sentiment analysis (simple)
  const positiveWords = ['success', 'win', 'good', 'great', 'positive', 'growth', 'improve'];
  const negativeWords = ['fail', 'loss', 'bad', 'crisis', 'disaster', 'decline', 'problem'];
  const positiveCount = positiveWords.filter(w => fullText.includes(w)).length;
  const negativeCount = negativeWords.filter(w => fullText.includes(w)).length;

  // Calculate scores
  let qualityScore = 60;
  qualityScore += qualityMatches * 5;
  qualityScore -= sensationalMatches * 10;
  qualityScore -= opinionMatches * 5;
  if (content.length > 500) qualityScore += 5;
  if (content.length > 1000) qualityScore += 5;

  const credibilityScore = Math.min(100, Math.max(0, qualityScore + (qualityMatches * 3)));

  let sentiment = 'neutral';
  if (positiveCount > negativeCount + 2) sentiment = 'positive';
  if (negativeCount > positiveCount + 2) sentiment = 'negative';

  return {
    qualityScore: Math.max(0, Math.min(100, qualityScore)),
    biasScore: 0, // Cannot determine bias without AI
    credibilityScore: Math.max(0, Math.min(100, credibilityScore)),
    sentiment,
    isOpinion: opinionMatches > 0,
    isFactual: opinionMatches === 0 && sensationalMatches < 2,
    analyzedAt: new Date(),
    model: 'heuristic-v1'
  };
}

/**
 * Check if AI analysis is available
 */
function isAIAvailable() {
  return openai !== null;
}

/**
 * Batch analyze multiple articles
 */
async function analyzeArticles(articles, options = {}) {
  const { delay = 1000 } = options; // Delay between API calls
  const results = [];

  for (const article of articles) {
    const analysis = await analyzeWithAI(article);
    results.push({ articleId: article._id, analysis });

    if (openai && delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return results;
}

module.exports = {
  analyzeWithAI,
  analyzeWithHeuristics,
  analyzeArticles,
  isAIAvailable
};
