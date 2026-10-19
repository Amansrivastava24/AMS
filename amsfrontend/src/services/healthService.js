import { apiClient } from './apiClient';

/**
 * Health check service communicating with actual backend endpoints:
 * - GET /health
 * - GET /health/db
 */
export const healthService = {
  checkAppHealth: async () => {
    try {
      const response = await apiClient.get('/health');
      let data = response.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch { /* ignore */ }
      }
      return data;
    } catch (err) {
      return { status: 'DOWN', error: err.message };
    }
  },

  checkDbHealth: async () => {
    try {
      const response = await apiClient.get('/health/db');
      let data = response.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch { /* ignore */ }
      }
      return data;
    } catch (err) {
      return { status: 'DOWN', error: err.message };
    }
  },

  checkFullHealth: async () => {
    const [app, db] = await Promise.all([
      healthService.checkAppHealth(),
      healthService.checkDbHealth(),
    ]);

    const isConnected = app?.status === 'UP' && db?.status === 'UP';
    return {
      connected: isConnected,
      app,
      db,
      timestamp: new Date().toISOString(),
    };
  },
};
