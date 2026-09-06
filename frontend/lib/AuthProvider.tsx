"use client";

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
  switchRole: (role: "admin" | "operator" | "passenger") => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize from localStorage immediately to avoid layout jumps or iframe cookie blocks
  useEffect(() => {
    try {
      const stored = localStorage.getItem("smartrail_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id && parsed.role) {
          setUser(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data?.user) {
          setUser(data.user);
          try {
            localStorage.setItem("smartrail_user", JSON.stringify(data.user));
          } catch {
            // ignore
          }
        }
      }
    } catch {
      // If server or network fails, retain existing user in localStorage
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        try {
          localStorage.setItem("smartrail_user", JSON.stringify(data.user));
          if (data.token) {
            localStorage.setItem("smartrail_token", data.token);
          }
        } catch {
          // ignore
        }
        return { ok: true, message: data.message };
      }
      return { ok: false, message: data.message || "Login failed." };
    } catch (e: any) {
      return { ok: false, message: e.message || "Network error during login." };
    }
  }, []);

  const loginWithGoogle = useCallback(async (credential: string) => {
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ credential }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        try {
          localStorage.setItem("smartrail_user", JSON.stringify(data.user));
        } catch {
          // ignore
        }
        return { ok: true, message: data.message };
      }
      return { ok: false, message: data.message || "Google sign-in failed." };
    } catch (e: any) {
      return { ok: false, message: e.message || "Google sign-in error." };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // ignore
    }
    setUser(null);
    try {
      localStorage.removeItem("smartrail_user");
      localStorage.removeItem("smartrail_token");
    } catch {
      // ignore
    }
  }, []);

  const switchRole = useCallback((role: "admin" | "operator" | "passenger") => {
    const roleUsers = {
      admin: { id: "usr_admin", username: "admin", email: "admin@smartrailtwin.local", role: "admin" as const },
      operator: { id: "usr_operator", username: "operator", email: "operator@smartrailtwin.local", role: "operator" as const },
      passenger: { id: "usr_passenger1", username: "passenger1", email: "passenger1@example.com", role: "passenger" as const },
    };
    const newUser = roleUsers[role];
    setUser(newUser);
    try {
      localStorage.setItem("smartrail_user", JSON.stringify(newUser));
    } catch {
      // ignore
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
