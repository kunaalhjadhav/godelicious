"use client";

import { useEffect, useState } from "react";
import PartnerShell from "@/components/PartnerShell";
import { api } from "@/lib/api";

export default function PartnerEarningsPage() {
  const [data, setData] = useState(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState("");

  function load() {
    api.myBrandEarnings(from, to).then(setData).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  function applyFilter(e) {
    e.preventDefault();
    load();
  }

  return (
    <PartnerShell>
      <h1 className="font-display text-2xl text-ink mb-1">Earnings</h1>
      <p className="text-sm text-ink/50 mb-6">Your sales, commission, and payout history</p>

      {error && <p className="text-chili text-sm mb-4">{error}</p>}

      <form onSubmit={applyFilter} className="flex items-end gap-3 mb-6">
        <div>
          <label className="block text-xs font-mono uppercase text-ink/50 mb-1">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-3 py-1.5 border border-line rounded-sm text-sm bg-white" />
        </div>
        <div>
          <label className="block text-xs font-mono uppercase text-ink/50 mb-1">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-3 py-1.5 border border-line rounded-sm text-sm bg-white" />
        </div>
        <button type="submit" className="px-4 py-1.5 border border-line rounded-sm text-sm bg-white">Filter</button>
      </form>

      {data && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white border border-line rounded-sm p-5">
              <div className="text-xs font-mono uppercase text-ink/50 mb-2">Total sales</div>
              <div className="font-display text-2xl text-ink">₹{data.summary.totalSales.toFixed(0)}</div>
            </div>
            <div className="bg-white border border-line rounded-sm p-5">
              <div className="text-xs font-mono uppercase text-ink/50 mb-2">Platform commission</div>
              <div className="font-display text-2xl text-chili">₹{data.summary.commissionAmount.toFixed(0)}</div>
            </div>
            <div className="bg-white border border-line rounded-sm p-5">
              <div className="text-xs font-mono uppercase text-ink/50 mb-2">Your payout</div>
              <div className="font-display text-2xl text-basil">₹{data.summary.payoutAmount.toFixed(0)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white border border-line rounded-sm">
              <h2 className="font-display text-lg p-4 pb-0">Sold items</h2>
              <table className="w-full text-sm mt-2">
                <thead className="text-left text-xs font-mono uppercase text-ink/50 border-b border-line">
                  <tr><th className="px-4 py-2">Item</th><th className="px-4 py-2">Qty</th><th className="px-4 py-2">Date</th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.orderItems.map((oi) => (
                    <tr key={oi.id}>
                      <td className="px-4 py-2">{oi.menuItem.name}</td>
                      <td className="px-4 py-2 font-mono">{oi.quantity}</td>
                      <td className="px-4 py-2 text-xs text-ink/50">{new Date(oi.order.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {data.orderItems.length === 0 && (
                    <tr><td colSpan={3} className="px-4 py-6 text-center text-ink/40">No sales in this period.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-white border border-line rounded-sm p-4">
              <h2 className="font-display text-lg mb-2">Settlement history</h2>
              {data.settlements.map((s) => (
                <div key={s.id} className="border-t border-line py-2 first:border-t-0">
                  <div className="flex justify-between text-xs text-ink/50">
                    <span>{new Date(s.periodStart).toLocaleDateString()} – {new Date(s.periodEnd).toLocaleDateString()}</span>
                    <span className={s.status === "PAID" ? "text-basil" : "text-saffron2"}>{s.status}</span>
                  </div>
                  <div className="text-sm font-mono">₹{s.payoutAmount.toFixed(0)} payout</div>
                </div>
              ))}
              {data.settlements.length === 0 && <p className="text-xs text-ink/40">No settlements recorded yet — an admin generates these periodically.</p>}
            </div>
          </div>
        </>
      )}
    </PartnerShell>
  );
}
