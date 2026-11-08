"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api2 } from "@/lib/api2";
import { useAuth } from "@/lib/useAuth";
import { firebaseReady, googleIdToken, appleIdToken } from "@/lib/firebaseAuth";

// "Continue with Google" / "Continue with Apple" on every sign-in page. Hidden until
// Google/Apple sign-in is switched on (Firebase set up on the website and server).
export default function SocialLogin() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const { acceptLogin } = useAuth();
  const [on, setOn] = useState(false);
  const [appleOn, setAppleOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!firebaseReady()) return;
    api2.firebaseStatus().then((d) => { setOn(Boolean(d.google ?? d.enabled)); setAppleOn(Boolean(d.apple)); }).catch(() => {});
  }, []);

  // The email page and the app hand-off page show their own buttons.
  if (!on || pathname.startsWith("/login/email") || pathname.startsWith("/login/app")) return null;

  async function go(kind) {
    setError(""); setBusy(true);
    try {
      const idToken = kind === "apple" ? await appleIdToken() : await googleIdToken();
      acceptLogin(await api2.firebaseLogin(idToken));
      router.push("/");
    } catch (err) {
      if (!/popup-closed|cancelled/i.test(err.message || "")) setError(err.message || "Sign-in failed.");
    } finally { setBusy(false); }
  }

  return (
    <div className="social-login">
      <div className="social-or"><span>or</span></div>
      <button type="button" className="social-btn social-google" onClick={() => go("google")} disabled={busy}>
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.8 6.1C12.4 13.7 17.7 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.5 5.8c4.4-4 6.8-10 6.8-17.2z"/>
          <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-2.9-.8-4.6s.3-3.2.8-4.6l-7.8-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.8-6.1z"/>
          <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.2-13.5-10l-7.8 6.1C6.6 42.6 14.6 48 24 48z"/>
        </svg>
        Continue with Google
      </button>
      {appleOn && (
      <button type="button" className="social-btn social-apple" onClick={() => go("apple")} disabled={busy}>
        <svg width="16" height="18" viewBox="0 0 814 1000" aria-hidden="true">
          <path fill="#fff" d="M788 341c-6 4-108 62-108 190 0 148 130 200 134 202-1 3-21 72-69 142-43 62-88 124-156 124s-86-40-165-40c-77 0-104 41-166 41s-106-57-156-127C45 791 0 666 0 548 0 358 124 257 246 257c65 0 119 43 160 43 39 0 100-45 174-45 28 0 129 3 196 86zM558 158c31-36 52-87 52-137 0-7-1-14-2-20-50 2-109 33-145 75-28 32-54 83-54 134 0 8 1 15 2 18 3 1 9 2 14 2 45 0 101-30 133-72z"/>
        </svg>
        Continue with Apple
      </button>
      )}
      {error && <p className="social-error">{error}</p>}
    </div>
  );
}
