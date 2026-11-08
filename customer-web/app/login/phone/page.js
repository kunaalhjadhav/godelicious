"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { api2 } from "@/lib/api2";
import { useAuth } from "@/lib/useAuth";
import { sendPhoneCode, confirmPhoneCode } from "@/lib/firebaseAuth";

// Phone sign in where Firebase sends the code (no DLT needed).
export default function FirebasePhoneLoginPage() {
  const { acceptLogin } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function requestCode(e) {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      setConfirmation(await sendPhoneCode(phone, "recaptcha-box"));
    } catch (err) {
      const code = err?.code || "";
      const known = {
        "auth/invalid-phone-number": "Please enter a valid 10 digit mobile number.",
        "auth/operation-not-allowed": "Phone sign-in is not switched on yet. Please use SMS code, WhatsApp or email for now.",
        "auth/billing-not-enabled": "Phone sign-in needs the Firebase pay-as-you-go plan. Please use another sign-in method for now.",
        "auth/quota-exceeded": "Too many codes were sent today. Please try again tomorrow or use another sign-in method.",
        "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
        "auth/unauthorized-domain": "This website isn't allowed to send codes yet. Please use another sign-in method.",
        "auth/captcha-check-failed": "The security check failed. Please reload the page and try again.",
      };
      setError(`${known[code] || "Couldn't send the code. Please try again, or use another sign-in method."}${code ? ` (${code})` : ""}`);
    } finally { setBusy(false); }
  }

  async function verify(e) {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const idToken = await confirmPhoneCode(confirmation, code);
      acceptLogin(await api2.firebaseLogin(idToken, name));
      router.push("/");
    } catch (err) {
      setError(/invalid-verification|code/i.test(err.message) ? "That code isn't right. Please check and try again." : err.message);
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-paper">
      <Nav />
      <div className="max-w-sm mx-auto px-5 py-16 fade-in">
        <img src="/logo-full.png" alt="Godelicious" className="w-44 h-44 rounded-2xl mx-auto mb-6" />
        <h1 className="font-display text-2xl text-ink mb-1">Sign in with a phone code</h1>
        <p className="text-sm text-ink/50 mb-6">We text a 6-digit code to your mobile number.</p>
        {error && <div className="mb-4 text-sm text-chili bg-chili/10 border-l-2 border-chili px-3 py-2">{error}</div>}

        <form onSubmit={confirmation ? verify : requestCode} className="bg-white border border-line rounded-sm p-6">
          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Your name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} disabled={!!confirmation} placeholder="Jane Doe" className="field-input mb-4" />
          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Mobile number</label>
          <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!!confirmation} placeholder="9876543210" autoComplete="tel" className="field-input mb-4" />
          {confirmation && (
            <>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Enter the 6-digit code</label>
              <input required value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" className="field-input mb-4 font-mono tracking-widest" />
            </>
          )}
          <div id="recaptcha-box" />
          <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? "Please wait…" : confirmation ? "Verify & continue" : "Send code"}</button>
          {confirmation && (
            <button type="button" onClick={() => { setConfirmation(null); setCode(""); }} className="w-full text-xs text-ink/50 mt-3 hover:underline">Use a different number</button>
          )}
        </form>
      </div>
    </div>
  );
}
