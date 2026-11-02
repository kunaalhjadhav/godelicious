"use client";

// Firebase sign-in helpers (Google and phone). The Firebase pieces load only when someone uses them.
import { getFirebaseApp, isFirebaseConfigured } from "@/lib/firebase";

export const firebaseReady = () => isFirebaseConfigured;

async function auth() {
  const { getAuth } = await import("firebase/auth");
  return getAuth(getFirebaseApp());
}

export async function googleIdToken() {
  const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
  const result = await signInWithPopup(await auth(), new GoogleAuthProvider());
  return result.user.getIdToken();
}

export async function appleIdToken() {
  const { OAuthProvider, signInWithPopup } = await import("firebase/auth");
  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  const result = await signInWithPopup(await auth(), provider);
  return result.user.getIdToken();
}

let recaptcha = null;
export async function sendPhoneCode(tenDigitPhone, containerId) {
  const { RecaptchaVerifier, signInWithPhoneNumber } = await import("firebase/auth");
  const a = await auth();
  if (recaptcha) { try { recaptcha.clear(); } catch (_) {} }
  recaptcha = new RecaptchaVerifier(a, containerId, { size: "invisible" });
  const digits = String(tenDigitPhone).replace(/\D/g, "").slice(-10);
  return signInWithPhoneNumber(a, `+91${digits}`, recaptcha); // returns a confirmation object
}

export async function confirmPhoneCode(confirmation, code) {
  const result = await confirmation.confirm(code);
  return result.user.getIdToken();
}
