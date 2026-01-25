/**
 * Keyword Filter Service (Layer 1)
 * Detects clickbait and sensational language in articles
 */

// Clickbait patterns - phrases commonly used in misleading headlines
const CLICKBAIT_PATTERNS = [
  "you won't believe",
  "you won't believe what",
  "what happened next",
  "this is why",
  "the reason is",
  "will blow your mind",
  "will shock you",
  "number \\d+ will",
  "one weird trick",
  "doctors hate",
  "scientists are baffled",
  "this simple trick",
  "you need to see",
  "goes viral",
  "the internet is",
  "everyone is talking about",
  "you're doing it wrong",
  "what they don't want you to know",
  "the truth about",
  "exposed",
  "you'll never guess",
  "this changes everything",
  "mind-blowing",
  "jaw-dropping"
];

// Sensational words - emotionally charged language
const SENSATIONAL_WORDS = [
  'shocking',
  'explosive',
  'bombshell',
  'devastating',
  'horrifying',
  'terrifying',
  'outrageous',
  'insane',
  'crazy',
  'unbelievable',
  'incredible',
  'amazing',
  'stunning',
  'breaking',
  'urgent',
  'emergency',
  'crisis',
  'disaster',
  'catastrophe',
  'scandal',
  'chaos',
  'rage',
  'fury',
  'slams',
  'destroys',
  'obliterates',
  'annihilates',
  'epic',
  'massive',
  'huge',
  'brutal'
];

// Quality indicators - words that suggest factual reporting
const QUALITY_INDICATORS = [
  'according to',
  'research shows',
  'study finds',
  'data indicates',
  'experts say',
  'report states',
  'analysis reveals',
  'evidence suggests',
  'officials confirm',
  'sources report'
];

/**
 * Analyze article text for clickbait and sensational content
 * @param {Object} article - Article object with title, description, content
 * @returns {Object} Filter results with scores
 */
function analyzeKeywords(article) {
  const title = (article.title || '').toLowerCase();
  const description = (article.description || '').toLowerCase();
  const content = (article.content || '').toLowerCase();

  // Combine text for analysis (weight title more heavily)
  const titleText = title;
  const fullText = `${title} ${description} ${content}`;

  // Check for clickbait patterns
  const clickbaitMatches = [];
  for (const pattern of CLICKBAIT_PATTERNS) {
    const regex = new RegExp(pattern, 'gi');
    if (regex.test(titleText)) {
      clickbaitMatches.push(pattern);
    }
  }

  // Check for sensational words
  const sensationalMatches = [];
  for (const word of SENSATIONAL_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    // Weight title matches more heavily
    if (regex.test(titleText)) {
      sensationalMatches.push(word);
      sensationalMatches.push(word); // Double count for title
    } else if (regex.test(fullText)) {
      sensationalMatches.push(word);
    }
  }

  // Check for quality indicators (positive signal)
  const qualityMatches = [];
  for (const indicator of QUALITY_INDICATORS) {
    if (fullText.includes(indicator.toLowerCase())) {
      qualityMatches.push(indicator);
    }
  }

  // Calculate scores (0-100, lower = more clickbait/sensational)
  // More matches = higher penalty
  const clickbaitScore = Math.min(100, clickbaitMatches.length * 30);
  const sensationalismScore = Math.min(100, sensationalMatches.length * 15);

  // Quality bonus (reduces penalty)
  const qualityBonus = Math.min(30, qualityMatches.length * 10);

  // Combined score (inverted - higher is better)
  // Start at 100, subtract penalties, add bonus
  let score = 100 - ((clickbaitScore + sensationalismScore) / 2) + qualityBonus;
  score = Math.max(0, Math.min(100, score)); // Clamp to 0-100

  // Article passes if score is above threshold
  const passed = score >= 50;

  return {
    passed,
    score: Math.round(score),
    flaggedKeywords: [...new Set([...clickbaitMatches, ...sensationalMatches])],
    clickbaitScore: Math.round(clickbaitScore),
    sensationalismScore: Math.round(sensationalismScore),
    qualityIndicators: qualityMatches,
    details: {
      clickbaitMatches: clickbaitMatches.length,
      sensationalMatches: sensationalMatches.length,
      qualityMatches: qualityMatches.length
    }
  };
}

/**
 * Quick check if title looks like clickbait
 * @param {string} title - Article title
 * @returns {boolean} True if likely clickbait
 */
function isLikelyClickbait(title) {
  const titleLower = title.toLowerCase();

  // Quick checks
  if (titleLower.includes('?') && titleLower.includes('!')) return true;
  if ((titleLower.match(/!/g) || []).length > 1) return true;

  for (const pattern of CLICKBAIT_PATTERNS) {
    if (new RegExp(pattern, 'i').test(titleLower)) {
      return true;
    }
  }

  return false;
}

module.exports = {
  analyzeKeywords,
  isLikelyClickbait,
  CLICKBAIT_PATTERNS,
  SENSATIONAL_WORDS,
  QUALITY_INDICATORS
};
