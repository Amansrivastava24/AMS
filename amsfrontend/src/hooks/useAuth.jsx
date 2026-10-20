import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { userService } from '../services/userService';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleAuthExpired = () => {
      authService.logout();
      setUser(null);
    };
    window.addEventListener('ams_auth_expired', handleAuthExpired);
    return () => window.removeEventListener('ams_auth_expired', handleAuthExpired);
  }, []);

  // Fetch full user profile if token is valid and profile needs refresh
  useEffect(() => {
    if (authService.getToken()) {
      userService.getMe()
        .then((profile) => {
          if (profile) {
            setUser((prev) => {
              const updated = { ...(prev || {}), ...profile };
              sessionStorage.setItem('ams_current_user', JSON.stringify(updated));
              return updated;
            });
          }
        })
        .catch(() => {
          // Token may be invalid or server unreachable
        });
    }
  }, []);

  const login = async (employeeIdOrEmail, password) => {
    setLoading(true);
    try {
      const loggedUser = await authService.login(employeeIdOrEmail, password);
      setUser(loggedUser);
      // Fetch full profile to ensure city and country are stored
      try {
        const fullProfile = await userService.getMe();
        if (fullProfile) {
          const merged = { ...loggedUser, ...fullProfile };
          sessionStorage.setItem('ams_current_user', JSON.stringify(merged));
          setUser(merged);
          return merged;
        }
      } catch {
        // Fallback to loggedUser
      }
      return loggedUser;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const updateUserProfile = async (updatedFields) => {
    setLoading(true);
    try {
      const targetId = updatedFields.id || user?.id;
      let updated;
      if (targetId) {
        updated = await userService.updateUser(targetId, updatedFields);
      } else {
        updated = await userService.updateMe(updatedFields);
      }
      const merged = { ...(user || {}), ...updated };
      sessionStorage.setItem('ams_current_user', JSON.stringify(merged));
      setUser(merged);
      return merged;
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    try {
      const fullProfile = await userService.getMe();
      if (fullProfile) {
        const merged = { ...(user || {}), ...fullProfile };
        sessionStorage.setItem('ams_current_user', JSON.stringify(merged));
        setUser(merged);
        return merged;
      }
    } catch (e) {
      console.error('Failed to refresh profile:', e);
    }
    return user;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user && authService.getToken()),
        role: user?.role || null,
        token: authService.getToken(),
        login,
        logout,
        updateUserProfile,
        refreshProfile,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
