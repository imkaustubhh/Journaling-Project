import React, { useState } from 'react';
import { useTrendingViral, useFakeNews } from '../../hooks/useViralNews';
import '../../styles/ViralNews.css';

const ViralNews = () => {
  const [activeSection, setActiveSection] = useState('trending');
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

  const loading = activeSection === 'trending' ? trendingLoading : fakeLoading;
  const stories = activeSection === 'trending' ? trending : fakeNews;

  return (
    <div className="viral-news-horizontal">
      {/* Section Navigation */}
      <div className="viral-nav">
        <button
          className={`viral-nav-item ${activeSection === 'trending' ? 'active' : ''}`}
          onClick={() => setActiveSection('trending')}
        >
          <span className="nav-indicator trending-pulse"></span>
          TRENDING
        </button>
        <button
          className={`viral-nav-item ${activeSection === 'fakes' ? 'active' : ''}`}
          onClick={() => setActiveSection('fakes')}
        >
          <span className="nav-indicator alert-pulse"></span>
          VIRAL FAKES
        </button>
      </div>

      {/* Content Area */}
      <div className="viral-content-area">
        {loading ? (
          <div className="viral-loading-horizontal">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton-item-horizontal">
                <div className="skeleton-line"></div>
                <div className="skeleton-line short"></div>
              </div>
            ))}
          </div>
        ) : stories.length === 0 ? (
          <div className="viral-empty-horizontal">
            <span className="empty-icon">{activeSection === 'trending' ? '📊' : '✓'}</span>
            <p>
              {activeSection === 'trending'
                ? 'No trending stories detected yet'
                : 'No viral fakes detected'}
            </p>
          </div>
        ) : (
          <div className="viral-stories-horizontal">
            {stories.map((story, index) => {
              if (activeSection === 'trending') {
                const status = getStatusBadge(story.verification?.status);
                return (
                  <div
                    key={story._id}
                    className="viral-story-item"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="story-rank">{index + 1}</div>
                    <div className="story-content">
                      <h4 className="story-title">{story.title}</h4>
                      <div className="story-meta">
                        <span className={`status-badge ${status.class}`}>
                          {status.label}
                        </span>
                        <span className="meta-item">
                          {Math.round(story.virality?.score || 0)} score
                        </span>
                        <span className="meta-item">
                          {story.relatedArticles?.length || 0} sources
                        </span>
                        <span className="meta-item meta-time">
                          {formatTimeAgo(story.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              } else {
                const type = story.misinformationAnalysis?.type || 'unknown';
                return (
                  <div
                    key={story._id}
                    className="viral-story-item fake-item"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="fake-indicator">⚠</div>
                    <div className="story-content">
                      <h4 className="story-title">{story.title}</h4>
                      <div className="story-meta">
                        <span className="misinfo-badge">
                          {type.replace(/_/g, ' ')}
                        </span>
                        <span className="meta-item">
                          {story.verification?.confidenceScore || 0}% confidence
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ViralNews;
