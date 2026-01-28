/**
 * Verification Service
 * API calls for news verification
 */

import api from './api';

/**
 * Verify news by URL
 * @param {string} url - The article URL to verify
 * @returns {Promise<Object>} Verification results
 */
export const verifyByURL = async (url) => {
  const response = await api.post('/verification/url', { url });
  return response.data;
};

/**
 * Verify news by keywords
 * @param {string} keywords - Keywords to search for
 * @returns {Promise<Object>} Verification results
 */
export const verifyByKeywords = async (keywords) => {
  const response = await api.post('/verification/keywords', { keywords });
  return response.data;
};
