"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import OtpForm from "@/components/OtpForm";
import { api } from "@/lib/api";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState(searchParams.get("phone") || "");
  const [devCode, setDevCode] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Existing number → send OTP here. New number → hand off to /register with
  // the phone prefilled.
  async function continueWithPhone(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { exists } = await api.checkPhone(phone);
      if (!exists) {
        const qs = new URLSearchParams({ phone, next });
        router.push(`/register?${qs}`);
        return;
      }
      const data = await api.requestOtp(phone);
      setDevCode(data.devCode || "");
      setStep("otp");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function resetToPhone() {
    setStep("phone");
    setDevCode("");
    setError("");
  }

  return (
    <div className="min-h-screen bg-paper">
      <Nav />
      <div className="max-w-sm mx-auto px-5 py-16 fade-in">
        <img src="/logo-full.png" alt="Godelicious" className="w-44 h-44 rounded-2xl mx-auto mb-6" />
        <h1 className="font-display text-2xl text-ink mb-1">Sign in</h1>
        <p className="text-sm text-ink/50 mb-6">
          {step === "otp" ? `Enter the 6-digit code sent to ${phone}.` : "Enter your mobile number to log in."}
        </p>

        {step === "phone" && (
          <form onSubmit={continueWithPhone} className="bg-white border border-line rounded-sm p-6">
            {error && (
              <div className="mb-4 text-sm text-chili bg-chili/10 border-l-2 border-chili px-3 py-2">{error}</div>
            )}
            <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Mobile number</label>
            <input
              required value={phone} onChange={(e) => setPhone(e.target.value)}
              type="tel" placeholder="9876543210" autoComplete="tel"
              className="field-input mb-4"
            />
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? "Please wait…" : "Login"}
            </button>
            <Link
              href={`/register?${new URLSearchParams({ next })}`}
              className="block text-center text-xs text-ink/50 mt-3 hover:underline"
            >
              New here? Create an account
            </Link>
          </form>
        )}

        {step === "otp" && (
          <OtpForm
            phone={phone}
            devCode={devCode}
            onVerified={() => router.push(next)}
            onChangeNumber={resetToPhone}
          />
        )}
      </div>
    </div>
  );
}
