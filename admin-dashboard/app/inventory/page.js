"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { duplicateIds, matchesSearch } from "@/lib/menuTools";

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [adjustments, setAdjustments] = useState({}); // { itemId: { qty, reason } }
  const [search, setSearch] = useState("");
  const [fCategory, setFCategory] = useState("");
  const [fStock, setFStock] = useState(""); // low | out | ok
  const [onlyDupes, setOnlyDupes] = useState(false);

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

  const dupIds = duplicateIds(items, (i) => i.category?.name);
  const categories = [...new Set(items.map((i) => i.category?.name).filter(Boolean))].sort();
  const shown = items.filter((i) => {
    if (!matchesSearch(i, search)) return false;
    if (fCategory && i.category?.name !== fCategory) return false;
    if (fStock === "out" && i.stockQty > 0) return false;
    if (fStock === "low" && !(i.stockQty > 0 && i.stockQty < 10)) return false;
    if (fStock === "ok" && i.stockQty < 10) return false;
    if (onlyDupes && !dupIds.has(i.id)) return false;
    return true;
  });
  const filtersOn = search || fCategory || fStock || onlyDupes;

  return (
    <Shell>
      <h1 className="font-display text-2xl text-ink mb-1">Inventory</h1>
      <p className="text-sm text-ink/50 mb-6">Adjust stock — positive to restock, negative for wastage</p>

      {error && <p className="text-chili text-sm mb-4">{error}</p>}

      <div className="bg-white border border-line rounded-sm">
        <div className="p-3 border-b border-line space-y-2">
          <input
            type="search" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, food code or category"
            className="w-full px-3 py-2 border border-line rounded-sm text-sm"
          />
          <div className="flex flex-wrap gap-2 items-center">
            <select value={fCategory} onChange={(e) => setFCategory(e.target.value)} className="px-2 py-1.5 border border-line rounded-sm text-xs">
              <option value="">All categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={fStock} onChange={(e) => setFStock(e.target.value)} className="px-2 py-1.5 border border-line rounded-sm text-xs">
              <option value="">Any stock level</option>
              <option value="out">Out of stock</option>
              <option value="low">Low (under 10)</option>
              <option value="ok">Healthy (10 or more)</option>
            </select>
            <label className="text-xs flex items-center gap-1">
              <input type="checkbox" checked={onlyDupes} onChange={(e) => setOnlyDupes(e.target.checked)} />
              Duplicates only{dupIds.size > 0 ? ` (${dupIds.size})` : ""}
            </label>
            {filtersOn && (
              <button onClick={() => { setSearch(""); setFCategory(""); setFStock(""); setOnlyDupes(false); }} className="text-xs text-saffron2 hover:underline">Clear</button>
            )}
            <span className="ml-auto text-xs text-ink/50">Showing {shown.length} of {items.length}</span>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="text-left text-xs font-mono uppercase text-ink/50 border-b border-line">
            <tr>
              <th className="px-3 py-3">#</th>
              <th className="px-3 py-3">Code</th>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Current stock</th>
              <th className="px-4 py-3">Adjust by</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {shown.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-ink/50">No items match. Change the search or filters.</td></tr>
            )}
            {shown.map((item, idx) => (
              <tr key={item.id}>
                <td className="px-3 py-3 font-mono text-ink/50">{idx + 1}</td>
                <td className="px-3 py-3 font-mono text-xs">{item.foodCode || "-"}</td>
                <td className="px-4 py-3">
                  {item.name}
                  {dupIds.has(item.id) && <span className="ml-2 text-[10px] font-mono uppercase bg-chili/15 text-chili px-1.5 py-0.5 rounded-sm">duplicate</span>}
                </td>
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
