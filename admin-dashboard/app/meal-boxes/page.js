"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Shell from "@/components/Shell";
import { api, API_URL } from "@/lib/api";

function resolveUrl(url) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

const EMPTY = { name: "", description: "", imageUrl: "", price: "", stockQty: "", isVeg: true, isAvailable: true, servesPerUnit: "" };

export default function MealBoxesPage() {
  const [boxes, setBoxes] = useState([]);
  const [dishes, setDishes] = useState([]);          // every normal menu item that can go in a box
  const [form, setForm] = useState(EMPTY);
  const [picked, setPicked] = useState([]);          // [{ menuItemId, note }] in the order shown to customers
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const formRef = useRef(null);

  function load() {
    api.listMealBoxes().then((d) => setBoxes(d.boxes)).catch((e) => setError(e.message));
    api.listMenu().then((d) => setDishes(d.items.filter((i) => !i.isMealBox))).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  const dishById = useMemo(() => Object.fromEntries(dishes.map((d) => [d.id, d])), [dishes]);
  const pickedIds = new Set(picked.map((p) => p.menuItemId));
  const shown = dishes.filter((d) => d.name.toLowerCase().includes(search.trim().toLowerCase()));

  async function handleImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError("");
    try {
      const { url } = await api.uploadImage(file);
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (err) { setError(err.message); } finally { setUploading(false); e.target.value = ""; }
  }

  function toggleDish(id) {
    setPicked((p) => (p.some((x) => x.menuItemId === id) ? p.filter((x) => x.menuItemId !== id) : [...p, { menuItemId: id, note: "" }]));
  }
  function setNote(id, note) { setPicked((p) => p.map((x) => (x.menuItemId === id ? { ...x, note } : x))); }
  function moveDish(i, dir) {
    setPicked((p) => {
      const next = [...p]; const j = i + dir;
      if (j < 0 || j >= next.length) return p;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function reset() { setForm(EMPTY); setPicked([]); setEditingId(null); setSearch(""); }

  function startEdit(box) {
    setError(""); setNotice("");
    setEditingId(box.id);
    setForm({
      name: box.name, description: box.description || "", imageUrl: box.imageUrl || "", price: box.price,
      stockQty: box.stockQty, isVeg: box.isVeg, isAvailable: box.isAvailable,
      servesPerUnit: box.servesPerUnit && box.servesPerUnit > 1 ? box.servesPerUnit : "",
    });
    setPicked((box.mealBoxItems || []).map((m) => ({ menuItemId: m.itemId, note: m.note || "" })));
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setNotice("");
    if (picked.length === 0) { setError("Pick at least one dish for the box from the list."); return; }
    setSaving(true);
    try {
      const payload = { ...form, price: Number(form.price), stockQty: Number(form.stockQty || 0), items: picked };
      if (editingId) await api.updateMealBox(editingId, payload);
      else await api.createMealBox(payload);
      setNotice(editingId ? "Meal box saved." : "Meal box created. Customers can see it now.");
      reset();
      load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }

  async function toggleAvailable(box) {
    setError("");
    try { await api.updateMealBox(box.id, { isAvailable: !box.isAvailable }); load(); } catch (err) { setError(err.message); }
  }

  async function remove(box) {
    if (!confirm(`Delete the meal box "${box.name}"?`)) return;
    setError(""); setNotice("");
    try {
      const r = await api.deleteMealBox(box.id);
      if (editingId === box.id) reset();
      setNotice(r.archived ? `"${box.name}" was removed from the shop. ${r.message}` : `"${box.name}" was deleted.`);
      load();
    } catch (err) { setError(err.message); }
  }

  return (
    <Shell>
      <h1 className="font-display text-2xl text-ink mb-1">Meal Boxes</h1>
      <p className="text-sm text-ink/50 mb-6">
        Build a meal box from your menu items. Customers see each dish with its picture and name on the box's page,
        and must order at least the minimum number of meals set in Settings (10 by default).
      </p>

      {error && <p className="text-chili text-sm mb-4">{error}</p>}
      {notice && <p className="text-basil text-sm mb-4">{notice}</p>}

      <div className="grid grid-cols-3 gap-6 items-start">
        <div className="col-span-2 space-y-3">
          {boxes.map((b) => (
            <div key={b.id} className={`card-surface p-4 ${editingId === b.id ? "ring-2 ring-saffron" : ""}`}>
              <div className="flex items-start gap-4">
                {b.imageUrl ? (
                  <img src={resolveUrl(b.imageUrl)} alt="" className="w-20 h-20 object-cover rounded-sm" />
                ) : (
                  <div className="w-20 h-20 bg-line rounded-sm" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium">
                    {b.name}
                    <span className={`ml-2 inline-block w-2 h-2 rounded-full ${b.isVeg ? "bg-basil" : "bg-chili"}`} />
                  </div>
                  <div className="text-xs text-ink/50 font-mono mt-0.5">
                    ₹{b.price} per box + GST · {b.mealBoxItems?.length || 0} dishes · stock {b.stockQty}
                  </div>
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {(b.mealBoxItems || []).map((m) => (
                      <span key={m.id} className="flex items-center gap-1 text-[11px] bg-paper border border-line rounded-full pl-0.5 pr-2 py-0.5">
                        {m.item?.imageUrl ? <img src={resolveUrl(m.item.imageUrl)} alt="" className="w-5 h-5 rounded-full object-cover" /> : <span className="w-5 h-5 rounded-full bg-line" />}
                        {m.item?.name}{m.note ? ` · ${m.note}` : ""}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <button
                    onClick={() => toggleAvailable(b)}
                    className={`text-xs px-2 py-1 rounded-sm ${b.isAvailable ? "bg-basil/10 text-basil" : "bg-chili/10 text-chili"}`}
                  >
                    {b.isAvailable ? "Available" : "Hidden"}
                  </button>
                  <div className="space-x-3">
                    <button onClick={() => startEdit(b)} className="text-saffron2 text-xs hover:underline">Edit</button>
                    <button onClick={() => remove(b)} className="text-chili text-xs hover:underline">Delete</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {boxes.length === 0 && (
            <p className="text-sm text-ink/40">No meal boxes yet. Create the first one with the form on the right.</p>
          )}
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className={`card-surface p-5 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto ${editingId ? "ring-2 ring-saffron" : ""}`}>
          <h2 className="font-display text-lg mb-3">{editingId ? `Editing: ${form.name || "meal box"}` : "New meal box"}</h2>

          <input
            placeholder="Meal box name (e.g. Veg Thali Box)" required value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full mb-2 px-3 py-2 border border-line rounded-sm text-sm"
          />
          <textarea
            placeholder="Description shown above the dishes" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full mb-2 px-3 py-2 border border-line rounded-sm text-sm" rows={3}
          />

          <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Box photo</label>
          <div className="flex items-center gap-3 mb-3">
            {form.imageUrl ? (
              <img src={resolveUrl(form.imageUrl)} alt="" className="w-14 h-14 object-cover rounded-sm border border-line" />
            ) : (
              <div className="w-14 h-14 bg-line rounded-sm" />
            )}
            <div>
              <input type="file" accept="image/*" onChange={handleImage} disabled={uploading} className="text-xs" />
              {uploading && <p className="text-xs text-saffron2 mt-1">Uploading…</p>}
            </div>
          </div>

          <div className="flex gap-2 mb-2">
            <input
              type="number" min="1" step="any" placeholder="Price per box (₹)" required value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-1/2 px-3 py-2 border border-line rounded-sm text-sm"
            />
            <input
              type="number" min="0" placeholder="Boxes in stock" value={form.stockQty}
              onChange={(e) => setForm({ ...form, stockQty: e.target.value })}
              className="w-1/2 px-3 py-2 border border-line rounded-sm text-sm"
            />
          </div>
          <p className="text-xs text-ink/40 mb-2">The price is before GST. GST is added at checkout.</p>
          <label className="flex items-center gap-2 text-sm mb-1">
            <input type="checkbox" checked={form.isVeg} onChange={(e) => setForm({ ...form, isVeg: e.target.checked })} />
            Vegetarian
          </label>
          <label className="flex items-center gap-2 text-sm mb-3">
            <input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })} />
            Available to customers
          </label>

          <div className="border-t border-line pt-3">
            <label className="block text-xs font-mono uppercase text-ink/60 mb-1">
              Dishes in this box ({picked.length} picked)
            </label>

            {picked.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {picked.map((p, i) => {
                  const d = dishById[p.menuItemId];
                  return (
                    <div key={p.menuItemId} className="flex items-center gap-2 bg-paper border border-line rounded-sm p-1.5">
                      {d?.imageUrl ? <img src={resolveUrl(d.imageUrl)} alt="" className="w-9 h-9 rounded-sm object-cover" /> : <div className="w-9 h-9 rounded-sm bg-line" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{d?.name || "(dish removed)"}</div>
                        <input
                          value={p.note} onChange={(e) => setNote(p.menuItemId, e.target.value)}
                          placeholder="Portion note, e.g. 2 pieces (optional)"
                          className="w-full text-[11px] px-1.5 py-0.5 border border-line rounded-sm bg-white"
                        />
                      </div>
                      <button type="button" onClick={() => moveDish(i, -1)} disabled={i === 0} className="text-xs px-1.5 border border-line rounded-sm disabled:opacity-30">↑</button>
                      <button type="button" onClick={() => moveDish(i, 1)} disabled={i === picked.length - 1} className="text-xs px-1.5 border border-line rounded-sm disabled:opacity-30">↓</button>
                      <button type="button" onClick={() => toggleDish(p.menuItemId)} className="text-chili text-xs px-1">✕</button>
                    </div>
                  );
                })}
              </div>
            )}

            <input
              placeholder="Search your menu to add dishes…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full mb-2 px-3 py-2 border border-line rounded-sm text-sm"
            />
            <div className="max-h-56 overflow-y-auto border border-line rounded-sm divide-y divide-line">
              {shown.map((d) => (
                <label key={d.id} className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-paper">
                  <input type="checkbox" checked={pickedIds.has(d.id)} onChange={() => toggleDish(d.id)} />
                  {d.imageUrl ? <img src={resolveUrl(d.imageUrl)} alt="" className="w-7 h-7 rounded-sm object-cover" /> : <span className="w-7 h-7 rounded-sm bg-line" />}
                  <span className="flex-1 truncate">{d.name}</span>
                  <span className={`w-2 h-2 rounded-full ${d.isVeg ? "bg-basil" : "bg-chili"}`} />
                </label>
              ))}
              {shown.length === 0 && <p className="text-xs text-ink/40 p-3">No dishes found. Add dishes under Menu first.</p>}
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button type="submit" disabled={saving || uploading} className="btn-primary text-sm flex-1">
              {saving ? "Saving…" : editingId ? "Save meal box" : "Create meal box"}
            </button>
            {editingId && (
              <button type="button" onClick={reset} className="text-sm px-4 py-2 border border-line rounded-sm">Cancel</button>
            )}
          </div>
        </form>
      </div>
    </Shell>
  );
}
