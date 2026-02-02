import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useArticles, useStats } from '../../hooks/useArticles';
import ArticleCard from './ArticleCard';
import FilterSidebar from './FilterSidebar';
import ViralNews from './ViralNews';
import NewsVerifier from './NewsVerifier';
import '../../styles/Dashboard.css';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const {
    articles,
    loading,
    error,
    pagination,
    filters,
    updateFilters,
    setPage,
    refresh
  } = useArticles();

  const { stats } = useStats();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    updateFilters({ search: searchQuery });
  };

  const handleStatusFilter = (status) => {
    if (filters.status === status) {
      // If clicking the same filter, clear it (show all)
      updateFilters({ status: undefined });
    } else {
      updateFilters({ status });
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>Real News Filter</h1>
          {stats && (
            <div className="header-stats">
              <button
                className={`stat-btn stat-approved ${filters.status === 'approved' ? 'active' : ''}`}
                onClick={() => handleStatusFilter('approved')}
                title="Click to filter approved articles"
              >
                <span className="stat-indicator approved"></span>
                {stats.approvedArticles} approved
              </button>
              <button
                className={`stat-btn stat-pending ${filters.status === 'pending' ? 'active' : ''}`}
                onClick={() => handleStatusFilter('pending')}
                title="Click to filter pending articles"
              >
                <span className="stat-indicator pending"></span>
                {stats.pendingArticles} pending
              </button>
              <span className="stat-average">
                <span className="stat-indicator average"></span>
                Avg: {stats.averageScore}
              </span>
            </div>
          )}
        </div>
        <div className="header-right">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit">Search</button>
          </form>
          <div className="user-info">
            <span>{user?.name}</span>
            {user?.role === 'admin' && <span className="admin-badge">Admin</span>}
            <button onClick={handleLogout} className="btn-secondary">Logout</button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <FilterSidebar filters={filters} onFilterChange={updateFilters} />

        <div className="news-feed">
          {/* News Verifier Section */}
          <NewsVerifier />

          {/* Viral News Section */}
          <ViralNews />

          <div className="feed-header">
            <h2>
              {filters.category ? `${filters.category.charAt(0).toUpperCase() + filters.category.slice(1)} News` : 'Latest News'}
            </h2>
            <button onClick={refresh} className="refresh-btn">Refresh</button>
          </div>

          {loading && <div className="loading">Loading articles...</div>}
          {error && <div className="error">{error}</div>}

          {!loading && !error && (
            <>
              {articles.length === 0 ? (
                <div className="no-articles">
                  <p>No articles found matching your filters.</p>
                </div>
              ) : (
                <div className="articles-grid">
                  {articles.map(article => (
                    <ArticleCard key={article._id} article={article} />
                  ))}
                </div>
              )}

              {pagination.pages > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => setPage(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                  >
                    Previous
                  </button>
                  <span>Page {pagination.page} of {pagination.pages}</span>
                  <button
                    onClick={() => setPage(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
