'use client';

import { useState, useEffect, useCallback } from 'react';
import { authService, UserProfile } from '@/services/authService';

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const profile = await authService.getMe();
      setUser(profile);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    authService.getMe()
      .then((profile) => {
        if (!ignore) {
          setUser(profile);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          setUser(null);
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  // Refresh session on window focus to keep long-lived sessions alive
  useEffect(() => {
    const handleFocus = async () => {
      try {
        await fetch('/api/auth/session/refresh', {
          method: 'GET',
          credentials: 'include',
        });
      } catch {
        // Non-critical: ignore refresh errors
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const sendOtp = async (email: string) => {
    setError(null);
    return authService.sendOtp(email);
  };

  const verifyOtp = async (email: string, code: string) => {
    setError(null);
    const res = await authService.verifyOtp(email, code);
    if (res.user) {
      setUser(res.user);
    }
    return res;
  };

  const claimFacecard = async (data: { displayName: string; handle: string; pin: string }) => {
    setError(null);
    const res = await authService.claimFacecard(data);
    if (res.user) {
      setUser(res.user);
    }
    return res;
  };

  const loginWithPin = async (identifier: string, pin: string) => {
    setError(null);
    const res = await authService.loginWithPin(identifier, pin);
    if (res.user) {
      setUser(res.user);
    }
    return res;
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    const res = await authService.updateProfile(updates);
    if (res.success && user) {
      setUser({ ...user, ...updates });
    }
    return res;
  };

  const signOut = async () => {
    setUser(null);
    try {
      // Clear httpOnly cookies via server route
      await fetch('/api/auth/signout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore errors, still proceed with client-side cleanup
    }
    if (typeof window !== 'undefined') {
      // Clear any non-httpOnly local state
      localStorage.removeItem('facecard_user');
      localStorage.removeItem('fc_onboarded');
      localStorage.removeItem('facecard_handle');
      sessionStorage.removeItem('fc_auth_email');
      window.location.href = '/';
    }
  };

  const deleteAccount = async () => {
    setUser(null);
    const res = await authService.deleteAccount();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('facecard_user');
      localStorage.removeItem('fc_onboarded');
      localStorage.removeItem('facecard_handle');
      sessionStorage.removeItem('fc_auth_email');
      window.location.href = '/';
    }
    return res;
  };

  return {
    user,
    isLoading,
    error,
    isAuthenticated: Boolean(user),
    sendOtp,
    verifyOtp,
    claimFacecard,
    loginWithPin,
    updateProfile,
    signOut,
    deleteAccount,
    refreshUser: fetchUser,
  };
}
