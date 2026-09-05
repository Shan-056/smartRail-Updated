// ============================================================
// app/page.tsx
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// A simple placeholder page shown if someone visits the root
// URL "/" in a browser. This project's real purpose is the
// /api/* endpoints — this page just confirms the server is up
// and points people to a real endpoint to try.
// ============================================================

export default function HomePage() {
  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1>SmartRail Twin — Backend API</h1>
      <p>This server only serves API routes. Try:</p>
      <ul>
        <li>
          <code>GET /api/health</code>
        </li>
        <li>
          <code>POST /api/auth/login</code>
        </li>
        <li>
          <code>GET /api/stations</code> (requires login)
        </li>
      </ul>
    </main>
  );
}
