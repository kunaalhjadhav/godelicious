"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api, API_URL } from "@/lib/api";

const KIND = {
  NEW_ITEM: { label: "New item", cls: "bg-saffron/15 text-saffron2" },
  EDIT_ITEM: { label: "Edit to live item", cls: "bg-blue-100 text-blue-700" },
  REMOVE_ITEM: { label: "Removal request", cls: "bg-chili/10 text-chili" },
};
const FIELD_LABELS = {
  name: "Name", description: "Description", price: "Price", imageUrl: "Image", isVeg: "Vegetarian",
  categoryId: "Category", isCombo: "Combo", soldByWeight: "Sold by weight", minOrderGrams: "Min grams",
};

function img(url) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

function fmt(field, v) {
  if (field === "imageUrl") return v ? <img src={img(v)} alt="" className="w-10 h-10 object-cover rounded-sm inline-block" /> : "none";
  if (field === "price") return `₹${v}`;
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v ?? "—");
}

export default function ApprovalsPage() {
  const [rows, setRows] = useState([]);
  const [notes, setNotes] = useState({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  function load() {
    api.listApprovals().then((d) => { setRows(d.approvals); setLoaded(true); }).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function decide(id, action) {
    setError("");
    setBusy(id);
    try {
      await api.decideApproval(id, action, notes[id] || "");
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <Shell>
      <h1 className="font-display text-2xl text-ink mb-1">Item Approvals</h1>
      <p className="text-sm text-ink/50 mb-6">
        Brand partners send new items, edits and removals here. Nothing changes for customers until you approve.
      </p>
      {error && <p className="text-chili text-sm mb-4">{error}</p>}

      <div className="space-y-4 max-w-4xl">
        {rows.map((r) => (
          <div key={r.id} className="bg-white border border-line rounded-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className={`text-xs px-2 py-0.5 rounded-sm ${KIND[r.kind].cls}`}>{KIND[r.kind].label}</span>
              <span className="text-sm text-ink/60">{r.brand?.name}</span>
              <span className="text-xs text-ink/40 ml-auto">{new Date(r.requestedAt).toLocaleString()}</span>
            </div>

            <div className="flex gap-4">
              {r.item.imageUrl ? (
                <img src={img(r.item.imageUrl)} alt="" className="w-20 h-20 object-cover rounded-sm" />
              ) : <div className="w-20 h-20 bg-line rounded-sm" />}
              <div className="flex-1 text-sm">
                <div className="font-medium text-ink">
                  {r.item.name}
                  <span className={`ml-2 inline-block w-2 h-2 rounded-full ${r.item.isVeg ? "bg-basil" : "bg-chili"}`} />
                </div>
                <div className="text-ink/60">{r.item.category} · ₹{r.item.price}{r.item.soldByWeight ? " / kg" : ""} · stock {r.item.stockQty}</div>
                {r.item.description && <div className="text-ink/50 mt-1">{r.item.description}</div>}

                {r.changes && (
                  <table className="mt-3 text-xs border border-line">
                    <thead className="bg-paper text-ink/50 font-mono uppercase">
                      <tr><th className="px-3 py-1 text-left">Field</th><th className="px-3 py-1 text-left">Now</th><th className="px-3 py-1 text-left">Proposed</th></tr>
                    </thead>
                    <tbody>
                      {Object.entries(r.changes).map(([k, v]) => (
                        <tr key={k} className="border-t border-line">
                          <td className="px-3 py-1">{FIELD_LABELS[k] || k}</td>
                          <td className="px-3 py-1 text-ink/50">{k === "categoryId" ? "(current)" : fmt(k, r.item[k] ?? r.item[k === "categoryId" ? "category" : k])}</td>
                          <td className="px-3 py-1 text-basil font-medium">{k === "categoryId" ? "(new category)" : fmt(k, v)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {r.kind === "REMOVE_ITEM" && (
                  <p className="mt-2 text-chili text-xs">The partner wants this item taken off the menu. Items with past orders are archived rather than deleted.</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <input
                placeholder="Note to partner (optional)"
                value={notes[r.id] || ""}
                onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                className="flex-1 px-3 py-2 border border-line rounded-sm text-sm"
              />
              <button disabled={busy === r.id} onClick={() => decide(r.id, "approve")} className="bg-basil text-white text-sm px-4 py-2 rounded-sm disabled:opacity-50">Approve</button>
              <button disabled={busy === r.id} onClick={() => decide(r.id, "reject")} className="border border-chili text-chili text-sm px-4 py-2 rounded-sm disabled:opacity-50">Reject</button>
            </div>
          </div>
        ))}
        {loaded && rows.length === 0 && <p className="text-sm text-ink/40">Nothing waiting for approval. 🎉</p>}
      </div>
    </Shell>
  );
}
