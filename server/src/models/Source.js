const mongoose = require('mongoose');

const SourceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Source name is required'],
    unique: true,
    trim: true,
    index: true
  },
  url: {
    type: String,
    trim: true
  },
  domain: {
    type: String,
    trim: true,
    index: true
  },

  // Credibility Information
  credibilityRating: {
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    biasRating: {
      type: String,
      enum: ['left', 'center-left', 'center', 'center-right', 'right', 'unknown'],
      default: 'unknown'
    },
    factualReporting: {
      type: String,
      enum: ['very-high', 'high', 'mixed', 'low', 'very-low', 'unknown'],
      default: 'unknown'
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    source: {
      type: String,
      default: 'manual'
    }
  },

  // Configuration
  isEnabled: {
    type: Boolean,
    default: true
  },
  fetchFrequency: {
    type: Number,
    default: 60 // minutes
  },
  lastFetched: Date,

  // Statistics
  stats: {
    totalArticlesFetched: {
      type: Number,
      default: 0
    },
    articlesApproved: {
      type: Number,
      default: 0
    },
    articlesRejected: {
      type: Number,
      default: 0
    },
    averageQualityScore: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Default credibility ratings for major news sources
SourceSchema.statics.DEFAULT_RATINGS = {
  'Reuters': { overallScore: 95, biasRating: 'center', factualReporting: 'very-high' },
  'Associated Press': { overallScore: 95, biasRating: 'center', factualReporting: 'very-high' },
  'BBC News': { overallScore: 90, biasRating: 'center-left', factualReporting: 'high' },
  'BBC': { overallScore: 90, biasRating: 'center-left', factualReporting: 'high' },
  'NPR': { overallScore: 88, biasRating: 'center-left', factualReporting: 'high' },
  'PBS': { overallScore: 88, biasRating: 'center', factualReporting: 'high' },
  'The Guardian': { overallScore: 85, biasRating: 'left', factualReporting: 'high' },
  'The New York Times': { overallScore: 85, biasRating: 'center-left', factualReporting: 'high' },
  'The Washington Post': { overallScore: 85, biasRating: 'center-left', factualReporting: 'high' },
  'Wall Street Journal': { overallScore: 85, biasRating: 'center-right', factualReporting: 'high' },
  'The Economist': { overallScore: 88, biasRating: 'center', factualReporting: 'high' },
  'Financial Times': { overallScore: 88, biasRating: 'center', factualReporting: 'high' },
  'Bloomberg': { overallScore: 85, biasRating: 'center', factualReporting: 'high' },
  'Al Jazeera English': { overallScore: 75, biasRating: 'center-left', factualReporting: 'mixed' },
  'CNN': { overallScore: 70, biasRating: 'left', factualReporting: 'mixed' },
  'Fox News': { overallScore: 55, biasRating: 'right', factualReporting: 'mixed' },
  'MSNBC': { overallScore: 60, biasRating: 'left', factualReporting: 'mixed' },
  'Breitbart News': { overallScore: 35, biasRating: 'right', factualReporting: 'low' },
  'The Daily Mail': { overallScore: 45, biasRating: 'right', factualReporting: 'low' },
  'BuzzFeed News': { overallScore: 65, biasRating: 'left', factualReporting: 'mixed' },
  'Vice News': { overallScore: 70, biasRating: 'left', factualReporting: 'high' },
  'ABC News': { overallScore: 80, biasRating: 'center-left', factualReporting: 'high' },
  'CBS News': { overallScore: 80, biasRating: 'center-left', factualReporting: 'high' },
  'NBC News': { overallScore: 78, biasRating: 'center-left', factualReporting: 'high' },
  'USA Today': { overallScore: 75, biasRating: 'center-left', factualReporting: 'high' },
  'Time': { overallScore: 80, biasRating: 'center-left', factualReporting: 'high' },
  'Newsweek': { overallScore: 70, biasRating: 'center-left', factualReporting: 'mixed' },
  'The Hill': { overallScore: 75, biasRating: 'center', factualReporting: 'high' },
  'Politico': { overallScore: 78, biasRating: 'center-left', factualReporting: 'high' },
  'The Atlantic': { overallScore: 82, biasRating: 'center-left', factualReporting: 'high' },
  'Axios': { overallScore: 82, biasRating: 'center', factualReporting: 'high' },
  'Business Insider': { overallScore: 72, biasRating: 'center-left', factualReporting: 'high' },
  'TechCrunch': { overallScore: 75, biasRating: 'center-left', factualReporting: 'high' },
  'Wired': { overallScore: 78, biasRating: 'center-left', factualReporting: 'high' },
  'Ars Technica': { overallScore: 80, biasRating: 'center', factualReporting: 'high' },
  'The Verge': { overallScore: 75, biasRating: 'center-left', factualReporting: 'high' },
  'Engadget': { overallScore: 75, biasRating: 'center', factualReporting: 'high' }
};

// Get or create source with default ratings
SourceSchema.statics.getOrCreateSource = async function(sourceName) {
  let source = await this.findOne({ name: sourceName });

  if (!source) {
    const defaultRating = this.DEFAULT_RATINGS[sourceName] || {
      overallScore: 50,
      biasRating: 'unknown',
      factualReporting: 'unknown'
    };

    source = await this.create({
      name: sourceName,
      credibilityRating: {
        ...defaultRating,
        lastUpdated: new Date(),
        source: this.DEFAULT_RATINGS[sourceName] ? 'curated' : 'default'
      }
    });
  }

  return source;
};

module.exports = mongoose.model('Source', SourceSchema);
