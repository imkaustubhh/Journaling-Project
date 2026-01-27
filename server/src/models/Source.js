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
  // International Sources
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
  'Engadget': { overallScore: 75, biasRating: 'center', factualReporting: 'high' },

  // Indian News Sources - National
  'The Hindu': { overallScore: 88, biasRating: 'center-left', factualReporting: 'high' },
  'The Indian Express': { overallScore: 85, biasRating: 'center', factualReporting: 'high' },
  'Hindustan Times': { overallScore: 82, biasRating: 'center', factualReporting: 'high' },
  'India Today': { overallScore: 78, biasRating: 'center', factualReporting: 'high' },
  'NDTV': { overallScore: 80, biasRating: 'center-left', factualReporting: 'high' },
  'Times of India': { overallScore: 72, biasRating: 'center', factualReporting: 'mixed' },
  'The Economic Times': { overallScore: 82, biasRating: 'center', factualReporting: 'high' },
  'Business Standard': { overallScore: 85, biasRating: 'center', factualReporting: 'high' },
  'Mint': { overallScore: 84, biasRating: 'center', factualReporting: 'high' },
  'The Wire': { overallScore: 78, biasRating: 'center-left', factualReporting: 'high' },
  'Scroll.in': { overallScore: 76, biasRating: 'center-left', factualReporting: 'high' },
  'The Quint': { overallScore: 74, biasRating: 'center-left', factualReporting: 'high' },
  'The Print': { overallScore: 80, biasRating: 'center', factualReporting: 'high' },
  'News18': { overallScore: 68, biasRating: 'center-right', factualReporting: 'mixed' },
  'Zee News': { overallScore: 60, biasRating: 'right', factualReporting: 'mixed' },
  'Republic World': { overallScore: 55, biasRating: 'right', factualReporting: 'mixed' },
  'ABP News': { overallScore: 70, biasRating: 'center', factualReporting: 'mixed' },
  'Aaj Tak': { overallScore: 65, biasRating: 'center', factualReporting: 'mixed' },
  'India TV': { overallScore: 62, biasRating: 'center-right', factualReporting: 'mixed' },
  'Firstpost': { overallScore: 75, biasRating: 'center', factualReporting: 'high' },
  'Deccan Herald': { overallScore: 80, biasRating: 'center', factualReporting: 'high' },
  'The Telegraph India': { overallScore: 78, biasRating: 'center-left', factualReporting: 'high' },
  'The Statesman': { overallScore: 76, biasRating: 'center', factualReporting: 'high' },
  'The Tribune': { overallScore: 78, biasRating: 'center', factualReporting: 'high' },
  'The Pioneer': { overallScore: 68, biasRating: 'center-right', factualReporting: 'mixed' },
  'DNA India': { overallScore: 65, biasRating: 'center', factualReporting: 'mixed' },
  'Free Press Journal': { overallScore: 70, biasRating: 'center', factualReporting: 'mixed' },
  'Mid-Day': { overallScore: 65, biasRating: 'center', factualReporting: 'mixed' },
  'Mumbai Mirror': { overallScore: 68, biasRating: 'center', factualReporting: 'mixed' },
  'The New Indian Express': { overallScore: 80, biasRating: 'center', factualReporting: 'high' },
  'Deccan Chronicle': { overallScore: 72, biasRating: 'center', factualReporting: 'mixed' },
  'The Hans India': { overallScore: 68, biasRating: 'center', factualReporting: 'mixed' },
  'Outlook India': { overallScore: 76, biasRating: 'center-left', factualReporting: 'high' },
  'Frontline': { overallScore: 82, biasRating: 'center-left', factualReporting: 'high' },
  'Caravan Magazine': { overallScore: 84, biasRating: 'center-left', factualReporting: 'very-high' },
  'Swarajya': { overallScore: 65, biasRating: 'right', factualReporting: 'mixed' },
  'OpIndia': { overallScore: 45, biasRating: 'right', factualReporting: 'low' },
  'Alt News': { overallScore: 82, biasRating: 'center', factualReporting: 'very-high' },
  'Boom Live': { overallScore: 80, biasRating: 'center', factualReporting: 'very-high' },
  'PTI': { overallScore: 90, biasRating: 'center', factualReporting: 'very-high' },
  'ANI': { overallScore: 75, biasRating: 'center', factualReporting: 'high' },
  'IANS': { overallScore: 78, biasRating: 'center', factualReporting: 'high' },
  'UNI': { overallScore: 75, biasRating: 'center', factualReporting: 'high' },
  'Moneycontrol': { overallScore: 80, biasRating: 'center', factualReporting: 'high' },
  'LiveMint': { overallScore: 84, biasRating: 'center', factualReporting: 'high' },
  'Financial Express': { overallScore: 80, biasRating: 'center', factualReporting: 'high' },
  'BloombergQuint': { overallScore: 82, biasRating: 'center', factualReporting: 'high' },
  'CNBC TV18': { overallScore: 78, biasRating: 'center', factualReporting: 'high' },
  'ET Now': { overallScore: 76, biasRating: 'center', factualReporting: 'high' }
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
