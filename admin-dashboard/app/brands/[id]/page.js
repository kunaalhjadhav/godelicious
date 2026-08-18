"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

export default function BrandDetailPage() {
  const { id } = useParams();
  const [sales, setSales] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [error, setError] = useState("");

  function load() {
    api.brandSales(id).then(setSales).catch((e) => setError(e.message));
    api.listSettlements(id).then((d) => setSettlements(d.settlements)).catch((e) => setError(e.message));
  }
  useEffect(load, [id]);

  async function generateSettlement(e) {
    e.preventDefault();
    setError("");
    try {
      await api.createSettlement(id, periodStart, periodEnd);
      setPeriodStart("");
      setPeriodEnd("");
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function markPaid(settlementId) {
    if (!confirm("Mark this settlement as paid out to the brand?")) return;
    await api.markSettlementPaid(settlementId);
    load();
  }

  if (!sales) return <Shell><p className="text-ink/40 text-sm">Loading…</p></Shell>;

  return (
    <Shell>
      <Link href="/brands" className="text-sm text-saffron2 hover:underline mb-4 inline-block">← All brand partners</Link>
      <h1 className="font-display text-2xl text-ink mb-1">{sales.brand.name}</h1>
      <p className="text-sm text-ink/50 mb-6">Commission {sales.brand.commissionPercent}%</p>

      {error && <p className="text-chili text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-line rounded-sm p-5">
          <div className="text-xs font-mono uppercase text-ink/50 mb-2">Total sales</div>
          <div className="font-display text-2xl text-ink">₹{sales.summary.totalSales.toFixed(0)}</div>
        </div>
        <div className="bg-white border border-line rounded-sm p-5">
          <div className="text-xs font-mono uppercase text-ink/50 mb-2">Commission owed to us</div>
          <div className="font-display text-2xl text-basil">₹{sales.summary.commissionAmount.toFixed(0)}</div>
        </div>
        <div className="bg-white border border-line rounded-sm p-5">
          <div className="text-xs font-mono uppercase text-ink/50 mb-2">Payout owed to brand</div>
          <div className="font-display text-2xl text-saffron2">₹{sales.summary.payoutAmount.toFixed(0)}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white border border-line rounded-sm">
          <h2 className="font-display text-lg p-4 pb-0">Order items</h2>
          <table className="w-full text-sm mt-2">
            <thead className="text-left text-xs font-mono uppercase text-ink/50 border-b border-line">
              <tr><th className="px-4 py-2">Item</th><th className="px-4 py-2">Qty</th><th className="px-4 py-2">Order</th><th className="px-4 py-2">Date</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sales.orderItems.map((oi) => (
                <tr key={oi.id}>
                  <td className="px-4 py-2">{oi.menuItem.name}</td>
                  <td className="px-4 py-2 font-mono">{oi.quantity}</td>
                  <td className="px-4 py-2 font-mono text-xs">{oi.order.id.slice(0, 8)}</td>
                  <td className="px-4 py-2 text-xs text-ink/50">{new Date(oi.order.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {sales.orderItems.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-ink/40">No sales yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-4">
          <form onSubmit={generateSettlement} className="bg-white border border-line rounded-sm p-5">
            <h2 className="font-display text-lg mb-3">Generate settlement</h2>
            <label className="block text-xs font-mono uppercase text-ink/60 mb-1">Period start</label>
            <input type="date" required value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="w-full mb-2 px-3 py-2 border border-line rounded-sm text-sm" />
            <label className="block text-xs font-mono uppercase text-ink/60 mb-1">Period end</label>
            <input type="date" required value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="w-full mb-3 px-3 py-2 border border-line rounded-sm text-sm" />
            <button type="submit" className="w-full bg-charcoal text-paper text-sm px-4 py-2 rounded-sm">Generate</button>
          </form>

          <div className="bg-white border border-line rounded-sm p-4">
            <h2 className="font-display text-lg mb-2">Settlement history</h2>
            {settlements.map((s) => (
              <div key={s.id} className="border-t border-line py-2 first:border-t-0">
                <div className="flex justify-between text-xs text-ink/50">
                  <span>{new Date(s.periodStart).toLocaleDateString()} – {new Date(s.periodEnd).toLocaleDateString()}</span>
                  <span className={s.status === "PAID" ? "text-basil" : "text-saffron2"}>{s.status}</span>
                </div>
                <div className="text-sm font-mono">₹{s.payoutAmount.toFixed(0)} payout</div>
                {s.status === "PENDING" && (
                  <button onClick={() => markPaid(s.id)} className="text-xs text-saffron2 hover:underline mt-1">
                    Mark as paid
                  </button>
                )}
              </div>
            ))}
            {settlements.length === 0 && <p className="text-xs text-ink/40">No settlements generated yet.</p>}
          </div>
        </div>
      </div>
    </Shell>
  );
}
