"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { useAuth } from "@/lib/useAuth";
import { api } from "@/lib/api";

const LABELS = ["Home", "Office", "Venue"];

export default function SavedAddressesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [addresses, setAddresses] = useState([]);
  const [label, setLabel] = useState("Home");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [loading, user, router]);
  const load = useCallback(() => api.myAddresses().then((d) => setAddresses(d.addresses || [])).catch((e) => setError(e.message)), []);
  useEffect(() => { if (user) load(); }, [user, load]);

  async function add(e) {
    e.preventDefault();
    setError("");
    if (address.trim().length < 6) return setError("Type the full address.");
    setSaving(true);
    try {
      await api.addAddress({ label, address: address.trim(), phone: phone.trim() || undefined });
      setAddress(""); setPhone("");
      await load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }

  async function remove(a) {
    if (!confirm(`Delete "${a.label}"?\n${a.address}`)) return;
    try { await api.deleteAddress(a.id); load(); } catch (err) { setError(err.message); }
  }

  if (loading || !user) return null;
  return (
    <div className="min-h-screen bg-paper pb-24 md:pb-10">
      <Nav />
      <div className="max-w-xl mx-auto px-4 py-6">
        <Link href="/profile" className="text-sm text-ink/50">‹ Profile</Link>
        <h1 className="font-display text-2xl text-ink mt-1 mb-4">Saved addresses</h1>
        {error && <p className="text-sm text-chili mb-3">{error}</p>}

        <div className="space-y-3">
          {addresses.map((a) => (
            <div key={a.id} className="bg-white border border-line rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <span className="font-bold text-ink">{a.label}</span>
                {a.isDefault && <span className="text-[10px] font-extrabold text-basil bg-basil/10 rounded px-1.5 py-0.5">DEFAULT</span>}
              </div>
              <p className="text-sm text-ink mt-1.5 leading-relaxed">{a.address}</p>
              {a.phone && <p className="text-sm text-ink/50">{a.phone}</p>}
              <div className="flex justify-between mt-3 text-sm">
                {!a.isDefault ? (
                  <button onClick={() => api.updateAddress(a.id, { isDefault: true }).then(load)} className="text-saffron2 font-bold">Make default</button>
                ) : <span />}
                <button onClick={() => remove(a)} className="text-chili font-semibold">Delete</button>
              </div>
            </div>
          ))}
          {addresses.length === 0 && <p className="text-center text-sm text-ink/40 py-6">No saved addresses yet. Add one below, or save one at checkout.</p>}

          <form onSubmit={add} className="bg-white border border-line rounded-2xl p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink/40 mb-2.5">Add an address</div>
            <div className="flex gap-2 mb-3">
              {LABELS.map((l) => (
                <button type="button" key={l} onClick={() => setLabel(l)}
                  className={`px-3.5 py-1.5 rounded-full text-sm border ${label === l ? "border-saffron2 bg-saffron/15 text-saffron2 font-bold" : "border-line text-ink"}`}>{l}</button>
              ))}
            </div>
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3}
              placeholder="House or flat no, street, area, city, pincode" className="w-full border border-line rounded-lg p-3 text-sm" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel"
              placeholder="Contact phone (optional)" className="w-full border border-line rounded-lg p-3 text-sm mt-2" />
            <button disabled={saving} className="w-full bg-charcoal text-paper rounded-xl py-3.5 font-bold mt-3 disabled:opacity-60">
              {saving ? "Saving…" : "Save address"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
