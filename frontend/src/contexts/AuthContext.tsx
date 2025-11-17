import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLogin, useVerify } from '@/lib/convex-hooks';

interface User {
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  const loginMutation = useLogin();
  const verifyResult = useVerify(token);

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Handle verification result
  useEffect(() => {
    if (verifyResult !== undefined) {
      if (verifyResult.valid && verifyResult.user) {
        setUser(verifyResult.user);
      } else {
        localStorage.removeItem('token');
        setToken(null);
      }
      setIsLoading(false);
    }
  }, [verifyResult]);

  const login = async (email: string, password: string) => {
    try {
      const response = await loginMutation({ email, password });
      if (response.success && response.token) {
        localStorage.setItem('token', response.token);
        setToken(response.token);
        setUser(response.user);
      } else {
        throw new Error('Login failed');
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
