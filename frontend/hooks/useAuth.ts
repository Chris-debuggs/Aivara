'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { setAuthToken, removeAuthToken, setUser, getUser, isAuthenticated as checkAuth, decodeJwt } from '@/lib/auth';
import type { User } from '@/lib/auth';

export function useAuth() {
  const router = useRouter();
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = getUser();
      setUserState(storedUser);
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await api.login(email, password);
      const token = response.access_token;
      setAuthToken(token);

      // Try to decode user info from JWT payload
      const payload = decodeJwt(token);
      const userData: User = {
        id: payload?.user_id || payload?.sub || 0,
        email: payload?.email || email,
        full_name: payload?.full_name || payload?.name || email,
      };
      setUser(userData);
      setUserState(userData);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Login failed',
      };
    }
  }, []);

  const register = useCallback(async (email: string, password: string, fullName: string) => {
    try {
      // Call register endpoint
      await api.register(email, password, fullName);

      // Auto-login after registration
      const loginResponse = await api.login(email, password);
      const token = loginResponse.access_token;
      setAuthToken(token);

      // Populate user from token payload
      const payload = decodeJwt(token);
      const userData: User = {
        id: payload?.user_id || payload?.sub || 0,
        email: payload?.email || email,
        full_name: payload?.full_name || payload?.name || fullName || email,
      };
      setUser(userData);
      setUserState(userData);

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Registration failed',
      };
    }
  }, []);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      const isDoctor = userStr ? (JSON.parse(userStr)?.role === 'doctor') : false;
      
      removeAuthToken();
      setUserState(null);
      
      // Redirect to appropriate login page based on user role
      router.push(isDoctor ? '/doctor/login' : '/login');
    }
  }, [router]);

  return {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: checkAuth(),
  };
}
