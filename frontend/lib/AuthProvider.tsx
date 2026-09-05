"use client";
// ============================================================
// lib/AuthProvider.tsx
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// The single source of truth, on the frontend, for "who is
// logged in right now?". On first load it asks the backend
// (GET /api/auth/me) whether the login cookie already in the
// browser is valid — this is what keeps someone logged in after
// a page refresh. Every component that needs to know the current
// user, or needs to log someone in/out, reads from this context
// instead of managing its own copy of that state.
// ============================================================

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export interface SessionUser {
  id: string;
  username: string;
  email?: string;
  role: "admin" | "operator" | "device" | "passenger";
}

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; message: string }>;
  loginWithGoogle: (credential: string) => Promise<{ ok: boolean; message: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (res.ok) {
      setUser(data.user);
      return { ok: true, message: data.message };
    }
    return { ok: false, message: data.message || "Login failed." };
  }, []);

  const loginWithGoogle = useCallback(async (credential: string) => {
    const res = await fetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ credential }),
    });
    const data = await res.json();
    if (res.ok) {
      setUser(data.user);
      return { ok: true, message: data.message };
    }
    return { ok: false, message: data.message || "Google sign-in failed." };
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
