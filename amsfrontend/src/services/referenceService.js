import { apiClient } from './apiClient';

/**
 * Reference Data Service for Departments, Asset Types, and Locations
 */
export const referenceService = {
  // --- Roles ---
  getRoles: async () => {
    const response = await apiClient.get('/api/roles');
    return response.data;
  },

  // --- Custodians ---
  getCustodians: async () => {
    const response = await apiClient.get('/api/custodians');
    return response.data;
  },

  // --- Departments ---
  getDepartments: async () => {
    const response = await apiClient.get('/api/departments');
    return response.data;
  },
  getDepartment: async (id) => {
    const response = await apiClient.get(`/api/departments/${id}`);
    return response.data;
  },
  createDepartment: async (payload) => {
    const response = await apiClient.post('/api/departments', payload);
    return response.data;
  },
  updateDepartment: async (id, payload) => {
    const response = await apiClient.put(`/api/departments/${id}`, payload);
    return response.data;
  },
  deleteDepartment: async (id) => {
    const response = await apiClient.delete(`/api/departments/${id}`);
    return response.data;
  },

  // --- Asset Types ---
  getAssetTypes: async () => {
    const response = await apiClient.get('/api/asset-types');
    return response.data;
  },
  getAssetType: async (id) => {
    const response = await apiClient.get(`/api/asset-types/${id}`);
    return response.data;
  },
  createAssetType: async (payload) => {
    const response = await apiClient.post('/api/asset-types', payload);
    return response.data;
  },
  updateAssetType: async (id, payload) => {
    const response = await apiClient.put(`/api/asset-types/${id}`, payload);
    return response.data;
  },
  deleteAssetType: async (id) => {
    const response = await apiClient.delete(`/api/asset-types/${id}`);
    return response.data;
  },

  // --- Locations ---
  getLocations: async (params = {}) => {
    const cleanParams = {};
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        cleanParams[key] = val;
      }
    });
    const response = await apiClient.get('/api/locations', { params: cleanParams });
    return response.data;
  },
  getLocation: async (id) => {
    const response = await apiClient.get(`/api/locations/${id}`);
    return response.data;
  },
  createLocation: async (payload) => {
    const response = await apiClient.post('/api/locations', payload);
    return response.data;
  },
  updateLocation: async (id, payload) => {
    const response = await apiClient.put(`/api/locations/${id}`, payload);
    return response.data;
  },
  deleteLocation: async (id) => {
    const response = await apiClient.delete(`/api/locations/${id}`);
    return response.data;
  },
};
