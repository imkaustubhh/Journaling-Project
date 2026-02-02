import React, { useState } from 'react';
import { useVerification } from '../../hooks/useVerification';
import '../../styles/NewsVerifier.css';

const NewsVerifier = () => {
  const [activeTab, setActiveTab] = useState('url');
  const [isExpanded, setIsExpanded] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [keywordsInput, setKeywordsInput] = useState('');
  const { loading, error, result, verifyURL, verifyKeywords, clearResult } = useVerification();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const inputValue = activeTab === 'url' ? urlInput : keywordsInput;
    if (!inputValue.trim()) return;

    try {
      if (activeTab === 'url') {
        await verifyURL(inputValue.trim());
      } else {
        await verifyKeywords(inputValue.trim());
      }
      setIsExpanded(true);
    } catch (err) {
      console.error('Verification error:', err);
    }
  };

  const handleClose = () => {
    setUrlInput('');
    setKeywordsInput('');
    clearResult();
    setIsExpanded(false);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    clearResult();
    setIsExpanded(false);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#00d26a';
    if (score >= 60) return '#7dd956';
    if (score >= 40) return '#ffa500';
    return '#ff3b5c';
  };

  return (
    <div className={`news-verifier-compact ${isExpanded ? 'expanded' : ''}`}>
      <div className="verifier-compact-header">
        <div className="verifier-icon-compact">🛡️</div>
        <div className="verifier-title-compact">
          <h3>News Verifier</h3>
          <p>Check article credibility</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="verifier-tabs-compact">
        <button
          className={`tab-compact ${activeTab === 'url' ? 'active' : ''}`}
          onClick={() => handleTabChange('url')}
        >
          🔗 URL
        </button>
        <button
          className={`tab-compact ${activeTab === 'keywords' ? 'active' : ''}`}
          onClick={() => handleTabChange('keywords')}
        >
          🔍 Keywords
        </button>
      </div>

      <form className="verifier-input-compact" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder={
            activeTab === 'url'
              ? 'Paste article URL to verify...'
              : 'Enter keywords to search...'
          }
          value={activeTab === 'url' ? urlInput : keywordsInput}
          onChange={(e) =>
            activeTab === 'url'
              ? setUrlInput(e.target.value)
              : setKeywordsInput(e.target.value)
          }
          disabled={loading}
        />
        <button
          type="submit"
          disabled={
            loading ||
            (activeTab === 'url' ? !urlInput.trim() : !keywordsInput.trim())
          }
        >
          {loading ? '...' : '→'}
        </button>
      </form>

      {error && (
        <div className="verifier-error-compact">
          <span>⚠️</span> {error}
        </div>
      )}

      {result && isExpanded && (
        <div className="verifier-result-compact">
          <button className="close-result" onClick={handleClose}>×</button>

          <div className="score-display-compact">
            <div className="main-score-compact" style={{ color: getScoreColor(result.overallScore || 0) }}>
              {result.overallScore || 0}
              <span className="score-label-compact">/100</span>
            </div>
            <div className="score-text-compact">{result.recommendation}</div>
          </div>

          <div className="metrics-compact">
            <div className="metric-item-compact">
              <span className="metric-label-compact">Credibility</span>
              <span className="metric-value-compact">{result.credibilityScore || 0}</span>
            </div>
            <div className="metric-item-compact">
              <span className="metric-label-compact">Quality</span>
              <span className="metric-value-compact">{result.qualityScore || 0}</span>
            </div>
            <div className="metric-item-compact">
              <span className="metric-label-compact">Bias</span>
              <span className="metric-value-compact">{result.biasScore || 0}</span>
            </div>
          </div>

          {result.crossVerification && result.crossVerification.sourcesFound > 0 && (
            <div className="cross-verify-compact">
              <div className="cross-verify-label">
                ✓ Verified by {result.crossVerification.sourcesFound} sources
              </div>
              <div className="confidence-mini">
                Confidence: {result.crossVerification.confidence}%
              </div>
            </div>
          )}

          {result.source && (
            <div className="source-info-compact">
              <strong>Source:</strong> {result.source}
              {result.sourceCredibility && ` (${result.sourceCredibility.overallScore}/100)`}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NewsVerifier;
