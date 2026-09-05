"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { APP_NAME } from "@/lib/brand";

const EMPTY = { name: "", contactEmail: "", contactPhone: "", commissionPercent: "15" };

export default function BrandsPage() {
  const [brands, setBrands] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");

  function load() {
    api.listBrands().then((d) => setBrands(d.brands)).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await api.createBrand({ ...form, commissionPercent: Number(form.commissionPercent) });
      setForm(EMPTY);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleActive(brand) {
    await api.updateBrand(brand.id, { isActive: !brand.isActive });
    load();
  }

  async function approve(brand) {
    await api.updateBrand(brand.id, { isApproved: true });
    load();
  }

  return (
    <Shell>
      <h1 className="font-display text-2xl text-ink mb-1">Brand Partners</h1>
      <p className="text-sm text-ink/50 mb-6">
        Other brands whose items are sold through {APP_NAME} — track their sales and settle payouts
      </p>

      {error && <p className="text-chili text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-3">
          {brands.map((b) => (
            <Link
              key={b.id} href={`/brands/${b.id}`}
              className="block bg-white border border-line rounded-sm p-4 hover:border-saffron2"
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg text-ink">{b.name}</h3>
                    {!b.isApproved && (
                      <span className="text-[10px] font-mono uppercase bg-saffron/20 text-saffron2 px-1.5 py-0.5 rounded-sm">
                        Pending approval
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink/50">
                    Commission {b.commissionPercent}% · {b.contactEmail || "no contact"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!b.isApproved && (
                    <button
                      onClick={(e) => { e.preventDefault(); approve(b); }}
                      className="text-xs px-2 py-1 rounded-sm bg-charcoal text-paper"
                    >
                      Approve
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.preventDefault(); toggleActive(b); }}
                    className={`text-xs px-2 py-1 rounded-sm ${b.isActive ? "bg-basil/10 text-basil" : "bg-chili/10 text-chili"}`}
                  >
                    {b.isActive ? "Active" : "Disabled"}
                  </button>
                </div>
              </div>
            </Link>
          ))}
          {brands.length === 0 && <p className="text-sm text-ink/40">No brand partners yet.</p>}
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-line rounded-sm p-5 h-fit">
          <h2 className="font-display text-lg mb-3">New brand partner</h2>
          <input
            placeholder="Brand name" required value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full mb-2 px-3 py-2 border border-line rounded-sm text-sm"
          />
          <input
            placeholder="Contact email" value={form.contactEmail}
            onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
            className="w-full mb-2 px-3 py-2 border border-line rounded-sm text-sm"
          />
          <input
            placeholder="Contact phone" value={form.contactPhone}
            onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
            className="w-full mb-2 px-3 py-2 border border-line rounded-sm text-sm"
          />
          <label className="block text-xs font-mono uppercase text-ink/60 mb-1">Commission %</label>
          <input
            type="number" value={form.commissionPercent}
            onChange={(e) => setForm({ ...form, commissionPercent: e.target.value })}
            className="w-full mb-4 px-3 py-2 border border-line rounded-sm text-sm"
          />
          <button type="submit" className="w-full bg-charcoal text-paper text-sm px-4 py-2 rounded-sm">
            Add brand partner
          </button>
        </form>
      </div>
    </Shell>
  );
}
