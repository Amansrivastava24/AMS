import { apiClient } from './apiClient';

/**
 * User Service interacting with the Scala / Pekko HTTP backend endpoints:
 * - GET    /api/users
 * - GET    /api/users/{id}
 * - POST   /api/users
 * - PUT    /api/users/{id}
 * - PATCH  /api/users/{id}/status
 * - PATCH  /api/users/{id}/role
 * - DELETE /api/users/{id}
 */
export const userService = {
  /**
   * Fetch paginated and filtered users
   */
  getUsers: async (params = {}) => {
    const cleanParams = {};
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        cleanParams[key] = val;
      }
    });

    const response = await apiClient.get('/api/users', { params: cleanParams });
    return response.data;
  },

  /**
   * Fetch single user by ID
   */
  getUser: async (id) => {
    const response = await apiClient.get(`/api/users/${id}`);
    return response.data;
  },

  /**
   * Create new user
   */
  createUser: async (userData) => {
    const response = await apiClient.post('/api/users', userData);
    return response.data;
  },

  /**
   * Update existing user details
   */
  updateUser: async (id, userData) => {
    const response = await apiClient.put(`/api/users/${id}`, userData);
    return response.data;
  },

  /**
   * Update user status (ACTIVE / INACTIVE)
   */
  updateStatus: async (id, status) => {
    const response = await apiClient.patch(`/api/users/${id}/status`, { status });
    return response.data;
  },

  /**
   * Update user role (SUPER_ADMIN only)
   */
  updateRole: async (id, roleId) => {
    const response = await apiClient.patch(`/api/users/${id}/role`, { roleId: Number(roleId) });
    return response.data;
  },

  /**
   * Delete user by ID
   */
  deleteUser: async (id) => {
    const response = await apiClient.delete(`/api/users/${id}`);
    return response.data;
  },
};
