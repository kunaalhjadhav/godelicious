"use client";

// Read text aloud with the browser's own voices (no extra service).
export function canSpeak() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}

// lang: "kn-IN" for Kannada, "en-IN" for English. Returns false when this device has no voice for it.
export function speak(text, lang = "en-IN") {
  if (!canSpeak() || !text) return false;
  const synth = window.speechSynthesis;
  const voices = synth.getVoices();
  const base = lang.split("-")[0];
  const voice = voices.find((v) => v.lang === lang) || voices.find((v) => v.lang.toLowerCase().startsWith(base));
  if (!voice && base === "kn") return false; // no Kannada voice installed
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  if (voice) u.voice = voice;
  u.rate = 0.95;
  synth.speak(u);
  return true;
}
