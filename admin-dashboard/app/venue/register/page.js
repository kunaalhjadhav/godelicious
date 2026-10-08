"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { APP_NAME } from "@/lib/brand";

const FIELDS = [
  ["venueName", "Venue name", "text", true],
  ["address", "Venue address", "text", true],
  ["city", "City", "text", false],
  ["capacity", "Guest capacity", "number", false],
  ["name", "Your name", "text", true],
  ["phone", "Phone / WhatsApp number", "tel", true],
  ["email", "Email (your login)", "email", true],
  ["password", "Password (min 6 characters)", "password", true],
];

export default function VenueRegisterPage() {
  const { registerVenuePartner } = useAuth();
  const [form, setForm] = useState({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try { await registerVenuePartner(form); } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-charcoal px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <img src="/logo.png" alt="" className="w-14 h-14 rounded-xl mx-auto mb-3" />
          <div className="font-display text-2xl text-paper tracking-tight">List your venue on {APP_NAME}</div>
        </div>
        <form onSubmit={handleSubmit} className="bg-paper rounded-sm p-7 shadow-xl">
          {error && <div className="mb-4 text-sm text-chili bg-chili/10 border-l-2 border-chili px-3 py-2">{error}</div>}
          {FIELDS.map(([key, label, type, req]) => (
            <div key={key}>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">{label}</label>
              <input
                type={type} required={req} value={form[key] || ""}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full mb-3 px-3 py-2 border border-line bg-white rounded-sm text-sm"
              />
            </div>
          ))}
          <button type="submit" disabled={submitting} className="w-full bg-charcoal text-paper py-2.5 rounded-sm text-sm font-medium disabled:opacity-50">
            {submitting ? "Creating account…" : "Create venue account"}
          </button>
          <p className="text-xs text-ink/50 mt-3 text-center">
            After signing up you can add tariffs and details. Your venue goes live for customers once our team approves it.
          </p>
          <p className="text-xs text-ink/50 mt-2 text-center">
            Already registered? <Link href="/venue/login" className="text-saffron2 hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
