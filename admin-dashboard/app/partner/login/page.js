"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { APP_NAME } from "@/lib/brand";

export default function PartnerLoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-charcoal px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.svg" alt="" className="w-14 h-14 rounded-xl mx-auto mb-3" />
          <div className="font-display text-2xl text-paper tracking-tight">{APP_NAME} Partners</div>
          <div className="text-xs text-white/40 mt-1 font-mono uppercase tracking-widest">
            partner portal
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-paper rounded-sm p-7 shadow-xl">
          <h1 className="font-display text-lg text-ink mb-5">Sign in</h1>

          {error && (
            <div className="mb-4 text-sm text-chili bg-chili/10 border-l-2 border-chili px-3 py-2">{error}</div>
          )}

          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Email</label>
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full mb-4 px-3 py-2 border border-line bg-white rounded-sm text-sm"
          />

          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Password</label>
          <input
            type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full mb-6 px-3 py-2 border border-line bg-white rounded-sm text-sm"
          />

          <button
            type="submit" disabled={submitting}
            className="w-full bg-charcoal text-paper py-2.5 rounded-sm text-sm font-medium hover:bg-charcoal2 disabled:opacity-50"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>

          <p className="text-xs text-ink/50 mt-4 text-center">
            New brand partner? <Link href="/partner/register" className="text-saffron2 hover:underline">Register here</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
