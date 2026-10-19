import { apiClient } from './apiClient';

const STORAGE_KEY_USER = 'ams_current_user';
const STORAGE_KEY_TOKEN = 'ams_auth_token';

/**
 * Helper to safely decode JWT payload on the client without external libraries
 */
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export const authService = {
  /**
   * Login with employee ID or email and password
   */
  login: async (employeeIdOrEmail, password) => {
    const response = await apiClient.post('/api/auth/login', {
      employeeIdOrEmail: employeeIdOrEmail.trim(),
      password,
    });

    const { accessToken, user } = response.data;
    if (!accessToken) {
      throw new Error('Authentication failed: No access token received from server.');
    }

    // Store Bearer token in sessionStorage
    sessionStorage.setItem(STORAGE_KEY_TOKEN, accessToken);

    // Use trusted backend user profile from login response, or fallback to parsed token claims
    const userProfile = user || (() => {
      const claims = parseJwt(accessToken) || {};
      return {
        id: claims.sub ? Number(claims.sub) : null,
        employeeId: employeeIdOrEmail.trim(),
        name: employeeIdOrEmail.trim(),
        email: claims.email || '',
        role: claims.role || 'GENERAL',
        status: 'ACTIVE',
      };
    })();

    sessionStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userProfile));
    return userProfile;
  },

  getCurrentUser: () => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY_USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  getToken: () => {
    try {
      return sessionStorage.getItem(STORAGE_KEY_TOKEN);
    } catch {
      return null;
    }
  },

  logout: () => {
    sessionStorage.removeItem(STORAGE_KEY_USER);
    sessionStorage.removeItem(STORAGE_KEY_TOKEN);
  },

  isAuthenticated: () => {
    const token = authService.getToken();
    const user = authService.getCurrentUser();
    if (!token || !user) return false;
    const claims = parseJwt(token);
    if (claims && claims.exp && claims.exp * 1000 < Date.now()) {
      authService.logout();
      return false;
    }
    return true;
  },
};
