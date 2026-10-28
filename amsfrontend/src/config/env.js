/**
 * Application environment configuration
 */
export const ENV = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '',
  TAGLINE: 'Manage Assets , Better.',
  APP_NAME: 'Asset Management System',
  IS_DEV: import.meta.env.DEV,
};
