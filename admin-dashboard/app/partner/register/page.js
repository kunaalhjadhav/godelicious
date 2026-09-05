"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { APP_NAME } from "@/lib/brand";

export default function PartnerRegisterPage() {
  const { registerBrandPartner } = useAuth();
  const [form, setForm] = useState({ brandName: "", name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await registerBrandPartner(form);
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
            sell through our platform
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-paper rounded-sm p-7 shadow-xl">
          <h1 className="font-display text-lg text-ink mb-1">Register your brand</h1>
          <p className="text-xs text-ink/50 mb-5">
            Your account is created instantly — an admin will review and approve your brand
            before it's visible to customers.
          </p>

          {error && (
            <div className="mb-4 text-sm text-chili bg-chili/10 border-l-2 border-chili px-3 py-2">{error}</div>
          )}

          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Brand name</label>
          <input
            required value={form.brandName} onChange={(e) => setForm({ ...form, brandName: e.target.value })}
            placeholder="e.g. Spice Route Kitchen"
            className="w-full mb-3 px-3 py-2 border border-line bg-white rounded-sm text-sm"
          />

          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Your name</label>
          <input
            required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full mb-3 px-3 py-2 border border-line bg-white rounded-sm text-sm"
          />

          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Email</label>
          <input
            type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full mb-3 px-3 py-2 border border-line bg-white rounded-sm text-sm"
          />

          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Phone</label>
          <input
            value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full mb-3 px-3 py-2 border border-line bg-white rounded-sm text-sm"
          />

          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Password</label>
          <input
            type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full mb-6 px-3 py-2 border border-line bg-white rounded-sm text-sm"
          />

          <button
            type="submit" disabled={submitting}
            className="w-full bg-charcoal text-paper py-2.5 rounded-sm text-sm font-medium hover:bg-charcoal2 disabled:opacity-50"
          >
            {submitting ? "Creating account…" : "Create partner account"}
          </button>

          <p className="text-xs text-ink/50 mt-4 text-center">
            Already registered? <Link href="/partner/login" className="text-saffron2 hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
