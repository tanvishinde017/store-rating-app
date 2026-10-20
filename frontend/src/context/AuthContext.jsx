import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { authApi, getToken, setToken } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On first load, restore the session from a stored token.
  useEffect(() => {
    let cancelled = false;

    async function restore() {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const { user: profile } = await authApi.me();
        if (!cancelled) {
          setUser(profile);
        }
      } catch (err) {
        setToken(null);
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authApi.login({ email, password });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const signup = useCallback(async (payload) => {
    return authApi.signup(payload);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    return authApi.changePassword({ currentPassword, newPassword });
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, signup, logout, changePassword, setUser }),
    [user, loading, login, signup, logout, changePassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return ctx;
}