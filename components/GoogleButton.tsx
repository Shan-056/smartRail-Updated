"use client";
// ============================================================
// components/GoogleButton.tsx
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Renders Google's own "Sign in with Google" button using
// Google's Identity Services script (loaded once, on demand).
// When someone taps it, Google handles the entire login popup
// itself and hands back a signed credential token, which we pass
// straight to our loginWithGoogle() (see lib/AuthProvider.tsx) —
// that's the request that actually creates/logs in the account.
//
// If NEXT_PUBLIC_GOOGLE_CLIENT_ID isn't set, this renders a
// disabled explainer instead of a broken button, so the rest of
// the login flow still works while Google sign-in is being set up.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/AuthProvider";

declare global {
  interface Window {
    google?: any;
  }
}

export default function GoogleButton({ onDone }: { onDone: (result: { ok: boolean; message: string }) => void }) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const { loginWithGoogle } = useAuth();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) return;
    if (window.google) {
      setScriptLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    document.body.appendChild(script);
  }, [clientId]);

  useEffect(() => {
    if (!scriptLoaded || !clientId || !buttonRef.current || !window.google) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: { credential: string }) => {
        const result = await loginWithGoogle(response.credential);
        onDone(result);
      },
    });

    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      width: 320,
      text: "continue_with",
      shape: "pill",
    });
  }, [scriptLoaded, clientId, loginWithGoogle, onDone]);

  if (!clientId) {
    return (
      <div className="rounded-full border border-dashed border-[rgb(var(--border))] px-4 py-2.5 text-center text-sm text-[rgb(var(--text-muted))]">
        Google sign-in isn&apos;t configured yet — set NEXT_PUBLIC_GOOGLE_CLIENT_ID.
      </div>
    );
  }

  return <div ref={buttonRef} className="flex justify-center" />;
}
