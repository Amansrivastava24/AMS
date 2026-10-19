import axios from 'axios';
import { ENV } from '../config/env';

/**
 * Shared Axios instance for backend REST API communication
 */
export const apiClient = axios.create({
  baseURL: ENV.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/plain, */*',
  },
  timeout: 20000,
});

// Request interceptor to attach JWT auth token if available in sessionStorage
apiClient.interceptors.request.use(
  (config) => {
    try {
      const token = sessionStorage.getItem('ams_auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // ignore storage access errors
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to auto-parse string JSON and normalize error handling
apiClient.interceptors.response.use(
  (response) => {
    if (typeof response.data === 'string') {
      const trimmed = response.data.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          response.data = JSON.parse(trimmed);
        } catch {
          // keep as string
        }
      }
    }
    return response;
  },
  async (error) => {
    let customMessage = 'An unexpected error occurred';
    let statusCode = null;

    if (error.response) {
      statusCode = error.response.status;
      let data = error.response.data;

      // Handle Blob error response (e.g. from failed Excel export)
      if (data instanceof Blob) {
        try {
          const text = await data.text();
          data = JSON.parse(text);
        } catch {
          // ignore parsing error
        }
      }

      if (typeof data === 'string') {
        try {
          const parsed = JSON.parse(data);
          data = parsed;
        } catch {
          customMessage = data;
        }
      }

      if (data && typeof data === 'object') {
        if (data.error && typeof data.error === 'object') {
          customMessage = data.error.message || data.error.code || 'Validation error';
          if (Array.isArray(data.error.details) && data.error.details.length > 0) {
            customMessage += `: ${data.error.details.join(', ')}`;
          }
        } else if (typeof data.error === 'string') {
          customMessage = data.error;
        } else if (typeof data.message === 'string') {
          customMessage = data.message;
        } else {
          customMessage = `Server responded with code ${statusCode}`;
        }
      }

      if (statusCode === 401) {
        // Broadcast auth expiration event to automatically trigger logout
        window.dispatchEvent(new CustomEvent('ams_auth_expired'));
      }
    } else if (error.request) {
      customMessage = 'Backend service is unreachable. Please verify server is running on port 8080.';
    } else {
      customMessage = error.message;
    }

    const enhancedError = new Error(customMessage);
    enhancedError.statusCode = statusCode;
    enhancedError.originalError = error;
    return Promise.reject(enhancedError);
  }
);
