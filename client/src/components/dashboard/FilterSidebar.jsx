import React from 'react';
import { useCategories, useSources } from '../../hooks/useArticles';
import '../../styles/FilterSidebar.css';

const FilterSidebar = ({ filters, onFilterChange, isOpen, onClose }) => {
  const { categories, loading: categoriesLoading } = useCategories();
  const { sources, loading: sourcesLoading } = useSources();

  const handleCategoryChange = (slug) => {
    onFilterChange({
      category: filters.category === slug ? '' : slug
    });
  };

  const handleSourceChange = (e) => {
    onFilterChange({ source: e.target.value });
  };

  const handleScoreChange = (e) => {
    onFilterChange({ minScore: parseInt(e.target.value) });
  };

  const handleStatusChange = (e) => {
    onFilterChange({ status: e.target.value });
  };

  const handleSortChange = (e) => {
    onFilterChange({ sortBy: e.target.value });
  };

  const clearFilters = () => {
    onFilterChange({
      category: '',
      source: '',
      minScore: 0,
      status: 'approved',
      search: '',
      sortBy: 'publishedAt'
    });
  };

  const hasActiveFilters = filters.category || filters.source ||
    filters.minScore > 0 || filters.status !== 'approved';

  return (
    <>
      {/* Backdrop */}
      {isOpen && <div className="filter-backdrop" onClick={onClose}></div>}

      {/* Sidebar */}
      <aside className={`filter-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="filter-header">
        <h2>Filters</h2>
        <div className="filter-actions">
          {hasActiveFilters && (
            <button className="clear-btn" onClick={clearFilters}>
              Clear All
            </button>
          )}
          <button className="close-btn" onClick={onClose} title="Close filters">
            ✕
          </button>
        </div>
      </div>

      {/* Sort */}
      <div className="filter-section">
        <h3>Sort By</h3>
        <select value={filters.sortBy} onChange={handleSortChange}>
          <option value="publishedAt">Latest First</option>
          <option value="filteringMetadata.overallScore">Highest Score</option>
        </select>
      </div>

      {/* Status Filter */}
      <div className="filter-section">
        <h3>Article Status</h3>
        <select value={filters.status} onChange={handleStatusChange}>
          <option value="approved">Approved Only</option>
          <option value="pending">Pending Review</option>
          <option value="all">All Articles</option>
        </select>
      </div>

      {/* Minimum Score */}
      <div className="filter-section">
        <h3>Minimum Score: {filters.minScore}</h3>
        <input
          type="range"
          min="0"
          max="100"
          value={filters.minScore}
          onChange={handleScoreChange}
          className="score-slider"
        />
        <div className="score-labels">
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
      </div>

      {/* Categories */}
      <div className="filter-section">
        <h3>Categories</h3>
        {categoriesLoading ? (
          <p className="loading-text">Loading...</p>
        ) : (
          <div className="category-list">
            {categories.map(cat => (
              <button
                key={cat._id}
                className={`category-btn ${filters.category === cat.slug ? 'active' : ''}`}
                onClick={() => handleCategoryChange(cat.slug)}
                style={{
                  '--cat-color': cat.color,
                  borderColor: filters.category === cat.slug ? cat.color : 'transparent',
                  backgroundColor: filters.category === cat.slug ? cat.color + '20' : 'transparent'
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sources */}
      <div className="filter-section">
        <h3>Source</h3>
        {sourcesLoading ? (
          <p className="loading-text">Loading...</p>
        ) : (
          <select value={filters.source} onChange={handleSourceChange}>
            <option value="">All Sources</option>
            {sources.map(src => (
              <option key={src._id} value={src.name}>
                {src.name} ({src.credibilityRating?.overallScore || 0})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Legend */}
      <div className="filter-section legend">
        <h3>Score Legend</h3>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#27ae60' }}></span>
          <span>80+ Highly Credible</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#f39c12' }}></span>
          <span>60-79 Generally Reliable</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#e67e22' }}></span>
          <span>40-59 Use Caution</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#e74c3c' }}></span>
          <span>Below 40 Low Credibility</span>
        </div>
      </div>
    </aside>
    </>
  );
};

export default FilterSidebar;
