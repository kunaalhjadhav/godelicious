"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "godelicious_onboarding_seen";

const STEPS = [
  {
    title: "Browse the menu",
    body: "Explore dishes by category, or check out today's featured picks and combo meals.",
    emoji: "🍽️",
  },
  {
    title: "Add to your cart",
    body: "Tap Add on anything you like. Combo items let you customize your choices first.",
    emoji: "🛒",
  },
  {
    title: "Checkout your way",
    body: "Pick a delivery time, apply a coupon if you have one, and pay online or choose Cash on Delivery.",
    emoji: "💳",
  },
  {
    title: "Track your order",
    body: "Watch your order move from confirmed to out for delivery, right from the Orders tab.",
    emoji: "📦",
  },
];

export default function Onboarding() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  }

  function next() {
    if (step < STEPS.length - 1) setStep(step + 1);
    else dismiss();
  }

  if (!visible) return null;

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 bg-charcoal/70 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-sm max-w-sm w-full p-7 text-center">
        <div className="text-5xl mb-4">{current.emoji}</div>
        <h2 className="font-display text-xl text-ink mb-2">{current.title}</h2>
        <p className="text-sm text-ink/60 mb-6">{current.body}</p>

        <div className="flex justify-center gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === step ? "bg-saffron2" : "bg-line"}`} />
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={dismiss} className="flex-1 text-sm py-2 border border-line rounded-sm text-ink/60">
            Skip
          </button>
          <button onClick={next} className="flex-1 text-sm py-2 bg-charcoal text-paper rounded-sm font-medium">
            {step < STEPS.length - 1 ? "Next" : "Get started"}
          </button>
        </div>
      </div>
    </div>
  );
}
