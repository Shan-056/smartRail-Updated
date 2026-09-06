"use client";
// ============================================================
// components/LoginModal.tsx
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// The "Master Login" popup. Three things live here:
//   1. A normal username/password form. If the backend says
//      "too many attempts" (HTTP 429 from the rate limiter in
//      middleware/rateLimit.ts), that exact message — including
//      how long to wait — is shown to the person instead of a
//      generic error.
//   2. A "Forgot password?" link that switches the modal into a
//      2-step reset flow: enter your email -> get a reset code
//      (shown directly on-screen in dev mode, since no email
//      provider is wired up yet — see the comment in
//      app/api/auth/forgot-password/route.ts) -> enter the code
//      and a new password.
//   3. A "Continue with Google" button for one-tap signup/login.
// ============================================================

import { useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import GoogleButton from "./GoogleButton";

type Mode = "login" | "forgot-request" | "forgot-reset";

export default function LoginModal({ onClose }: { onClose: () => void }) {
  const { login } = useAuth();
  const [mode, setMode] = useState<Mode>("login");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [message, setMessage] = useState<{ text: string; tone: "error" | "success" } | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const result = await login(username, password);
    setBusy(false);
    if (result.ok) {
      onClose();
    } else {
      setMessage({ text: result.message, tone: "error" });
    }
  }

  async function handleForgotRequest(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) {
      setMessage({
        text: data.devResetLink
          ? `Reset link generated (dev mode — no email server configured): ${data.devResetLink}`
          : data.message,
        tone: "success",
      });
      // Dev convenience: pull the token straight out of the link so
      // the person doesn't have to copy-paste it by hand.
      if (data.devResetLink) {
        const match = data.devResetLink.match(/token=([^&]+)/);
        if (match) setResetToken(match[1]);
      }
      setMode("forgot-reset");
    } else {
      setMessage({ text: data.message, tone: "error" });
    }
  }

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token: resetToken, newPassword }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) {
      setMessage({ text: "Password reset. You can log in now.", tone: "success" });
      setMode("login");
      setPassword("");
    } else {
      setMessage({ text: data.message, tone: "error" });
    }
  }

  return (
    <div
      id="login-portal-backdrop"
      className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/75 backdrop-blur-md px-4"
      onClick={onClose}
    >
      <div
        id="login-portal-card"
        className="relative w-full max-w-sm rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[rgb(var(--text))]">
              {mode === "login" && "SmartRail Master Login"}
              {mode === "forgot-request" && "Reset your password"}
              {mode === "forgot-reset" && "Set a new password"}
            </h2>
            {mode === "login" && (
              <p className="text-xs text-[rgb(var(--text-muted))]">Access live operations & commuter alerts</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-2))] hover:text-[rgb(var(--text))]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {message && (
          <div
            className={`mb-4 break-words rounded-lg px-3 py-2 text-sm ${
              message.tone === "error"
                ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
            }`}
          >
            {message.text}
          </div>
        )}

        {mode === "login" && (
          <>
            {/* Quick Demo Credentials Autofill & Instant Sign-in */}
            <div className="mb-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-2.5">
              <span className="block text-[11px] font-medium text-[rgb(var(--text-muted))] mb-1.5">
                Instant Demo Sign-in:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setUsername("admin");
                    setPassword("admin123");
                    setBusy(true);
                    setMessage(null);
                    const res = await login("admin", "admin123");
                    setBusy(false);
                    if (res.ok) {
                      onClose();
                    } else {
                      setMessage({ text: res.message, tone: "error" });
                    }
                  }}
                  className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-[11px] font-medium text-purple-600 hover:bg-purple-500/20 transition dark:text-purple-400"
                >
                  ⚡ Admin (Full OCC)
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setUsername("operator");
                    setPassword("operator123");
                    setBusy(true);
                    setMessage(null);
                    const res = await login("operator", "operator123");
                    setBusy(false);
                    if (res.ok) {
                      onClose();
                    } else {
                      setMessage({ text: res.message, tone: "error" });
                    }
                  }}
                  className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-600 hover:bg-amber-500/20 transition dark:text-amber-400"
                >
                  ⚡ Operator
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setUsername("passenger1");
                    setPassword("password123");
                    setBusy(true);
                    setMessage(null);
                    const res = await login("passenger1", "password123");
                    setBusy(false);
                    if (res.ok) {
                      onClose();
                    } else {
                      setMessage({ text: res.message, tone: "error" });
                    }
                  }}
                  className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[11px] font-medium text-blue-600 hover:bg-blue-500/20 transition dark:text-blue-400"
                >
                  ⚡ Passenger
                </button>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1">Username</label>
                <input
                  required
                  placeholder="e.g. admin or passenger1"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-3 py-2 text-sm text-[rgb(var(--text))] outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1">Password</label>
                <input
                  required
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-3 py-2 text-sm text-[rgb(var(--text))] outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <button
                disabled={busy}
                className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60 active:scale-[0.99]"
              >
                {busy ? "Signing in..." : "Log in to SmartRail"}
              </button>
            </form>

            <button
              onClick={() => {
                setMessage(null);
                setMode("forgot-request");
              }}
              className="mt-3 text-xs text-brand-600 hover:underline dark:text-brand-400"
            >
              Forgot password?
            </button>

            <div className="my-4 flex items-center gap-3 text-xs text-[rgb(var(--text-muted))]">
              <div className="h-px flex-1 bg-[rgb(var(--border))]" />
              OR
              <div className="h-px flex-1 bg-[rgb(var(--border))]" />
            </div>

            <GoogleButton onDone={(result) => (result.ok ? onClose() : setMessage({ text: result.message, tone: "error" }))} />
          </>
        )}

        {mode === "forgot-request" && (
          <form onSubmit={handleForgotRequest} className="space-y-3">
            <p className="text-sm text-[rgb(var(--text-muted))]">
              Enter the email on your account and we&apos;ll send a reset link.
            </p>
            <input
              required
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              disabled={busy}
              className="w-full rounded-lg bg-brand-600 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {busy ? "Sending..." : "Send reset link"}
            </button>
            <button type="button" onClick={() => setMode("login")} className="w-full text-center text-sm text-[rgb(var(--text-muted))] hover:underline">
              Back to login
            </button>
          </form>
        )}

        {mode === "forgot-reset" && (
          <form onSubmit={handleResetSubmit} className="space-y-3">
            <input
              required
              placeholder="Reset code"
              value={resetToken}
              onChange={(e) => setResetToken(e.target.value)}
              className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
            <input
              required
              type="password"
              placeholder="New password (min 8 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              disabled={busy}
              className="w-full rounded-lg bg-brand-600 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {busy ? "Saving..." : "Set new password"}
            </button>
            <button type="button" onClick={() => setMode("login")} className="w-full text-center text-sm text-[rgb(var(--text-muted))] hover:underline">
              Back to login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
