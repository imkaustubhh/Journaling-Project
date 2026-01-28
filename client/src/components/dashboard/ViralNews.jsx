import React from 'react';
import { useTrendingViral, useFakeNews } from '../../hooks/useViralNews';
import '../../styles/ViralNews.css';

const ViralNews = () => {
  const { stories: trending, loading: trendingLoading } = useTrendingViral(5);
  const { stories: fakeNews, loading: fakeLoading } = useFakeNews(3);

  const getStatusBadge = (status) => {
    const badges = {
      verified_true: { label: 'Verified', class: 'verified' },
      verified_false: { label: 'False', class: 'false' },
      partially_true: { label: 'Partial', class: 'partial' },
      misleading: { label: 'Misleading', class: 'misleading' },
      unverified: { label: 'Checking', class: 'checking' },
      under_review: { label: 'Reviewing', class: 'reviewing' }
    };
    return badges[status] || { label: 'Unknown', class: 'unknown' };
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const then = new Date(date);
    const diffHours = Math.floor((now - then) / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 48) return 'Yesterday';
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <div className="viral-news-section">
      {/* Trending Stories */}
      <div className="viral-card trending">
        <div className="viral-header">
          <div className="viral-title">
            <span className="viral-icon trending-icon"></span>
            <h3>Trending Stories</h3>
          </div>
          <span className="viral-badge live">LIVE</span>
        </div>

        <div className="viral-list">
          {trendingLoading ? (
            <div className="viral-loading">
              {[1, 2, 3].map(i => (
                <div key={i} className="viral-item skeleton">
                  <div className="skeleton-title"></div>
                  <div className="skeleton-meta"></div>
                </div>
              ))}
            </div>
          ) : trending.length === 0 ? (
            <div className="viral-empty">
              <p>No trending stories detected yet</p>
            </div>
          ) : (
            trending.map((story, index) => {
              const status = getStatusBadge(story.verification?.status);
              return (
                <div key={story._id} className="viral-item" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="viral-rank">{index + 1}</div>
                  <div className="viral-content">
                    <h4 className="viral-story-title">{story.title}</h4>
                    <div className="viral-meta">
                      <span className={`status-badge ${status.class}`}>
                        {status.label}
                      </span>
                      <span className="viral-score">
                        <span className="score-icon"></span>
                        {Math.round(story.virality?.score || 0)}
                      </span>
                      <span className="viral-sources">
                        {story.relatedArticles?.length || 0} sources
                      </span>
                      <span className="viral-time">
                        {formatTimeAgo(story.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Fake News Alerts */}
      <div className="viral-card alerts">
        <div className="viral-header">
          <div className="viral-title">
            <span className="viral-icon alert-icon"></span>
            <h3>Misinformation Alerts</h3>
          </div>
          <span className="viral-badge alert">ALERT</span>
        </div>

        <div className="viral-list">
          {fakeLoading ? (
            <div className="viral-loading">
              {[1, 2].map(i => (
                <div key={i} className="viral-item skeleton">
                  <div className="skeleton-title"></div>
                  <div className="skeleton-meta"></div>
                </div>
              ))}
            </div>
          ) : fakeNews.length === 0 ? (
            <div className="viral-empty">
              <span className="check-icon"></span>
              <p>No misinformation detected</p>
            </div>
          ) : (
            fakeNews.map((story, index) => {
              const type = story.misinformationAnalysis?.type || 'unknown';
              return (
                <div key={story._id} className="viral-item alert-item" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="alert-indicator"></div>
                  <div className="viral-content">
                    <h4 className="viral-story-title">{story.title}</h4>
                    <div className="viral-meta">
                      <span className="misinfo-type">
                        {type.replace(/_/g, ' ')}
                      </span>
                      <span className="confidence">
                        {story.verification?.confidenceScore || 0}% confidence
                      </span>
                    </div>
                    {story.claims?.length > 0 && (
                      <p className="claim-preview">
                        {story.claims[0]?.text?.substring(0, 80)}...
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ViralNews;
