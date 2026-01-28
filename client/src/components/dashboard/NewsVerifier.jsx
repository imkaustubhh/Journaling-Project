import React, { useState } from 'react';
import { useVerification } from '../../hooks/useVerification';
import '../../styles/NewsVerifier.css';

const NewsVerifier = () => {
  const [activeTab, setActiveTab] = useState('url'); // 'url' or 'keywords'
  const [inputValue, setInputValue] = useState('');
  const { loading, error, result, verifyURL, verifyKeywords, clearResult } = useVerification();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!inputValue.trim()) {
      return;
    }

    try {
      if (activeTab === 'url') {
        await verifyURL(inputValue.trim());
      } else {
        await verifyKeywords(inputValue.trim());
      }
    } catch (err) {
      // Error is handled by the hook
      console.error('Verification error:', err);
    }
  };

  const handleReset = () => {
    setInputValue('');
    clearResult();
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#00d26a'; // Green
    if (score >= 60) return '#7dd956'; // Light green
    if (score >= 40) return '#ffa500'; // Orange
    return '#ff3b5c'; // Red
  };

  const getBiasLabel = (biasScore) => {
    if (biasScore < -30) return 'Left-Leaning';
    if (biasScore > 30) return 'Right-Leaning';
    if (biasScore < -10) return 'Center-Left';
    if (biasScore > 10) return 'Center-Right';
    return 'Center/Neutral';
  };

  const getBiasColor = (biasScore) => {
    if (biasScore < -30) return '#3b82f6';
    if (biasScore > 30) return '#ef4444';
    if (biasScore < -10) return '#06b6d4';
    if (biasScore > 10) return '#f59e0b';
    return '#8b5cf6';
  };

  return (
    <div className="news-verifier">
      <div className="verifier-header">
        <div className="header-content">
          <div className="header-icon">
            <span className="shield-icon">🛡️</span>
          </div>
          <div className="header-text">
            <h2>News Verifier</h2>
            <p>Check the credibility of any news article or topic</p>
          </div>
        </div>
      </div>

      <div className="verifier-tabs">
        <button
          className={`tab ${activeTab === 'url' ? 'active' : ''}`}
          onClick={() => { setActiveTab('url'); handleReset(); }}
        >
          <span className="tab-icon">🔗</span>
          Verify by URL
        </button>
        <button
          className={`tab ${activeTab === 'keywords' ? 'active' : ''}`}
          onClick={() => { setActiveTab('keywords'); handleReset(); }}
        >
          <span className="tab-icon">🔍</span>
          Verify by Keywords
        </button>
      </div>

      <form className="verifier-form" onSubmit={handleSubmit}>
        <div className="input-group">
          <input
            type="text"
            className="verifier-input"
            placeholder={
              activeTab === 'url'
                ? 'Enter news article URL (e.g., https://example.com/article)'
                : 'Enter keywords or topic (e.g., climate change policy)'
            }
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={loading}
          />
          <div className="input-buttons">
            {inputValue && (
              <button
                type="button"
                className="clear-input-btn"
                onClick={() => setInputValue('')}
                disabled={loading}
              >
                ✕
              </button>
            )}
            <button
              type="submit"
              className="verify-btn"
              disabled={loading || !inputValue.trim()}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Analyzing...
                </>
              ) : (
                <>
                  <span>Verify</span>
                  <span className="arrow">→</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div className="verification-error">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="verification-result">
          {activeTab === 'url' ? (
            <URLVerificationResult result={result} getScoreColor={getScoreColor} getBiasLabel={getBiasLabel} getBiasColor={getBiasColor} />
          ) : (
            <KeywordVerificationResult result={result} getScoreColor={getScoreColor} />
          )}
        </div>
      )}
    </div>
  );
};

// URL Verification Result Component
const URLVerificationResult = ({ result, getScoreColor, getBiasLabel, getBiasColor }) => {
  return (
    <div className="url-result">
      <div className="result-header">
        <h3>{result.title}</h3>
        <a href={result.url} target="_blank" rel="noopener noreferrer" className="source-link">
          {result.source?.name || 'Unknown Source'}
          <span className="external-icon">↗</span>
        </a>
      </div>

      <div className="score-overview">
        <div className="main-score" style={{ '--score-color': getScoreColor(result.overallScore) }}>
          <div className="score-circle">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" className="score-bg"></circle>
              <circle
                cx="50"
                cy="50"
                r="45"
                className="score-fill"
                style={{
                  strokeDashoffset: 283 - (283 * result.overallScore) / 100
                }}
              ></circle>
            </svg>
            <div className="score-value">
              <span className="score-number">{result.overallScore}</span>
              <span className="score-label">Overall Score</span>
            </div>
          </div>
        </div>

        <div className="score-details">
          <div className="score-item">
            <span className="score-label">Credibility</span>
            <div className="score-bar">
              <div
                className="score-bar-fill"
                style={{
                  width: `${result.credibilityScore}%`,
                  backgroundColor: getScoreColor(result.credibilityScore)
                }}
              ></div>
            </div>
            <span className="score-number">{result.credibilityScore}/100</span>
          </div>

          <div className="score-item">
            <span className="score-label">Quality</span>
            <div className="score-bar">
              <div
                className="score-bar-fill"
                style={{
                  width: `${result.qualityScore}%`,
                  backgroundColor: getScoreColor(result.qualityScore)
                }}
              ></div>
            </div>
            <span className="score-number">{result.qualityScore}/100</span>
          </div>

          {result.sourceCredibility !== undefined && (
            <div className="score-item">
              <span className="score-label">Source Reputation</span>
              <div className="score-bar">
                <div
                  className="score-bar-fill"
                  style={{
                    width: `${result.sourceCredibility}%`,
                    backgroundColor: getScoreColor(result.sourceCredibility)
                  }}
                ></div>
              </div>
              <span className="score-number">{result.sourceCredibility}/100</span>
            </div>
          )}
        </div>
      </div>

      <div className="analysis-tags">
        {result.isFactual !== undefined && (
          <span className={`analysis-tag ${result.isFactual ? 'factual' : 'opinion'}`}>
            {result.isFactual ? '✓ Factual' : '💭 Opinion'}
          </span>
        )}
        {result.biasScore !== undefined && (
          <span
            className="analysis-tag bias"
            style={{ '--bias-color': getBiasColor(result.biasScore) }}
          >
            {getBiasLabel(result.biasScore)}
          </span>
        )}
        {result.sentiment && (
          <span className={`analysis-tag sentiment-${result.sentiment}`}>
            {result.sentiment === 'positive' ? '😊' : result.sentiment === 'negative' ? '😟' : '😐'}{' '}
            {result.sentiment}
          </span>
        )}
      </div>

      {result.misinformation && result.misinformation.type !== 'none' && (
        <div className="misinformation-alert">
          <span className="alert-icon">⚠️</span>
          <div className="alert-content">
            <strong>Misinformation Warning:</strong>
            <p>This article shows signs of {result.misinformation.type.replace(/_/g, ' ')}</p>
            {result.misinformation.flags && result.misinformation.flags.length > 0 && (
              <div className="alert-flags">
                {result.misinformation.flags.map((flag, idx) => (
                  <span key={idx} className="flag-badge">{flag.replace(/_/g, ' ')}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {result.claims && result.claims.length > 0 && (
        <div className="claims-section">
          <h4>Key Claims Found:</h4>
          <ul className="claims-list">
            {result.claims.map((claim, idx) => (
              <li key={idx} className="claim-item">
                <span className="claim-type">{claim.type}</span>
                <span className="claim-text">{claim.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="recommendation">
        <p>{result.recommendation}</p>
      </div>
    </div>
  );
};

// Keyword Verification Result Component
const KeywordVerificationResult = ({ result, getScoreColor }) => {
  return (
    <div className="keyword-result">
      <div className="result-summary">
        <h3>Results for "{result.keywords}"</h3>
        <div className="summary-stats">
          <div className="stat-item">
            <span className="stat-value">{result.articlesFound}</span>
            <span className="stat-label">Articles Found</span>
          </div>
          <div className="stat-item">
            <span className="stat-value" style={{ color: getScoreColor(result.averageScore) }}>
              {result.averageScore}/100
            </span>
            <span className="stat-label">Avg Score</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{result.sourcesAnalysis.highCredibility}</span>
            <span className="stat-label">High-Credibility Sources</span>
          </div>
        </div>
      </div>

      {result.misinformationFlags && result.misinformationFlags.length > 0 && (
        <div className="misinformation-alert">
          <span className="alert-icon">⚠️</span>
          <div className="alert-content">
            <strong>Misinformation Patterns Detected:</strong>
            <div className="alert-flags">
              {result.misinformationFlags.map((flag, idx) => (
                <span key={idx} className="flag-badge">{flag.replace(/_/g, ' ')}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="recommendation">
        <p>{result.recommendation}</p>
      </div>

      {result.articles && result.articles.length > 0 && (
        <div className="related-articles">
          <h4>Related Articles:</h4>
          <div className="articles-list">
            {result.articles.map((article) => (
              <div key={article.id} className="article-item">
                <div className="article-header">
                  <h5>{article.title}</h5>
                  <a href={article.url} target="_blank" rel="noopener noreferrer" className="article-link">
                    View Article ↗
                  </a>
                </div>
                <div className="article-meta">
                  <span className="article-source">{article.source}</span>
                  <span className="article-date">
                    {new Date(article.publishedAt).toLocaleDateString()}
                  </span>
                  <span
                    className="article-score"
                    style={{ color: getScoreColor(article.score) }}
                  >
                    Score: {article.score}/100
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsVerifier;
