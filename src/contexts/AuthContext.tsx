import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { AuthUser } from '../types/api';
import { ApiClient } from '../lib/api';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRedirectingToLogin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  api: ApiClient;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
const TOKEN_KEY = 'asa_access_token';
const TOKEN_EXPIRY_KEY = 'asa_token_expiry';
const AUTH_ROUTES = new Set(['/login', '/register', '/forgot-password', '/reset-password']);

/** Decode JWT and return expiry timestamp in ms, or null if unreadable. */
function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function saveToken(token: string, apiclient: ApiClient): void {
  localStorage.setItem(TOKEN_KEY, token);
  const expiry = getTokenExpiry(token);
  if (expiry) localStorage.setItem(TOKEN_EXPIRY_KEY, String(expiry));
  apiclient.setAccessToken(token);
}

function clearToken(apiclient: ApiClient): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  apiclient.setAccessToken(null);
}

function isStoredTokenValid(): boolean {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!token || !expiry) return false;
  // Consider expired if less than 60 s remaining
  return Date.now() < parseInt(expiry, 10) - 60_000;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedirectingToLogin, setIsRedirectingToLogin] = useState(false);
  const redirectingRef = useRef(false);
  const api = useMemo(() => new ApiClient(API_BASE_URL), []);

  const handleUnauthorized = useCallback(() => {
    if (redirectingRef.current) {
      return;
    }

    clearToken(api);
    setUser(null);
    setIsLoading(false);

    const currentPath = window.location.pathname;
    if (AUTH_ROUTES.has(currentPath)) {
      redirectingRef.current = false;
      setIsRedirectingToLogin(false);
      return;
    }

    redirectingRef.current = true;
    setIsRedirectingToLogin(true);
    const from = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    navigate('/login', {
      replace: true,
      state: { from },
    });
  }, [api, navigate]);

  useEffect(() => {
    api.setUnauthorizedHandler(handleUnauthorized);

    return () => {
      api.setUnauthorizedHandler(null);
    };
  }, [api, handleUnauthorized]);

  useEffect(() => {
    if (location.pathname === '/login') {
      redirectingRef.current = false;
      setIsRedirectingToLogin(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);

    if (storedToken && isStoredTokenValid()) {
      // Token is fresh — restore immediately without a network roundtrip
      api.setAccessToken(storedToken);
      api.getProfile()
        .then((profile) => setUser(profile))
        .catch(() => {
          // Token rejected by server (revoked, etc.) — fall back to refresh
          clearToken(api);
          return api.refreshToken()
            .then((res) => { saveToken(res.accessToken, api); return api.getProfile(); })
            .then((profile) => setUser(profile))
            .catch(() => { /* no valid session */ });
        })
        .finally(() => setIsLoading(false));
    } else {
      // No valid local token — try refresh token cookie
      api.refreshToken()
        .then((res) => {
          saveToken(res.accessToken, api);
          return api.getProfile();
        })
        .then((profile) => setUser(profile))
        .catch(() => { clearToken(api); })
        .finally(() => setIsLoading(false));
    }
  }, [api]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    saveToken(res.accessToken, api);
    redirectingRef.current = false;
    setIsRedirectingToLogin(false);
    setUser(res.user);
  }, [api]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await api.register(name, email, password);
    saveToken(res.accessToken, api);
    redirectingRef.current = false;
    setIsRedirectingToLogin(false);
    setUser(res.user);
  }, [api]);

  const logout = useCallback(async () => {
    try { await api.logout(); } catch { /* ignore */ }
    clearToken(api);
    redirectingRef.current = false;
    setIsRedirectingToLogin(false);
    setUser(null);
  }, [api]);

  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    isRedirectingToLogin,
    login,
    register,
    logout,
    api,
  }), [user, isLoading, isRedirectingToLogin, login, register, logout, api]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
