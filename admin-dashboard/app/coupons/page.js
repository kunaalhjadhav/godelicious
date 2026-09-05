"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

const EMPTY = { code: "", discountType: "PERCENT", discountValue: "", minOrderAmount: "", maxUses: "", expiresAt: "" };

export default function CouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");

  function load() {
    api.listCoupons().then((d) => setCoupons(d.coupons)).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await api.createCoupon({
        ...form,
        discountValue: Number(form.discountValue),
        minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : 0,
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        expiresAt: form.expiresAt || null,
      });
      setForm(EMPTY);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleActive(coupon) {
    await api.updateCoupon(coupon.id, { isActive: !coupon.isActive });
    load();
  }

  async function remove(coupon) {
    if (!confirm(`Delete coupon "${coupon.code}"?`)) return;
    await api.deleteCoupon(coupon.id);
    load();
  }

  return (
    <Shell>
      <h1 className="font-display text-2xl text-ink mb-1">Coupons</h1>
      <p className="text-sm text-ink/50 mb-6">Discount codes customers can apply at checkout</p>

      {error && <p className="text-chili text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 card-surface">
          <table className="w-full text-sm">
            <thead className="text-left text-xs font-mono uppercase text-ink/50 border-b border-line">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Min order</th>
                <th className="px-4 py-3">Uses</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {coupons.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-mono font-medium">{c.code}</td>
                  <td className="px-4 py-3">
                    {c.discountType === "PERCENT" ? `${c.discountValue}%` : `₹${c.discountValue}`}
                  </td>
                  <td className="px-4 py-3">₹{c.minOrderAmount}</td>
                  <td className="px-4 py-3">{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ""}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(c)}
                      className={`text-xs px-2 py-1 rounded-sm ${c.isActive ? "bg-basil/10 text-basil" : "bg-chili/10 text-chili"}`}
                    >
                      {c.isActive ? "Active" : "Disabled"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => remove(c)} className="text-chili text-xs hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-ink/40">No coupons yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <form onSubmit={handleSubmit} className="card-surface p-5 h-fit">
          <h2 className="font-display text-lg mb-3">New coupon</h2>
          <input
            placeholder="CODE (e.g. WELCOME10)" required value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            className="w-full mb-2 px-3 py-2 border border-line rounded-sm text-sm font-mono"
          />
          <select
            value={form.discountType}
            onChange={(e) => setForm({ ...form, discountType: e.target.value })}
            className="w-full mb-2 px-3 py-2 border border-line rounded-sm text-sm"
          >
            <option value="PERCENT">Percent off</option>
            <option value="FLAT">Flat amount off (₹)</option>
          </select>
          <input
            type="number" placeholder={form.discountType === "PERCENT" ? "e.g. 10 (for 10%)" : "e.g. 100 (for ₹100)"}
            required value={form.discountValue}
            onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
            className="w-full mb-2 px-3 py-2 border border-line rounded-sm text-sm"
          />
          <input
            type="number" placeholder="Minimum order amount (₹, optional)" value={form.minOrderAmount}
            onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
            className="w-full mb-2 px-3 py-2 border border-line rounded-sm text-sm"
          />
          <input
            type="number" placeholder="Max total uses (blank = unlimited)" value={form.maxUses}
            onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
            className="w-full mb-2 px-3 py-2 border border-line rounded-sm text-sm"
          />
          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Expires (optional)</label>
          <input
            type="date" value={form.expiresAt}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            className="w-full mb-4 px-3 py-2 border border-line rounded-sm text-sm"
          />
          <button type="submit" className="btn-primary text-sm w-full">
            Create coupon
          </button>
        </form>
      </div>
    </Shell>
  );
}
