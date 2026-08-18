"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [adjustments, setAdjustments] = useState({}); // { itemId: { qty, reason } }

  function load() {
    api.listInventory().then((d) => setItems(d.items)).catch((e) => setError(e.message));
  }

  useEffect(load, []);

  function setAdj(id, field, value) {
    setAdjustments((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  async function apply(id) {
    const adj = adjustments[id];
    if (!adj?.qty) return;
    setError("");
    try {
      await api.adjustStock(id, Number(adj.qty), adj.reason || "adjustment");
      setAdjustments((prev) => ({ ...prev, [id]: { qty: "", reason: "" } }));
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <Shell>
      <h1 className="font-display text-2xl text-ink mb-1">Inventory</h1>
      <p className="text-sm text-ink/50 mb-6">Adjust stock — positive to restock, negative for wastage</p>

      {error && <p className="text-chili text-sm mb-4">{error}</p>}

      <div className="bg-white border border-line rounded-sm">
        <table className="w-full text-sm">
          <thead className="text-left text-xs font-mono uppercase text-ink/50 border-b border-line">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Current stock</th>
              <th className="px-4 py-3">Adjust by</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">{item.name}</td>
                <td className="px-4 py-3 text-ink/60">{item.category?.name}</td>
                <td className={`px-4 py-3 font-mono font-medium ${item.stockQty < 10 ? "text-chili" : "text-ink"}`}>
                  {item.stockQty}
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    placeholder="+/-"
                    value={adjustments[item.id]?.qty || ""}
                    onChange={(e) => setAdj(item.id, "qty", e.target.value)}
                    className="w-20 px-2 py-1 border border-line rounded-sm text-sm"
                  />
                </td>
                <td className="px-4 py-3">
                  <select
                    value={adjustments[item.id]?.reason || ""}
                    onChange={(e) => setAdj(item.id, "reason", e.target.value)}
                    className="px-2 py-1 border border-line rounded-sm text-sm"
                  >
                    <option value="">reason…</option>
                    <option value="restock">restock</option>
                    <option value="wastage">wastage</option>
                    <option value="adjustment">adjustment</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => apply(item.id)}
                    className="bg-charcoal text-paper text-xs px-3 py-1.5 rounded-sm"
                  >
                    Apply
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
