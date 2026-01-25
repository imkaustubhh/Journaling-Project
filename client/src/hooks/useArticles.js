import { useState, useEffect, useCallback } from 'react';
import articleService from '../services/articleService';

export const useArticles = (initialFilters = {}) => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [filters, setFilters] = useState({
    category: '',
    source: '',
    minScore: 0,
    status: 'approved',
    search: '',
    sortBy: 'publishedAt',
    sortOrder: 'desc',
    ...initialFilters
  });

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      };

      // Remove empty params
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });

      const response = await articleService.getArticles(params);

      if (response.success) {
        setArticles(response.data);
        setPagination(prev => ({
          ...prev,
          ...response.pagination
        }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch articles');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const updateFilters = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const setPage = (page) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const refresh = () => {
    fetchArticles();
  };

  return {
    articles,
    loading,
    error,
    pagination,
    filters,
    updateFilters,
    setPage,
    refresh
  };
};

export const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await articleService.getCategories();
        if (response.success) {
          setCategories(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return { categories, loading };
};

export const useSources = () => {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSources = async () => {
      try {
        const response = await articleService.getSources();
        if (response.success) {
          setSources(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch sources:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSources();
  }, []);

  return { sources, loading };
};

export const useStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await articleService.getStats();
        if (response.success) {
          setStats(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, loading };
};

export default useArticles;
