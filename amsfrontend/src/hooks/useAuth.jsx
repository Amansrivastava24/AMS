import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

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

  const login = async (employeeIdOrEmail, password) => {
    setLoading(true);
    try {
      const loggedUser = await authService.login(employeeIdOrEmail, password);
      setUser(loggedUser);
      return loggedUser;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
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
