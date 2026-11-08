"use client";

import { useEffect, useState } from "react";
import { api2 } from "@/lib/api2";
import { firebaseReady, googleIdToken, appleIdToken } from "@/lib/firebaseAuth";

// Opened from the mobile app. Signs in with Google or Apple, then passes the result back to
// the app through the server using the session id from the link.
export default function AppSocialLogin() {
  const [sid, setSid] = useState("");
  const [state, setState] = useState("idle"); // idle | busy | done
  const [error, setError] = useState("");
  const [first, setFirst] = useState("google");
  const [appleOn, setAppleOn] = useState(false);

  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("sid") || "";
    setSid(/^[a-f0-9]{32}$/.test(v) ? v : "");
    if (new URLSearchParams(window.location.search).get("p") === "apple") setFirst("apple");
    api2.firebaseStatus().then((d) => setAppleOn(Boolean(d.apple))).catch(() => {});
  }, []);

  async function go(kind) {
    setError(""); setState("busy");
    try {
      const idToken = kind === "apple" ? await appleIdToken() : await googleIdToken();
      await api2.firebaseHandoff(sid, idToken);
      setState("done");
    } catch (err) {
      setState("idle");
      if (!/popup-closed|cancelled/i.test(err.message || "")) setError(err.message || "Sign-in failed.");
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-sm mx-auto px-5 py-16 text-center">
        <img src="/logo-full.png" alt="Godelicious" className="w-36 h-36 rounded-2xl mx-auto mb-6" />
        {!sid || !firebaseReady() ? (
          <p className="text-sm text-ink/60">This link isn't valid. Please go back to the Godelicious app and try again.</p>
        ) : state === "done" ? (
          <>
            <h1 className="font-display text-2xl text-ink mb-2">You're signed in</h1>
            <p className="text-sm text-ink/60">Go back to the Godelicious app. It will continue on its own.</p>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl text-ink mb-5">Sign in to Godelicious</h1>
            {error && <div className="mb-4 text-sm text-chili bg-chili/10 border-l-2 border-chili px-3 py-2">{error}</div>}
            <div className={`grid gap-2 ${first === "apple" ? "[&>*:first-child]:order-2" : ""}`}>
              <button onClick={() => go("google")} disabled={state === "busy"} className="w-full bg-white border border-line rounded-sm py-3 text-sm font-medium text-ink">Continue with Google</button>
              {appleOn && <button onClick={() => go("apple")} disabled={state === "busy"} className="w-full bg-black text-white rounded-sm py-3 text-sm font-medium">Continue with Apple</button>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
