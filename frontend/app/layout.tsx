// ============================================================
// app/layout.tsx
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// The outermost HTML shell every page renders inside. It loads
// the global styles, sets the page title, and wraps everything
// in the theme (light/dark) and auth (who's logged in) providers
// so any component anywhere in the app can use them.
// ============================================================

import type { ReactNode } from "react";
import "./globals.css";
import { ThemeProvider } from "@/lib/ThemeProvider";
import { AuthProvider } from "@/lib/AuthProvider";

export const metadata = {
  title: "SmartRail Twin",
  description: "Passenger Digital Twin and Dynamic Crowd & ETA Intelligence for Mumbai Suburban Network",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
