"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import ThemeToggle from "./ThemeToggle";
import LoginModal from "./LoginModal";

export default function Navbar({ onOpenControlRoom }: { onOpenControlRoom?: () => void }) {
  const { user, logout, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-xs font-bold text-white shadow-sm">
          🚆
        </div>
        <div>
          <span className="text-[15px] font-bold tracking-tight">SmartRail Twin</span>
          <span className="ml-2 hidden text-xs text-[rgb(var(--text-muted))] sm:inline">
            Mumbai Suburban Network
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {onOpenControlRoom && (
          <button
            onClick={onOpenControlRoom}
            className="flex items-center gap-1.5 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--text))] hover:bg-brand-600/10 hover:border-brand-600 hover:text-brand-600 transition"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">Operations</span> Control Room
          </button>
        )}

        <ThemeToggle />
        {!loading && (
          <>
            {user ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="hidden text-xs font-medium text-[rgb(var(--text))] sm:inline">{user.username}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      user.role === "admin"
                        ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                        : user.role === "operator"
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="rounded-full border border-[rgb(var(--border))] px-3 py-1.5 text-xs sm:text-sm hover:bg-[rgb(var(--surface-2))]"
                >
                  Log out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="rounded-full bg-brand-600 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-white hover:bg-brand-700"
              >
                Login
              </button>
            )}
          </>
        )}
      </div>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </header>
  );
}
