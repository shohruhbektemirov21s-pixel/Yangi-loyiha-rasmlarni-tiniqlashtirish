"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  AuthSession,
  AuthUser,
  LoginInput,
  RegisterInput,
  getMeRequest,
  loginRequest,
  logoutRequest,
  registerRequest,
} from "@/lib/api/auth";
import { clearStoredSession, readStoredSession, storeSession } from "@/lib/auth/session";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<AuthSession>;
  signup: (input: RegisterInput) => Promise<AuthSession>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applySession = useCallback((session: AuthSession) => {
    setToken(session.accessToken);
    setUser(session.user);
    storeSession(session);
  }, []);

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    clearStoredSession();
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) {
      return;
    }

    const refreshedUser = await getMeRequest(token);
    setUser(refreshedUser);

    const current = readStoredSession();
    if (current) {
      storeSession({
        ...current,
        user: refreshedUser,
      });
    }
  }, [token]);

  const login = useCallback(
    async (input: LoginInput): Promise<AuthSession> => {
      const session = await loginRequest(input);
      applySession(session);
      return session;
    },
    [applySession]
  );

  const signup = useCallback(
    async (input: RegisterInput): Promise<AuthSession> => {
      const session = await registerRequest(input);
      applySession(session);
      return session;
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    const activeToken = token ?? readStoredSession()?.accessToken ?? null;
    if (activeToken) {
      try {
        await logoutRequest(activeToken);
      } catch {
        // Ignore logout failures to keep local state clean.
      }
    }

    clearSession();
  }, [clearSession, token]);

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      const stored = readStoredSession();
      if (!stored) {
        // Sessiya yo'q, lekin `imageclear_auth` cookie qolgan bo'lsa — middleware kirgizadi,
        // lekin API uchun token yo'q (401). Cookie ni tozalash.
        clearStoredSession();
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      if (isMounted) {
        setToken(stored.accessToken);
        setUser(stored.user);
      }

      try {
        const me = await getMeRequest(stored.accessToken);
        if (!isMounted) {
          return;
        }

        setUser(me);
        storeSession({ ...stored, user: me });
      } catch {
        if (!isMounted) {
          return;
        }
        clearSession();
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: Boolean(user && token),
      login,
      signup,
      logout,
      refreshUser,
    }),
    [isLoading, login, logout, refreshUser, signup, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}
