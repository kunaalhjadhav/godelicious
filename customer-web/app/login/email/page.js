"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { api2 } from "@/lib/api2";
import { setToken } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { firebaseReady, googleIdToken, appleIdToken } from "@/lib/firebaseAuth";

// Email and password sign in or sign up, plus Google when Firebase is set up.
export default function EmailLoginPage() {
  const { login, register, acceptLogin } = useAuth();

  // Signs the person in with the server's reply. Falls back to a full page load if the
  // sign-in helper isn't available, so an older file can never break this step.
  function finishLogin(data) {
    if (typeof acceptLogin === "function") { acceptLogin(data); return true; }
    setToken(data.token);
    window.location.href = "/";
    return false;
  }
  const router = useRouter();
  const [mode, setMode] = useState("signin"); // signin | signup
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [googleOn, setGoogleOn] = useState(false);
  const [appleOn, setAppleOn] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!firebaseReady()) return;
    api2.firebaseStatus().then((d) => { setGoogleOn(Boolean(d.google ?? d.enabled)); setAppleOn(Boolean(d.apple)); }).catch(() => {});
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      if (mode === "signin") await login(email.trim(), password);
      else await register(name.trim(), email.trim(), password, phone.trim() || undefined);
      router.push("/");
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function social(kind) {
    setError(""); setBusy(true);
    try {
      const idToken = kind === "apple" ? await appleIdToken() : await googleIdToken();
      if (finishLogin(await api2.firebaseLogin(idToken))) router.push("/");
    } catch (err) {
      if (!/popup-closed|cancelled/i.test(err.message || "")) setError(err.message || "Sign-in failed.");
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-paper">
      <Nav />
      <div className="max-w-sm mx-auto px-5 py-16 fade-in">
        <img src="/logo-full.png" alt="Godelicious" className="w-44 h-44 rounded-2xl mx-auto mb-6" />
        <h1 className="font-display text-2xl text-ink mb-1">{mode === "signin" ? "Sign in with email" : "Create your account"}</h1>
        <p className="text-sm text-ink/50 mb-6">{mode === "signin" ? "Use your email and password." : "It takes a minute. Your phone number is optional."}</p>

        {error && <div className="mb-4 text-sm text-chili bg-chili/10 border-l-2 border-chili px-3 py-2">{error}</div>}

        <form onSubmit={submit} className="bg-white border border-line rounded-sm p-6">
          {mode === "signup" && (
            <>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Your name</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" className="field-input mb-4" />
            </>
          )}
          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Email</label>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" className="field-input mb-4" />
          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Password</label>
          <input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signin" ? "current-password" : "new-password"} placeholder="At least 6 characters" className="field-input mb-4" />
          {mode === "signup" && (
            <>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Mobile number (optional)</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" className="field-input mb-4" />
            </>
          )}
          <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</button>
          <button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }} className="w-full text-xs text-ink/50 mt-3 hover:underline">
            {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>
        </form>

        {googleOn && (
          <div className="mt-4 grid gap-2">
            <button type="button" onClick={() => social("google")} disabled={busy} className="w-full bg-white border border-line rounded-sm py-2.5 text-sm font-medium text-ink">Continue with Google</button>
            {appleOn && <button type="button" onClick={() => social("apple")} disabled={busy} className="w-full bg-black text-white rounded-sm py-2.5 text-sm font-medium">Continue with Apple</button>}
          </div>
        )}
      </div>
    </div>
  );
}
