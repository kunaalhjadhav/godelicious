"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { api2 } from "@/lib/api2";
import { useAuth } from "@/lib/useAuth";

// Sign in with a code sent on WhatsApp. Same account and same result as the SMS sign in.
export default function WhatsAppLoginPage() {
  const { acceptLogin } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [devCode, setDevCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function requestCode(e) {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const d = await api2.waRequest(phone);
      setSent(true);
      if (d.devCode) setDevCode(d.devCode);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function verifyCode(e) {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const data = await api2.waVerify(phone, code, name);
      acceptLogin(data);
      router.push("/");
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-paper">
      <Nav />
      <div className="max-w-sm mx-auto px-5 py-16 fade-in">
        <img src="/logo-full.png" alt="Godelicious" className="w-44 h-44 rounded-2xl mx-auto mb-6" />
        <h1 className="font-display text-2xl text-ink mb-1">Sign in with WhatsApp</h1>
        <p className="text-sm text-ink/50 mb-6">We send a 6-digit code to your WhatsApp. New here? Your account is created automatically.</p>

        {error && <div className="mb-4 text-sm text-chili bg-chili/10 border-l-2 border-chili px-3 py-2">{error}</div>}

        <form onSubmit={sent ? verifyCode : requestCode} className="bg-white border border-line rounded-sm p-6">
          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Your name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} disabled={sent} placeholder="Jane Doe" className="field-input mb-4" />

          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">WhatsApp number</label>
          <input required value={phone} onChange={(e) => setPhone(e.target.value)} disabled={sent} type="tel" placeholder="9876543210" autoComplete="tel" className="field-input mb-4" />

          {sent && (
            <>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Enter the 6-digit code from WhatsApp</label>
              <input required value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} placeholder="123456" autoComplete="one-time-code" inputMode="numeric" className="field-input mb-4 font-mono tracking-widest" />
              {devCode && <p className="text-xs text-saffron2 mb-4 font-mono">Dev mode: your code is {devCode}</p>}
            </>
          )}

          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? "Please wait…" : sent ? "Verify & continue" : "Send code on WhatsApp"}
          </button>
          {sent && (
            <button type="button" onClick={() => { setSent(false); setCode(""); setDevCode(""); }} className="w-full text-xs text-ink/50 mt-3 hover:underline">
              Use a different number
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
