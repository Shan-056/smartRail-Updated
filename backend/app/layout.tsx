// ============================================================
// app/layout.tsx
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Next.js requires every project to have this one "wrapper"
// file, even if the project is only used as an API (no actual
// web pages). It's the outermost HTML shell. We keep it as
// bare-bones as possible since this project's real job is the
// /api/* routes, not displaying pages.
// ============================================================

export const metadata = {
  title: "SmartRail Twin — Backend",
  description: "Backend API for the Passenger Digital Twin and Dynamic ETA Engine",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
