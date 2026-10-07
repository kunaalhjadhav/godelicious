"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

export default function LoginPage() {
  const { loginWithOtp } = useAuth();
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [devCode, setDevCode] = useState(""); // shown only outside production, see backend otp.controller.js

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const abortRef = useRef(null);

  // WebOTP API — on supported browsers (mainly mobile Chrome), this lets the
  // browser itself detect an incoming SMS containing the code and offers a
  // one-tap autofill, without any native app or extra dependency. It quietly
  // does nothing on unsupported browsers — manual entry always still works.
  useEffect(() => {
    if (!otpSent || !("OTPCredential" in window)) return;

    abortRef.current = new AbortController();
    navigator.credentials
      .get({ otp: { transport: ["sms"] }, signal: abortRef.current.signal })
      .then((otp) => {
        if (otp?.code) setCode(otp.code);
      })
      .catch(() => {}); // user dismissed, timed out, or unsupported — silent no-op

    return () => abortRef.current?.abort();
  }, [otpSent]);

  async function requestCode(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const data = await api.requestOtp(phone);
      setOtpSent(true);
      if (data.devCode) setDevCode(data.devCode); // dev-only convenience, see backend
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyCode(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await loginWithOtp(phone, code, name);
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
      <div className="max-w-sm mx-auto px-5 py-16 fade-in">
        <img src="/logo-full.png" alt="Godelicious" className="w-44 h-44 rounded-2xl mx-auto mb-6" />
        <h1 className="font-display text-2xl text-ink mb-1">Sign in</h1>
        <p className="text-sm text-ink/50 mb-6">New here? Just enter your details — we'll set up your account automatically.</p>

        {error && (
          <div className="mb-4 text-sm text-chili bg-chili/10 border-l-2 border-chili px-3 py-2">{error}</div>
        )}

        <form onSubmit={otpSent ? verifyCode : requestCode} className="bg-white border border-line rounded-sm p-6">
          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Your name</label>
          <input
            required value={name} onChange={(e) => setName(e.target.value)}
            disabled={otpSent} placeholder="Jane Doe"
            className="field-input mb-4"
          />

          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Mobile number</label>
          <input
            required value={phone} onChange={(e) => setPhone(e.target.value)}
            disabled={otpSent} type="tel" placeholder="9876543210" autoComplete="tel"
            className="field-input mb-4"
          />

          {otpSent && (
            <>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">
                Enter the 6-digit code sent to your phone
              </label>
              <input
                required value={code} onChange={(e) => setCode(e.target.value)}
                maxLength={6} placeholder="123456" autoComplete="one-time-code" inputMode="numeric"
                className="field-input mb-4 font-mono tracking-widest"
              />
              {devCode && (
                <p className="text-xs text-saffron2 mb-4 font-mono">
                  Dev mode — your code is {devCode} (SMS provider not yet configured, see PRODUCTION_READY_GUIDE.md)
                </p>
              )}
            </>
          )}

          <button
            type="submit" disabled={submitting}
            className="btn-primary w-full"
          >
            {submitting ? "Please wait…" : otpSent ? "Verify & continue" : "Send code"}
          </button>

          {otpSent && (
            <button
              type="button"
              onClick={() => { setOtpSent(false); setCode(""); setDevCode(""); }}
              className="w-full text-xs text-ink/50 mt-3 hover:underline"
            >
              Use a different number
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
