"use client";

import { useEffect, useState } from "react";
import PartnerShell from "@/components/PartnerShell";
import { api } from "@/lib/api";

const REASONS = [
  { value: "restock", label: "Restock (add)", sign: 1 },
  { value: "wastage", label: "Wastage (remove)", sign: -1 },
  { value: "adjustment", label: "Correction (remove)", sign: -1 },
  { value: "adjustment", label: "Correction (add)", sign: 1 },
];

export default function PartnerInventoryPage() {
  const [items, setItems] = useState([]);
  const [logs, setLogs] = useState([]);
  const [amount, setAmount] = useState({});
  const [reasonIdx, setReasonIdx] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  function load() {
    api.myBrandInventory().then((d) => { setItems(d.items); setLogs(d.logs); }).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function apply(item) {
    const n = Number(amount[item.id]);
    if (!n || n <= 0) return setError("Enter a quantity greater than 0.");
    const r = REASONS[reasonIdx[item.id] || 0];
    setError(""); setBusy(item.id);
    try {
      await api.adjustMyBrandStock(item.id, n * r.sign, r.value);
      setAmount({ ...amount, [item.id]: "" });
      load();
    } catch (e) { setError(e.message); } finally { setBusy(""); }
  }

  async function toggle(item) {
    try { await api.updateMyBrandMenuItem(item.id, { isAvailable: !item.isAvailable }); load(); } catch (e) { setError(e.message); }
  }

  const low = items.filter((i) => i.stockQty <= i.lowStockAt);

  return (
    <PartnerShell>
      <h1 className="font-display text-2xl text-ink mb-1">Inventory</h1>
      <p className="text-sm text-ink/50 mb-6">
        Stock updates apply immediately — no approval needed. Weight items are counted in grams.
      </p>
      {error && <p className="text-chili text-sm mb-4">{error}</p>}

      {low.length > 0 && (
        <div className="bg-chili/10 border-l-2 border-chili px-4 py-3 mb-5 text-sm max-w-4xl">
          <strong>Running low:</strong> {low.map((i) => `${i.name} (${i.stockQty}${i.soldByWeight ? "g" : ""})`).join(", ")}
        </div>
      )}

      <div className="bg-white border border-line rounded-sm max-w-4xl overflow-x-auto mb-8">
        <table className="w-full text-sm">
          <thead className="text-left text-xs font-mono uppercase text-ink/50 border-b border-line">
            <tr><th className="px-4 py-3">Item</th><th className="px-4 py-3">In stock</th><th className="px-4 py-3">Update stock</th><th className="px-4 py-3">Selling</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((i) => (
              <tr key={i.id}>
                <td className="px-4 py-3">
                  {i.name}
                  {i.approvalStatus !== "APPROVED" && <span className="ml-2 text-[10px] bg-saffron/15 text-saffron2 px-1.5 py-0.5 rounded-sm">{i.approvalStatus === "PENDING" ? "awaiting approval" : "not approved"}</span>}
                </td>
                <td className={`px-4 py-3 font-mono ${i.stockQty <= i.lowStockAt ? "text-chili font-medium" : ""}`}>
                  {i.stockQty}{i.soldByWeight ? " g" : ""}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <input
                      type="number" min="1" placeholder="Qty" value={amount[i.id] || ""}
                      onChange={(e) => setAmount({ ...amount, [i.id]: e.target.value })}
                      className="w-20 px-2 py-1.5 border border-line rounded-sm"
                    />
                    <select value={reasonIdx[i.id] || 0} onChange={(e) => setReasonIdx({ ...reasonIdx, [i.id]: Number(e.target.value) })} className="px-2 py-1.5 border border-line rounded-sm bg-white">
                      {REASONS.map((r, idx) => <option key={idx} value={idx}>{r.label}</option>)}
                    </select>
                    <button disabled={busy === i.id} onClick={() => apply(i)} className="bg-charcoal text-paper px-3 rounded-sm disabled:opacity-50">Apply</button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggle(i)} className={`text-xs px-2 py-1 rounded-sm ${i.isAvailable ? "bg-basil/10 text-basil" : "bg-chili/10 text-chili"}`}>
                    {i.isAvailable ? "On sale" : "Paused"}
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-ink/40">No items yet — add some under My Menu.</td></tr>}
          </tbody>
        </table>
      </div>

      <h2 className="font-display text-lg mb-2">Recent stock movements</h2>
      <div className="bg-white border border-line rounded-sm max-w-4xl divide-y divide-line">
        {logs.map((l) => (
          <div key={l.id} className="px-4 py-2 text-sm flex gap-3">
            <span className="text-ink/40 w-40 shrink-0">{new Date(l.createdAt).toLocaleString("en-IN")}</span>
            <span className="flex-1">{l.menuItem.name}</span>
            <span className={`font-mono ${l.changeQty > 0 ? "text-basil" : "text-chili"}`}>{l.changeQty > 0 ? "+" : ""}{l.changeQty}</span>
            <span className="text-ink/50 w-28">{l.reason.replace(/_/g, " ")}</span>
          </div>
        ))}
        {logs.length === 0 && <div className="px-4 py-4 text-sm text-ink/40">No movements yet.</div>}
      </div>
    </PartnerShell>
  );
}
