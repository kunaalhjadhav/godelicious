"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api, API_URL } from "@/lib/api";

const EMPTY = { name: "", description: "", imageUrl: "" };

export default function OrderTypesPage() {
  const [orderTypes, setOrderTypes] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function load() {
    api.listAllOrderTypes().then((d) => setOrderTypes(d.orderTypes)).catch((e) => setError(e.message));
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
    try {
      if (editingId) {
        await api.updateOrderType(editingId, { ...form, sortOrder: orderTypes.find((o) => o.id === editingId)?.sortOrder });
      } else {
        await api.createOrderType({ ...form, sortOrder: orderTypes.length });
      }
      setForm(EMPTY);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  function edit(ot) {
    setEditingId(ot.id);
    setForm({ name: ot.name, description: ot.description || "", imageUrl: ot.imageUrl || "" });
  }

  async function toggleActive(ot) {
    await api.updateOrderType(ot.id, { isActive: !ot.isActive });
    load();
  }

  async function remove(ot) {
    if (!confirm(`Delete "${ot.name}"? This cannot be undone.`)) return;
    await api.deleteOrderType(ot.id);
    load();
  }

  async function move(ot, direction) {
    await api.updateOrderType(ot.id, { sortOrder: ot.sortOrder + direction });
    load();
  }

  return (
    <Shell>
      <h1 className="font-display text-2xl text-ink mb-1">Order Types</h1>
      <p className="text-sm text-ink/50 mb-6">
        The three package cards shown at the top of the customer app and website home screen —
        e.g. Meal Box, Delivery Box, Catering Order
      </p>

      {error && <p className="text-chili text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-3">
          {orderTypes.map((ot) => (
            <div key={ot.id} className="bg-white border border-line rounded-sm p-4 flex items-center gap-4">
              {ot.imageUrl ? (
                <img src={resolveUrl(ot.imageUrl)} alt="" className="w-16 h-16 object-cover rounded-sm" />
              ) : (
                <div className="w-16 h-16 bg-line rounded-sm" />
              )}
              <div className="flex-1">
                <h3 className="font-display text-lg">{ot.name}</h3>
                <p className="text-xs text-ink/50 line-clamp-1">{ot.description}</p>
              </div>
              <button onClick={() => move(ot, -1)} className="text-xs px-2 py-1 border border-line rounded-sm">↑</button>
              <button onClick={() => move(ot, 1)} className="text-xs px-2 py-1 border border-line rounded-sm">↓</button>
              <button
                onClick={() => toggleActive(ot)}
                className={`text-xs px-2 py-1 rounded-sm ${ot.isActive ? "bg-basil/10 text-basil" : "bg-chili/10 text-chili"}`}
              >
                {ot.isActive ? "Live" : "Hidden"}
              </button>
              <button onClick={() => edit(ot)} className="text-saffron2 text-xs hover:underline">Edit</button>
              <button onClick={() => remove(ot)} className="text-chili text-xs hover:underline">Delete</button>
            </div>
          ))}
          {orderTypes.length === 0 && <p className="text-sm text-ink/40">No order types yet — add one to get started.</p>}
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-line rounded-sm p-5 h-fit">
          <h2 className="font-display text-lg mb-3">{editingId ? "Edit order type" : "New order type"}</h2>
          <input
            placeholder="Name, e.g. Meal Box" required value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full mb-2 px-3 py-2 border border-line rounded-sm text-sm"
          />
          <textarea
            placeholder="Description" value={form.description} rows={3}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full mb-3 px-3 py-2 border border-line rounded-sm text-sm"
          />

          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Image</label>
          <div className="flex items-center gap-3 mb-4">
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

          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-charcoal text-paper text-sm px-4 py-2 rounded-sm">
              {editingId ? "Save changes" : "Add order type"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => { setEditingId(null); setForm(EMPTY); }}
                className="text-sm px-4 py-2 border border-line rounded-sm"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </Shell>
  );
}
