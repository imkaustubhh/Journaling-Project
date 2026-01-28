/**
 * Verification Hook
 * Custom hook for news verification functionality
 */

import { useState } from 'react';
import { verifyByURL, verifyByKeywords } from '../services/verificationService';

export const useVerification = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const verifyURL = async (url) => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const data = await verifyByURL(url);

      if (data.success) {
        setResult(data.verification);
      } else {
        setError(data.message || 'Verification failed');
      }

      return data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to verify URL';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const verifyKeywords = async (keywords) => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const data = await verifyByKeywords(keywords);

      if (data.success) {
        setResult(data.verification);
      } else {
        setError(data.message || 'Verification failed');
      }

      return data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to verify keywords';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearResult = () => {
    setResult(null);
    setError(null);
  };

  return {
    loading,
    error,
    result,
    verifyURL,
    verifyKeywords,
    clearResult
  };
};
