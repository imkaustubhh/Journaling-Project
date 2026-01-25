import api from './api';

const authService = {
  // Register new user
  register: async (name, email, password) => {
    const response = await api.post('/auth/register', {
      name,
      email,
      password
    });

    if (response.data.success) {
      // Store token and user data
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }

    return response.data;
  },

  // Login user
  login: async (email, password) => {
    const response = await api.post('/auth/login', {
      email,
      password
    });

    if (response.data.success) {
      // Store token and user data
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }

    return response.data;
  },

  // Logout user
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      // Clear local storage regardless of API call result
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  // Get stored user
  getStoredUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
};

export default authService;
