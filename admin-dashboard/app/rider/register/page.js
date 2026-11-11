"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { APP_NAME } from "@/lib/brand";

const VEHICLES = ["Bike", "Scooter", "E-bike", "Bicycle", "Auto", "Car / Van"];

export default function RiderRegisterPage() {
  const { registerRider } = useAuth();
  const [f, setF] = useState({ name: "", phone: "", email: "", password: "", vehicleType: "Bike", vehicleNumber: "" });
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!agree) return setError("Please accept the terms to continue.");
    setBusy(true);
    try { await registerRider(f); } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  const input = "w-full mb-4 px-3 py-3 border border-line bg-white rounded-lg text-base";
  const label = "block text-xs font-mono uppercase text-ink/60 mb-1";
  return (
    <div className="min-h-screen bg-charcoal px-4 py-10">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-6">
          <img src="/logo.png?v=3" alt={APP_NAME} className="w-16 h-16 rounded-2xl mx-auto mb-3 ring-1 ring-white/20" />
          <div className="font-display text-2xl text-paper">Deliver with {APP_NAME}</div>
          <p className="text-sm text-white/60 mt-1">Earn on every delivery in Mysuru. Choose when you work.</p>
        </div>
        <form onSubmit={submit} className="bg-paper rounded-xl p-6 shadow-xl">
          {error && <div className="mb-4 text-sm text-chili bg-chili/10 border-l-2 border-chili px-3 py-2">{error}</div>}
          <label className={label}>Full name (as on licence)</label>
          <input required value={f.name} onChange={set("name")} className={input} />
          <label className={label}>Mobile number (WhatsApp)</label>
          <input required inputMode="numeric" maxLength={10} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value.replace(/\D/g, "") })} className={input} />
          <label className={label}>Email</label>
          <input required type="email" value={f.email} onChange={set("email")} className={input} />
          <label className={label}>Password (6+ characters)</label>
          <input required type="password" minLength={6} value={f.password} onChange={set("password")} className={input} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Vehicle</label>
              <select value={f.vehicleType} onChange={set("vehicleType")} className={input}>
                {VEHICLES.map((v) => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Vehicle number</label>
              <input value={f.vehicleNumber} onChange={(e) => setF({ ...f, vehicleNumber: e.target.value.toUpperCase() })} placeholder="KA09 AB 1234" className={input} />
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm text-ink/70 mb-5">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1" />
            <span>I hold a valid driving licence, will share my live location while on duty, and will hand food over only after the customer gives the delivery code.</span>
          </label>
          <button disabled={busy} className="w-full bg-basil text-white py-3 rounded-lg font-semibold disabled:opacity-50">
            {busy ? "Creating account…" : "Create account"}
          </button>
          <p className="text-xs text-ink/50 mt-3 text-center">Next you'll upload your photo, licence, RC and ID. We approve within a day.</p>
          <p className="text-sm text-ink/60 mt-4 text-center">Already registered? <Link href="/rider/login" className="text-saffron2 font-medium">Sign in</Link></p>
        </form>
      </div>
    </div>
  );
}
