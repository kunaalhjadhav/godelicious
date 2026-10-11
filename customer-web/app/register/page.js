"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import OtpForm from "@/components/OtpForm";
import { api } from "@/lib/api";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper" />}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const [step, setStep] = useState("details");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState(searchParams.get("phone") || "");
  const [devCode, setDevCode] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // The account itself is created by the backend when the OTP is verified
  // (otp.controller.js verifyOtp), using the name sent along with the code.
  async function registerAndSendCode(e) {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2) {
      setError("Please enter your name.");
      return;
    }
    setSubmitting(true);
    try {
      const { exists } = await api.checkPhone(phone);
      if (exists) {
        setError("This number is already registered. Please sign in instead.");
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

  function resetToDetails() {
    setStep("details");
    setDevCode("");
    setError("");
  }

  const loginHref = `/login?${new URLSearchParams({ phone, next })}`;

  return (
    <div className="min-h-screen bg-paper">
      <Nav />
      <div className="max-w-sm mx-auto px-5 py-16 fade-in">
        <img src="/logo-full.png" alt="Godelicious" className="w-44 h-44 rounded-2xl mx-auto mb-6" />
        <h1 className="font-display text-2xl text-ink mb-1">Create account</h1>
        <p className="text-sm text-ink/50 mb-6">
          {step === "otp"
            ? `Enter the 6-digit code sent to ${phone}.`
            : "Enter your name and mobile number — we'll send a verification code."}
        </p>

        {step === "details" && (
          <form onSubmit={registerAndSendCode} className="bg-white border border-line rounded-sm p-6">
            {error && (
              <div className="mb-4 text-sm text-chili bg-chili/10 border-l-2 border-chili px-3 py-2">{error}</div>
            )}
            <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Your name</label>
            <input
              required value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe" autoComplete="name"
              className="field-input mb-4"
            />
            <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Mobile number</label>
            <input
              required value={phone} onChange={(e) => setPhone(e.target.value)}
              type="tel" placeholder="9876543210" autoComplete="tel"
              className="field-input mb-4"
            />
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? "Please wait…" : "Register"}
            </button>
            <Link href={loginHref} className="block text-center text-xs text-ink/50 mt-3 hover:underline">
              Already have an account? Sign in
            </Link>
          </form>
        )}

        {step === "otp" && (
          <OtpForm
            phone={phone}
            name={name.trim()}
            devCode={devCode}
            onVerified={() => router.push(next)}
            onChangeNumber={resetToDetails}
          />
        )}
      </div>
    </div>
  );
}
