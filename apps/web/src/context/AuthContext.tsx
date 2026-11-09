import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { getStoredToken, setStoredToken, clearStoredToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  refreshUser: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = async (authToken: string) => {
    try {
      const res = await fetch('/api/v1/auth/me', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      } else {
        // Token expired or invalid
        clearStoredToken();
        setToken(null);
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  // Listen to centralized auth:expired events from api client
  useEffect(() => {
    const handleAuthExpired = () => {
      clearStoredToken();
      setToken(null);
      setUser(null);
    };
    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { message: 'Falha na autenticação' } }));
      throw new Error(err.error?.message || 'Falha no login');
    }

    const data = await res.json();
    setStoredToken(data.access_token);
    setToken(data.access_token);
    setUser(data.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { message: 'Falha no cadastro' } }));
      throw new Error(err.error?.message || 'Falha no registro');
    }

    // Automatically log in after registration
    await login(email, password);
  };

  const logout = () => {
    clearStoredToken();
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (token) {
      await fetchProfile(token);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
