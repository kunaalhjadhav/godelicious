"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/useAuth";

// Shared "enter the code" step for both /login and /register. `name` is only
// passed for new users — the backend creates the account on first verify.
export default function OtpForm({ phone, name, devCode, onVerified, onChangeNumber }) {
  const { loginWithOtp } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const abortRef = useRef(null);

  // WebOTP — on supported browsers (mainly mobile Chrome) this offers one-tap
  // autofill from the incoming SMS. Silent no-op elsewhere.
  useEffect(() => {
    if (!("OTPCredential" in window)) return;

    abortRef.current = new AbortController();
    navigator.credentials
      .get({ otp: { transport: ["sms"] }, signal: abortRef.current.signal })
      .then((otp) => {
        if (otp?.code) setCode(otp.code);
      })
      .catch(() => {});

    return () => abortRef.current?.abort();
  }, []);

  async function verifyCode(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await loginWithOtp(phone, code, name);
      onVerified();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={verifyCode} className="bg-white border border-line rounded-sm p-6">
      {error && (
        <div className="mb-4 text-sm text-chili bg-chili/10 border-l-2 border-chili px-3 py-2">{error}</div>
      )}
      <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">
        Enter the 6-digit code
      </label>
      <input
        required value={code} onChange={(e) => setCode(e.target.value)}
        maxLength={6} placeholder="123456" autoComplete="one-time-code" inputMode="numeric"
        className="field-input mb-4 font-mono tracking-widest"
      />
      {devCode && (
        <p className="text-xs text-saffron2 mb-4 font-mono">
          Dev mode — your code is {devCode} (SMS provider not yet configured)
        </p>
      )}
      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? "Please wait…" : "Verify & continue"}
      </button>
      <button
        type="button"
        onClick={onChangeNumber}
        className="w-full text-xs text-ink/50 mt-3 hover:underline"
      >
        Use a different number
      </button>
    </form>
  );
}
