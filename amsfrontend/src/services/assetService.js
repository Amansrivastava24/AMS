import { apiClient } from './apiClient';

/**
 * Asset Service interacting with the Scala / Pekko HTTP backend endpoints:
 * - GET    /api/assets
 * - GET    /api/assets/{id}
 * - POST   /api/assets
 * - PUT    /api/assets/{id}
 * - DELETE /api/assets/{id}
 * - GET    /api/assets/export
 */
export const assetService = {
  /**
   * Fetch paginated and filtered assets
   */
  getAssets: async (params = {}) => {
    const cleanParams = {};
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        cleanParams[key] = val;
      }
    });

    const response = await apiClient.get('/api/assets', { params: cleanParams });
    return response.data;
  },

  /**
   * Fetch single asset by ID
   */
  getAsset: async (id) => {
    const response = await apiClient.get(`/api/assets/${id}`);
    return response.data;
  },

  /**
   * Create new asset
   */
  createAsset: async (assetData) => {
    const response = await apiClient.post('/api/assets', assetData);
    return response.data;
  },

  /**
   * Update existing asset
   */
  updateAsset: async (id, assetData) => {
    const response = await apiClient.put(`/api/assets/${id}`, assetData);
    return response.data;
  },

  /**
   * Update physical verification audit status
   */
  updateVerification: async (id, verificationData) => {
    const response = await apiClient.patch(`/api/assets/${id}/verification`, verificationData);
    return response.data;
  },

  /**
   * Delete asset by ID
   */
  deleteAsset: async (id) => {
    const response = await apiClient.delete(`/api/assets/${id}`);
    return response.data;
  },

  /**
   * Export all filtered assets to Excel (.xlsx)
   */
  exportAssets: async (params = {}) => {
    const cleanParams = {};
    Object.entries(params).forEach(([key, val]) => {
      // Exclude pagination params so entire filtered dataset is exported
      if (key !== 'page' && key !== 'pageSize' && val !== undefined && val !== null && val !== '') {
        cleanParams[key] = val;
      }
    });

    const response = await apiClient.get('/api/assets/export', {
      params: cleanParams,
      responseType: 'blob',
    });

    let filename = 'assets_inventory.xlsx';
    const disposition = response.headers['content-disposition'];
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return true;
  },
};
