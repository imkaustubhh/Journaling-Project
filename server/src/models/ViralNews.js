const mongoose = require('mongoose');

/**
 * ViralNews Schema - Tracks trending/viral news stories and their verification status
 */
const ViralNewsSchema = new mongoose.Schema({
  // Core Story Information
  title: {
    type: String,
    required: true,
    trim: true
  },
  summary: {
    type: String,
    trim: true
  },
  keywords: [{
    type: String,
    lowercase: true
  }],
  hashtags: [{
    type: String,
    lowercase: true
  }],

  // Virality Metrics
  virality: {
    score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    firstDetected: {
      type: Date,
      default: Date.now
    },
    peakTime: Date,
    velocity: {
      type: Number, // How fast it's spreading (mentions/hour)
      default: 0
    },
    reach: {
      type: Number, // Estimated total reach
      default: 0
    },
    sourcesCount: {
      type: Number,
      default: 0
    }
  },

  // Verification Status
  verification: {
    status: {
      type: String,
      enum: ['unverified', 'under_review', 'verified_true', 'verified_false', 'partially_true', 'misleading', 'satire', 'opinion'],
      default: 'unverified'
    },
    confidenceScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    lastChecked: Date,
    checkedBy: {
      type: String,
      enum: ['auto', 'manual', 'fact_checker', 'ai'],
      default: 'auto'
    },
    verifiedAt: Date,
    verifierNotes: String
  },

  // Claims extracted from the story
  claims: [{
    text: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['factual', 'opinion', 'prediction', 'quote', 'statistic', 'event'],
      default: 'factual'
    },
    verification: {
      status: {
        type: String,
        enum: ['unverified', 'true', 'false', 'partially_true', 'misleading', 'unverifiable'],
        default: 'unverified'
      },
      evidence: [{
        source: String,
        url: String,
        supports: Boolean, // true = supports claim, false = contradicts
        excerpt: String,
        credibilityScore: Number
      }],
      confidenceScore: {
        type: Number,
        min: 0,
        max: 100
      }
    },
    extractedFrom: {
      articleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Article' },
      sourceName: String
    }
  }],

  // Related Articles covering this story
  relatedArticles: [{
    articleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Article' },
    url: String,
    title: String,
    source: String,
    publishedAt: Date,
    stance: {
      type: String,
      enum: ['supports', 'contradicts', 'neutral', 'different_angle'],
      default: 'neutral'
    },
    credibilityScore: Number
  }],

  // Social Media Presence
  socialMedia: {
    twitter: {
      mentionCount: { type: Number, default: 0 },
      sentiment: { type: String, enum: ['positive', 'negative', 'neutral', 'mixed'], default: 'neutral' },
      topTweets: [{
        id: String,
        username: String,
        text: String,
        engagement: Number,
        isVerified: Boolean
      }]
    },
    reddit: {
      postCount: { type: Number, default: 0 },
      topSubreddits: [String],
      sentiment: { type: String, enum: ['positive', 'negative', 'neutral', 'mixed'], default: 'neutral' }
    },
    overallSentiment: {
      type: String,
      enum: ['positive', 'negative', 'neutral', 'mixed'],
      default: 'neutral'
    }
  },

  // Fact-Checker References
  factChecks: [{
    source: {
      type: String,
      enum: ['alt_news', 'boom_live', 'snopes', 'politifact', 'factcheck_org', 'afp_factcheck', 'reuters_factcheck', 'other'],
      required: true
    },
    url: String,
    rating: String, // Their specific rating (each has different scales)
    normalizedRating: {
      type: String,
      enum: ['true', 'mostly_true', 'half_true', 'mostly_false', 'false', 'pants_on_fire', 'unrated']
    },
    summary: String,
    checkedAt: Date
  }],

  // Origin Tracking - Where did this story first appear?
  origin: {
    firstSource: {
      name: String,
      url: String,
      type: {
        type: String,
        enum: ['news', 'social_media', 'blog', 'official', 'unknown'],
        default: 'unknown'
      }
    },
    originalClaim: String,
    spreadPattern: [{
      source: String,
      timestamp: Date,
      modification: String // How the story changed
    }]
  },

  // Misinformation Analysis (if fake/misleading)
  misinformationAnalysis: {
    type: {
      type: String,
      enum: ['fabricated', 'manipulated', 'out_of_context', 'misleading_headline', 'satire_misunderstood', 'old_news_recycled', 'partial_truth', 'none'],
      default: 'none'
    },
    misleadingElements: [{
      element: String, // What part is misleading
      reality: String, // What the truth is
      source: String   // Where the correct info comes from
    }],
    intendedNarrative: String,
    actualFacts: String
  },

  // Categories/Topics
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  topics: [String],

  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isTrending: {
    type: Boolean,
    default: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  }

}, {
  timestamps: true
});

// Indexes
ViralNewsSchema.index({ 'virality.score': -1 });
ViralNewsSchema.index({ 'verification.status': 1 });
ViralNewsSchema.index({ keywords: 1 });
ViralNewsSchema.index({ createdAt: -1 });
ViralNewsSchema.index({ isTrending: 1, 'virality.score': -1 });
ViralNewsSchema.index({ '$**': 'text' }); // Full-text search

// Virtual for overall reliability
ViralNewsSchema.virtual('reliabilityScore').get(function() {
  const verificationWeight = 0.4;
  const sourceWeight = 0.3;
  const factCheckWeight = 0.3;

  let score = 50; // Base score

  // Verification status impact
  const verificationScores = {
    'verified_true': 100,
    'partially_true': 70,
    'unverified': 50,
    'under_review': 50,
    'misleading': 30,
    'verified_false': 10,
    'satire': 40,
    'opinion': 60
  };
  score = score * (1 - verificationWeight) + (verificationScores[this.verification.status] || 50) * verificationWeight;

  // Source credibility average
  if (this.relatedArticles.length > 0) {
    const avgCredibility = this.relatedArticles.reduce((sum, a) => sum + (a.credibilityScore || 50), 0) / this.relatedArticles.length;
    score = score * (1 - sourceWeight) + avgCredibility * sourceWeight;
  }

  // Fact-check results
  if (this.factChecks.length > 0) {
    const factCheckScores = {
      'true': 100, 'mostly_true': 80, 'half_true': 50,
      'mostly_false': 30, 'false': 10, 'pants_on_fire': 0
    };
    const avgFactCheck = this.factChecks.reduce((sum, fc) =>
      sum + (factCheckScores[fc.normalizedRating] || 50), 0) / this.factChecks.length;
    score = score * (1 - factCheckWeight) + avgFactCheck * factCheckWeight;
  }

  return Math.round(score);
});

// Methods
ViralNewsSchema.methods.addClaim = function(claimData) {
  this.claims.push(claimData);
  return this.save();
};

ViralNewsSchema.methods.updateVerification = function(status, confidence, notes) {
  this.verification.status = status;
  this.verification.confidenceScore = confidence;
  this.verification.verifierNotes = notes;
  this.verification.lastChecked = new Date();
  if (status !== 'unverified' && status !== 'under_review') {
    this.verification.verifiedAt = new Date();
  }
  return this.save();
};

ViralNewsSchema.methods.addFactCheck = function(factCheckData) {
  this.factChecks.push({
    ...factCheckData,
    checkedAt: new Date()
  });
  return this.save();
};

// Statics
ViralNewsSchema.statics.getTrending = function(limit = 10) {
  return this.find({ isTrending: true, isActive: true })
    .sort({ 'virality.score': -1 })
    .limit(limit)
    .populate('categories', 'name slug');
};

ViralNewsSchema.statics.getUnverified = function(limit = 20) {
  return this.find({
    'verification.status': 'unverified',
    isActive: true,
    'virality.score': { $gte: 30 } // Only high-virality unverified
  })
    .sort({ 'virality.score': -1 })
    .limit(limit);
};

ViralNewsSchema.statics.getFakeNews = function(limit = 20) {
  return this.find({
    'verification.status': { $in: ['verified_false', 'misleading'] },
    isActive: true
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

module.exports = mongoose.model('ViralNews', ViralNewsSchema);
