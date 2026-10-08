"use client";

import { useEffect, useState } from "react";
import PartnerShell from "@/components/PartnerShell";
import { api, API_URL } from "@/lib/api";

const EMPTY_FORM = { name: "", description: "", price: "", categoryId: "", isVeg: true, stockQty: "", imageUrl: "", soldByWeight: false };

export default function PartnerMenuPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  function load() {
    api.myBrandMenu().then((d) => setItems(d.items)).catch((e) => setError(e.message));
    api.listCategories().then((d) => setCategories(d.categories)).catch(() => {});
  }
  useEffect(load, []);

  function resolveUrl(url) {
    if (!url) return null;
    return url.startsWith("http") ? url : `${API_URL}${url}`;
  }

  async function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { url } = await api.uploadImage(file);
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    try {
      const payload = { ...form, price: Number(form.price), stockQty: Number(form.stockQty || 0) };
      if (editingId) {
        const r = await api.updateMyBrandMenuItem(editingId, payload);
        setInfo(r.message || "Saved.");
      } else {
        await api.createMyBrandMenuItem(payload);
        setInfo("Item sent to admin for approval. It goes live for customers once approved.");
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  function edit(item) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      description: item.description || "",
      price: item.price,
      categoryId: item.categoryId,
      isVeg: item.isVeg,
      stockQty: item.stockQty,
      imageUrl: item.imageUrl || "",
      soldByWeight: item.soldByWeight,
    });
  }

  async function toggleAvailable(item) {
    await api.updateMyBrandMenuItem(item.id, { isAvailable: !item.isAvailable });
    load();
  }

  async function remove(item) {
    const live = item.approvalStatus === "APPROVED";
    const msg = live
      ? `Ask admin to remove "${item.name}"? It stays on sale until admin approves.`
      : `Delete "${item.name}"?`;
    if (!confirm(msg)) return;
    setError(""); setInfo("");
    try {
      const r = await api.deleteMyBrandMenuItem(item.id);
      if (r.message) setInfo(r.message);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function cancelRequest(item) {
    setError(""); setInfo("");
    try { await api.cancelMyBrandRequest(item.id); load(); } catch (err) { setError(err.message); }
  }

  function statusBadge(item) {
    if (item.deleteRequested) return <span className="text-[10px] bg-chili/10 text-chili px-1.5 py-0.5 rounded-sm">removal requested</span>;
    if (item.pendingChanges) return <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-sm">edit awaiting approval</span>;
    if (item.approvalStatus === "PENDING") return <span className="text-[10px] bg-saffron/15 text-saffron2 px-1.5 py-0.5 rounded-sm">awaiting approval</span>;
    if (item.approvalStatus === "REJECTED") return <span className="text-[10px] bg-chili/10 text-chili px-1.5 py-0.5 rounded-sm">not approved</span>;
    return <span className="text-[10px] bg-basil/10 text-basil px-1.5 py-0.5 rounded-sm">live</span>;
  }

  return (
    <PartnerShell>
      <h1 className="font-display text-2xl text-ink mb-1">My Menu</h1>
      <p className="text-sm text-ink/50 mb-6">New items, price/photo/name edits and removals are reviewed by admin before customers see them. Stock and availability change instantly.</p>

      {error && <p className="text-chili text-sm mb-4">{error}</p>}
      {info && <p className="text-basil text-sm mb-4">{info}</p>}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white border border-line rounded-sm">
          <table className="w-full text-sm">
            <thead className="text-left text-xs font-mono uppercase text-ink/50 border-b border-line">
              <tr>
                <th className="px-4 py-3"></th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Available</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    {item.imageUrl ? (
                      <img src={resolveUrl(item.imageUrl)} alt={item.name} className="w-10 h-10 object-cover rounded-sm" />
                    ) : (
                      <div className="w-10 h-10 bg-line rounded-sm" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {item.name}
                    <span className={`ml-2 inline-block w-2 h-2 rounded-full ${item.isVeg ? "bg-basil" : "bg-chili"}`} />
                    <div className="mt-1">{statusBadge(item)}</div>
                    {item.approvalStatus === "REJECTED" && item.approvalNote && <div className="text-xs text-chili mt-1">{item.approvalNote}</div>}
                  </td>
                  <td className="px-4 py-3 font-mono">₹{item.price}{item.soldByWeight ? "/kg" : ""}</td>
                  <td className="px-4 py-3 font-mono">{item.stockQty}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleAvailable(item)}
                      className={`text-xs px-2 py-1 rounded-sm ${item.isAvailable ? "bg-basil/10 text-basil" : "bg-chili/10 text-chili"}`}
                    >
                      {item.isAvailable ? "Available" : "Hidden"}
                    </button>
                  </td>
                  <td className="px-4 py-3 space-x-2">
                    <button onClick={() => edit(item)} className="text-saffron2 text-xs hover:underline">Edit</button>
                    {(item.pendingChanges || item.deleteRequested) && (
                      <button onClick={() => cancelRequest(item)} className="text-ink/60 text-xs hover:underline">Withdraw request</button>
                    )}
                    <button onClick={() => remove(item)} className="text-chili text-xs hover:underline">
                      {item.approvalStatus === "APPROVED" ? "Request removal" : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-ink/40">No menu items yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-line rounded-sm p-5 h-fit">
          <h2 className="font-display text-lg mb-3">{editingId ? "Edit item" : "New item"}</h2>
          <input
            placeholder="Name" required value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full mb-2 px-3 py-2 border border-line rounded-sm text-sm"
          />
          <textarea
            placeholder="Description" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full mb-2 px-3 py-2 border border-line rounded-sm text-sm"
            rows={2}
          />
          <select
            required value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            className="w-full mb-2 px-3 py-2 border border-line rounded-sm text-sm"
          >
            <option value="">Select category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Image</label>
          <div className="flex items-center gap-3 mb-3">
            {form.imageUrl ? (
              <img src={resolveUrl(form.imageUrl)} alt="" className="w-14 h-14 object-cover rounded-sm border border-line" />
            ) : (
              <div className="w-14 h-14 bg-line rounded-sm" />
            )}
            <div>
              <input type="file" accept="image/*" onChange={handleImageChange} disabled={uploading} className="text-xs" />
              {uploading && <p className="text-xs text-saffron2 mt-1">Uploading…</p>}
            </div>
          </div>

          <div className="flex gap-2 mb-2">
            <input
              type="number" placeholder="Price" required value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-1/2 px-3 py-2 border border-line rounded-sm text-sm"
            />
            <input
              type="number" placeholder="Stock qty" value={form.stockQty}
              onChange={(e) => setForm({ ...form, stockQty: e.target.value })}
              className="w-1/2 px-3 py-2 border border-line rounded-sm text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm mb-2">
            <input
              type="checkbox" checked={form.soldByWeight}
              onChange={(e) => setForm({ ...form, soldByWeight: e.target.checked })}
            />
            Sold by weight (price is per kg; stock in grams)
          </label>
          <label className="flex items-center gap-2 text-sm mb-4">
            <input
              type="checkbox" checked={form.isVeg}
              onChange={(e) => setForm({ ...form, isVeg: e.target.checked })}
            />
            Vegetarian
          </label>
          <div className="flex gap-2">
            <button type="submit" className="bg-charcoal text-paper text-sm px-4 py-2 rounded-sm flex-1">
              {editingId ? "Save / send for approval" : "Submit for approval"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => { setEditingId(null); setForm(EMPTY_FORM); }}
                className="text-sm px-4 py-2 border border-line rounded-sm"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </PartnerShell>
  );
}
