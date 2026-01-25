import api from './api';

const articleService = {
  // Get articles with filters
  getArticles: async (params = {}) => {
    const response = await api.get('/articles', { params });
    return response.data;
  },

  // Get single article by ID
  getArticle: async (id) => {
    const response = await api.get(`/articles/${id}`);
    return response.data;
  },

  // Get trending articles
  getTrending: async (limit = 10) => {
    const response = await api.get('/articles/trending', { params: { limit } });
    return response.data;
  },

  // Get all categories
  getCategories: async () => {
    const response = await api.get('/articles/categories');
    return response.data;
  },

  // Get all sources
  getSources: async () => {
    const response = await api.get('/articles/sources');
    return response.data;
  },

  // Get statistics
  getStats: async () => {
    const response = await api.get('/articles/stats');
    return response.data;
  }
};

export default articleService;
