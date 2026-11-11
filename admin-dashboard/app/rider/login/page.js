"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { APP_NAME } from "@/lib/brand";

export default function RiderLoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(""); setBusy(true);
    try { await login(email, password); } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-charcoal px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.png?v=3" alt={APP_NAME} className="w-20 h-20 rounded-2xl mx-auto mb-3 ring-1 ring-white/20" />
          <div className="font-display text-2xl text-paper">{APP_NAME} Rider</div>
          <div className="text-xs text-white/40 mt-1 font-mono uppercase tracking-widest">delivery partner app</div>
        </div>
        <form onSubmit={submit} className="bg-paper rounded-xl p-6 shadow-xl">
          <h1 className="font-display text-lg text-ink mb-4">Sign in</h1>
          {error && <div className="mb-4 text-sm text-chili bg-chili/10 border-l-2 border-chili px-3 py-2">{error}</div>}
          <label className="block text-xs font-mono uppercase text-ink/60 mb-1">Email</label>
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full mb-4 px-3 py-3 border border-line bg-white rounded-lg text-base" />
          <label className="block text-xs font-mono uppercase text-ink/60 mb-1">Password</label>
          <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full mb-6 px-3 py-3 border border-line bg-white rounded-lg text-base" />
          <button disabled={busy} className="w-full bg-basil text-white py-3 rounded-lg font-semibold disabled:opacity-50">
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <p className="text-sm text-ink/60 mt-5 text-center">
            New rider? <Link href="/rider/register" className="text-saffron2 font-medium">Join as a delivery partner</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
