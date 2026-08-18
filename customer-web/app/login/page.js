"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

export default function LoginPage() {
  const { login, loginWithOtp } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState("password"); // "password" | "otp"

  // password mode
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // otp mode
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [devCode, setDevCode] = useState(""); // shown only outside production, see backend otp.controller.js

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handlePasswordLogin(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

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
      <div className="max-w-sm mx-auto px-5 py-16">
        <h1 className="font-display text-2xl text-ink mb-4">Sign in</h1>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setMode("password"); setError(""); }}
            className={`flex-1 text-sm py-2 rounded-sm border ${mode === "password" ? "bg-charcoal text-paper border-charcoal" : "border-line text-ink bg-white"}`}
          >
            Email & password
          </button>
          <button
            onClick={() => { setMode("otp"); setError(""); }}
            className={`flex-1 text-sm py-2 rounded-sm border ${mode === "otp" ? "bg-charcoal text-paper border-charcoal" : "border-line text-ink bg-white"}`}
          >
            Phone OTP
          </button>
        </div>

        {error && (
          <div className="mb-4 text-sm text-chili bg-chili/10 border-l-2 border-chili px-3 py-2">{error}</div>
        )}

        {mode === "password" ? (
          <form onSubmit={handlePasswordLogin} className="bg-white border border-line rounded-sm p-6">
            <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Email</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full mb-4 px-3 py-2 border border-line rounded-sm text-sm"
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
              {submitting ? "Signing in…" : "Sign in"}
            </button>
            <p className="text-sm text-ink/60 mt-4 text-center">
              New here? <Link href="/register" className="text-saffron2 hover:underline">Create an account</Link>
            </p>
            <p className="text-xs text-ink/40 mt-3 text-center font-mono">
              seed: customer@godelicious.com / Customer@123
            </p>
          </form>
        ) : (
          <form onSubmit={otpSent ? verifyCode : requestCode} className="bg-white border border-line rounded-sm p-6">
            <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Phone number</label>
            <input
              required value={phone} onChange={(e) => setPhone(e.target.value)}
              disabled={otpSent} type="tel" placeholder="9876543210"
              className="w-full mb-4 px-3 py-2 border border-line rounded-sm text-sm disabled:bg-line/30"
            />

            {otpSent && (
              <>
                <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">
                  Enter the 6-digit code sent to your phone
                </label>
                <input
                  required value={code} onChange={(e) => setCode(e.target.value)}
                  maxLength={6} placeholder="123456"
                  className="w-full mb-4 px-3 py-2 border border-line rounded-sm text-sm font-mono tracking-widest"
                />
                <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">
                  Your name (first time only)
                </label>
                <input
                  value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full mb-4 px-3 py-2 border border-line rounded-sm text-sm"
                />
                {devCode && (
                  <p className="text-xs text-saffron2 mb-4 font-mono">
                    Dev mode — your code is {devCode} (SMS provider not yet configured, see DEPLOYMENT_GUIDE.md)
                  </p>
                )}
              </>
            )}

            <button
              type="submit" disabled={submitting}
              className="w-full bg-charcoal text-paper py-2.5 rounded-sm text-sm font-medium disabled:opacity-50"
            >
              {submitting ? "Please wait…" : otpSent ? "Verify & sign in" : "Send code"}
            </button>

            {otpSent && (
              <button
                type="button"
                onClick={() => { setOtpSent(false); setCode(""); setDevCode(""); }}
                className="w-full text-xs text-ink/50 mt-3 hover:underline"
              >
                Use a different phone number
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
