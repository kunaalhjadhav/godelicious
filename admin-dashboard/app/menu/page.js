"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Papa from "papaparse";
import Shell from "@/components/Shell";
import { api, API_URL } from "@/lib/api";
import { APP_NAME } from "@/lib/brand";
import { duplicateIds, matchesSearch, normalizeName } from "@/lib/menuTools";

const EMPTY_FORM = { name: "", description: "", price: "", categoryId: "", isVeg: true, stockQty: "", imageUrl: "", brandId: "", soldByWeight: false, plannerRole: "", servesPerUnit: "", minOrderGrams: "" };

export default function MenuPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const formRef = useRef(null);
  const [newCategory, setNewCategory] = useState("");
  const [uploading, setUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [fCategory, setFCategory] = useState("");
  const [fType, setFType] = useState("");   // veg | nonveg | weight | box
  const [fStatus, setFStatus] = useState(""); // available | hidden | low | out
  const [onlyDupes, setOnlyDupes] = useState(false);
  const [confirmDupe, setConfirmDupe] = useState(false);

  function handleBulkCsv(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkResult(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        setBulkUploading(true);
        setError("");
        try {
          const result = await api.bulkUploadMenu(results.data);
          setBulkResult(result);
          load();
        } catch (err) {
          setError(err.message);
        } finally {
          setBulkUploading(false);
          e.target.value = "";
        }
      },
      error: (err) => setError(`CSV parse error: ${err.message}`),
    });
  }

  function resolveImageUrl(url) {
    if (!url) return null;
    return url.startsWith("http") ? url : `${API_URL}${url}`;
  }

  async function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const { url } = await api.uploadImage(file);
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  function load() {
    api.listMenu().then((d) => setItems(d.items)).catch((e) => setError(e.message));
    api.listCategories().then((d) => setCategories(d.categories)).catch((e) => setError(e.message));
    api.listBrands().then((d) => setBrands(d.brands)).catch(() => {}); // non-critical if it fails
  }

  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const payload = {
        ...form, price: Number(form.price), stockQty: Number(form.stockQty || 0),
        plannerRole: form.plannerRole || null, minOrderGrams: form.minOrderGrams ? Number(form.minOrderGrams) : 250, servesPerUnit: form.servesPerUnit ? Number(form.servesPerUnit) : 1,
      };
      if (confirmDupe) payload.allowDuplicate = true;
      if (editingId) {
        await api.updateMenuItem(editingId, payload);
      } else {
        await api.createMenuItem(payload);
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      setConfirmDupe(false);
      load();
    } catch (err) {
      if (/already on the menu/i.test(err.message)) setConfirmDupe(true);
      setError(err.message);
    }
  }

  function edit(item) {
    setError("");
    setNotice("");
    setEditingId(item.id);
    setForm({
      name: item.name,
      description: item.description || "",
      price: item.price,
      categoryId: item.categoryId,
      isVeg: item.isVeg,
      brandId: item.brandId || "",
      stockQty: item.stockQty,
      imageUrl: item.imageUrl || "",
      soldByWeight: item.soldByWeight || false,
      plannerRole: item.plannerRole || "",
      servesPerUnit: item.servesPerUnit && item.servesPerUnit > 1 ? item.servesPerUnit : "",
      minOrderGrams: item.soldByWeight ? item.minOrderGrams || 250 : "",
    });
    // bring the form into view so it is obvious that editing has started
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  async function toggleAvailable(item) {
    setError("");
    try {
      await api.updateMenuItem(item.id, { isAvailable: !item.isAvailable });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(item) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    setError("");
    setNotice("");
    try {
      const r = await api.deleteMenuItem(item.id);
      if (editingId === item.id) { setEditingId(null); setForm(EMPTY_FORM); }
      setNotice(r.archived ? `"${item.name}" was removed from the shop. ${r.message}` : `"${item.name}" was deleted.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function addCategory(e) {
    e.preventDefault();
    if (!newCategory.trim()) return;
    setError("");
    try {
      await api.createCategory({ name: newCategory.trim() });
      setNewCategory("");
      setNotice(`Category "${newCategory.trim()}" added.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  const dupIds = duplicateIds(items);
  const typedKey = normalizeName(form.name);
  const liveDupes = typedKey
    ? items.filter((i) => i.id !== editingId && normalizeName(i.name) === typedKey && (!form.categoryId || i.categoryId === form.categoryId))
    : [];
  const shown = items.filter((i) => {
    if (!matchesSearch(i, search)) return false;
    if (fCategory && i.categoryId !== fCategory) return false;
    if (fType === "veg" && !i.isVeg) return false;
    if (fType === "nonveg" && i.isVeg) return false;
    if (fType === "weight" && !i.soldByWeight) return false;
    if (fType === "box" && !i.isMealBox) return false;
    if (fStatus === "available" && !i.isAvailable) return false;
    if (fStatus === "hidden" && i.isAvailable) return false;
    if (fStatus === "low" && !(i.stockQty > 0 && i.stockQty < 10)) return false;
    if (fStatus === "out" && i.stockQty > 0) return false;
    if (onlyDupes && !dupIds.has(i.id)) return false;
    return true;
  });
  const filtersOn = search || fCategory || fType || fStatus || onlyDupes;

  return (
    <Shell>
      <h1 className="font-display text-2xl text-ink mb-1">Menu</h1>
      <p className="text-sm text-ink/50 mb-6">Manage dishes, pricing, and availability</p>

      {error && <p className="text-chili text-sm mb-4">{error}</p>}
      {notice && <p className="text-basil text-sm mb-4">{notice}</p>}

      <div className="grid grid-cols-3 gap-6 items-start">
        <div className="col-span-2 card-surface">
          <div className="p-3 border-b border-line space-y-2">
            <input
              type="search" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, food code or category"
              className="w-full px-3 py-2 border border-line rounded-sm text-sm"
            />
            <div className="flex flex-wrap gap-2 items-center">
              <select value={fCategory} onChange={(e) => setFCategory(e.target.value)} className="px-2 py-1.5 border border-line rounded-sm text-xs">
                <option value="">All categories</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={fType} onChange={(e) => setFType(e.target.value)} className="px-2 py-1.5 border border-line rounded-sm text-xs">
                <option value="">All types</option>
                <option value="veg">Veg</option><option value="nonveg">Non-veg</option>
                <option value="weight">Sold per kg</option><option value="box">Meal boxes</option>
              </select>
              <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="px-2 py-1.5 border border-line rounded-sm text-xs">
                <option value="">Any status</option>
                <option value="available">Available</option><option value="hidden">Hidden</option>
                <option value="low">Low stock (under 10)</option><option value="out">Out of stock</option>
              </select>
              <label className="text-xs flex items-center gap-1">
                <input type="checkbox" checked={onlyDupes} onChange={(e) => setOnlyDupes(e.target.checked)} />
                Duplicates only{dupIds.size > 0 ? ` (${dupIds.size})` : ""}
              </label>
              {filtersOn && (
                <button onClick={() => { setSearch(""); setFCategory(""); setFType(""); setFStatus(""); setOnlyDupes(false); }} className="text-xs text-saffron2 hover:underline">
                  Clear
                </button>
              )}
              <span className="ml-auto text-xs text-ink/50">Showing {shown.length} of {items.length}</span>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="text-left text-xs font-mono uppercase text-ink/50 border-b border-line">
              <tr>
                <th className="px-3 py-3">#</th>
                <th className="px-3 py-3">Code</th>
                <th className="px-4 py-3"></th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Available</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shown.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-6 text-center text-ink/50">No items match. Change the search or filters.</td></tr>
              )}
              {shown.map((item, idx) => (
                <tr key={item.id}>
                  <td className="px-3 py-3 font-mono text-ink/50">{idx + 1}</td>
                  <td className="px-3 py-3 font-mono text-xs">{item.foodCode || "-"}</td>
                  <td className="px-4 py-3">
                    {item.imageUrl ? (
                      <img src={resolveImageUrl(item.imageUrl)} alt={item.name} className="w-10 h-10 object-cover rounded-sm" />
                    ) : (
                      <div className="w-10 h-10 bg-line rounded-sm" />
                    )}
                  </td>
                  <td className="px-4 py-3">                    {item.name}
                    {dupIds.has(item.id) && (
                      <button type="button" onClick={() => { setOnlyDupes(true); setSearch(item.name); }} title="Same name in the same category. Click to see them." className="ml-2 text-[10px] font-mono uppercase bg-chili/15 text-chili px-1.5 py-0.5 rounded-sm">
                        duplicate
                      </button>
                    )}
                    <span className={`ml-2 inline-block w-2 h-2 rounded-full ${item.isVeg ? "bg-basil" : "bg-chili"}`} />
                    {item.soldByWeight && (
                      <span className="ml-2 text-[10px] font-mono uppercase bg-basil/15 text-basil px-1.5 py-0.5 rounded-sm">
                        per kg
                      </span>
                    )}
                    {item.isMealBox && (
                      <span className="ml-2 text-[10px] font-mono uppercase bg-saffron/20 text-saffron2 px-1.5 py-0.5 rounded-sm">
                        meal box
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink/60">{item.category?.name}</td>
                  <td className="px-4 py-3 font-mono">₹{item.price}{item.soldByWeight ? "/kg" : ""}</td>
                  <td className="px-4 py-3 font-mono">{item.stockQty}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleAvailable(item)}
                      className={`text-xs px-2 py-1 rounded-sm ${
                        item.isAvailable ? "bg-basil/10 text-basil" : "bg-chili/10 text-chili"
                      }`}
                    >
                      {item.isAvailable ? "Available" : "Hidden"}
                    </button>
                  </td>
                  <td className="px-4 py-3 space-x-2">
                    {item.isMealBox ? (
                      <Link href="/meal-boxes" className="text-saffron2 text-xs hover:underline">Edit box</Link>
                    ) : (
                      <button onClick={() => edit(item)} className="text-saffron2 text-xs hover:underline">Edit</button>
                    )}
                    <button onClick={() => remove(item)} className="text-chili text-xs hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-6 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto pr-1">
          <form ref={formRef} onSubmit={handleSubmit} className={`card-surface p-5 ${editingId ? "ring-2 ring-saffron" : ""}`}>
            <h2 className="font-display text-lg mb-3">{editingId ? "Editing: " + (form.name || "item") : "New item"}</h2>
            <input
              placeholder="Name" required value={form.name}
              onChange={(e) => { setForm({ ...form, name: e.target.value }); setConfirmDupe(false); }}
              className="w-full mb-2 px-3 py-2 border border-line rounded-sm text-sm"
            />
            {liveDupes.length > 0 && (
              <div className="mb-2 text-xs bg-chili/10 border-l-2 border-chili px-2 py-1.5">
                Already on the menu: {liveDupes.map((d) => `${d.name} (${d.foodCode || "no code"}, ${d.category?.name || ""})`).join("; ")}.
                {confirmDupe ? " Press the button again to add it anyway." : " Check before adding another."}
              </div>
            )}
            <textarea
              placeholder="Description" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full mb-2 px-3 py-2 border border-line rounded-sm text-sm"
              rows={2}
            />

            <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Image</label>
            <div className="flex items-center gap-3 mb-3">
              {form.imageUrl ? (
                <img src={resolveImageUrl(form.imageUrl)} alt="" className="w-14 h-14 object-cover rounded-sm border border-line" />
              ) : (
                <div className="w-14 h-14 bg-line rounded-sm" />
              )}
              <div>
                <input type="file" accept="image/*" onChange={handleImageChange} disabled={uploading} className="text-xs" />
                {uploading && <p className="text-xs text-saffron2 mt-1">Uploading…</p>}
              </div>
            </div>
            <select
              required value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className="w-full mb-2 px-3 py-2 border border-line rounded-sm text-sm"
            >
              <option value="">Select category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select
              value={form.brandId}
              onChange={(e) => setForm({ ...form, brandId: e.target.value })}
              className="w-full mb-2 px-3 py-2 border border-line rounded-sm text-sm"
            >
              <option value="">House brand ({APP_NAME})</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
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
                type="checkbox" checked={form.isVeg}
                onChange={(e) => setForm({ ...form, isVeg: e.target.checked })}
              />
              Vegetarian
            </label>
            <label className="flex items-center gap-2 text-sm mb-1">
              <input
                type="checkbox" checked={form.soldByWeight}
                onChange={(e) => setForm({ ...form, soldByWeight: e.target.checked })}
              />
              Sold by weight (priced per kg)
            </label>
            {form.soldByWeight && (
              <div className="mb-3 ml-6">
                <p className="text-xs text-ink/40 mb-2">Price above is ₹ per kg. Customers order in grams.</p>
                <label className="block text-xs font-mono uppercase text-ink/60 mb-1">Minimum order (grams)</label>
                <input
                  type="number" min="100" step="50" value={form.minOrderGrams}
                  onChange={(e) => setForm({ ...form, minOrderGrams: e.target.value })}
                  placeholder="250"
                  className="w-full px-3 py-2 border border-line rounded-sm text-sm"
                />
              </div>
            )}
            <div className="mt-3 mb-3 border-t border-line pt-3">
              <label className="block text-xs font-mono uppercase text-ink/60 mb-1">Party planner role</label>
              <select
                value={form.plannerRole} onChange={(e) => setForm({ ...form, plannerRole: e.target.value })}
                className="w-full mb-2 px-3 py-2 border border-line rounded-sm text-sm"
              >
                <option value="">Not used in the planner</option>
                <option value="MAIN">Main meal box (also used for weekly plans)</option>
                <option value="SWEET">Sweet</option>
                <option value="DRINK">Drink</option>
              </select>
              <input
                type="number" min="1" value={form.servesPerUnit}
                onChange={(e) => setForm({ ...form, servesPerUnit: e.target.value })}
                placeholder={form.soldByWeight ? "Guests served per kg (e.g. 8)" : "Guests served per piece (default 1)"}
                className="w-full px-3 py-2 border border-line rounded-sm text-sm"
              />
              <p className="text-xs text-ink/40 mt-1">
                The app uses this for "feeds about N guests" and to suggest quantities in the party planner.
              </p>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary text-sm flex-1">
                {confirmDupe ? "Add anyway" : editingId ? "Save changes" : "Add item"}
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

          <form onSubmit={addCategory} className="card-surface p-5">
            <h2 className="font-display text-lg mb-3">New category</h2>
            <div className="flex gap-2">
              <input
                placeholder="Category name" value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="flex-1 px-3 py-2 border border-line rounded-sm text-sm"
              />
              <button type="submit" className="bg-saffron text-charcoal text-sm px-3 py-2 rounded-sm">Add</button>
            </div>
          </form>

          <div className="card-surface p-5">
            <h2 className="font-display text-lg mb-2">Bulk upload menu (CSV)</h2>
            <p className="text-xs text-ink/50 mb-3">
              Columns: <code className="font-mono">name, description, price, categoryName, stockQty, isVeg</code>.
              Unknown categories are created automatically.
            </p>
            <input type="file" accept=".csv" onChange={handleBulkCsv} disabled={bulkUploading} className="text-xs w-full" />
            {bulkUploading && <p className="text-xs text-saffron2 mt-2">Uploading…</p>}
            {bulkResult && (
              <p className="text-xs mt-2">
                <span className="text-basil">{bulkResult.created} created</span>
                {bulkResult.errors.length > 0 && (
                  <span className="text-chili"> · {bulkResult.errors.length} failed (row {bulkResult.errors[0].row}: {bulkResult.errors[0].error})</span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
