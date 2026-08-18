"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { useAuth } from "@/lib/useAuth";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register(name, email, password, phone);
      router.push("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <Nav />
      <div className="max-w-sm mx-auto px-5 py-16">
        <h1 className="font-display text-2xl text-ink mb-6">Create account</h1>

        <form onSubmit={handleSubmit} className="bg-white border border-line rounded-sm p-6">
          {error && (
            <div className="mb-4 text-sm text-chili bg-chili/10 border-l-2 border-chili px-3 py-2">{error}</div>
          )}

          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Full name</label>
          <input
            required value={name} onChange={(e) => setName(e.target.value)}
            className="w-full mb-3 px-3 py-2 border border-line rounded-sm text-sm"
          />

          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Email</label>
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full mb-3 px-3 py-2 border border-line rounded-sm text-sm"
          />

          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Phone</label>
          <input
            value={phone} onChange={(e) => setPhone(e.target.value)}
            className="w-full mb-3 px-3 py-2 border border-line rounded-sm text-sm"
          />

          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Password</label>
          <input
            type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full mb-6 px-3 py-2 border border-line rounded-sm text-sm"
          />

          <button
            type="submit" disabled={submitting}
            className="w-full bg-charcoal text-paper py-2.5 rounded-sm text-sm font-medium disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create account"}
          </button>

          <p className="text-sm text-ink/60 mt-4 text-center">
            Already have an account? <Link href="/login" className="text-saffron2 hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
