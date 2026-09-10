"use client";

import { useEffect, useState } from "react";
import Papa from "papaparse";
import Shell from "@/components/Shell";
import { api, API_URL } from "@/lib/api";
import { APP_NAME } from "@/lib/brand";

const EMPTY_FORM = { name: "", description: "", price: "", categoryId: "", isVeg: true, stockQty: "", imageUrl: "", brandId: "", soldByWeight: false };

export default function MenuPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [uploading, setUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);

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
      const payload = { ...form, price: Number(form.price), stockQty: Number(form.stockQty || 0) };
      if (editingId) {
        await api.updateMenuItem(editingId, payload);
      } else {
        await api.createMenuItem(payload);
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
      brandId: item.brandId || "",
      stockQty: item.stockQty,
      imageUrl: item.imageUrl || "",
      soldByWeight: item.soldByWeight || false,
    });
  }

  async function toggleAvailable(item) {
    await api.updateMenuItem(item.id, { isAvailable: !item.isAvailable });
    load();
  }

  async function remove(item) {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    await api.deleteMenuItem(item.id);
    load();
  }

  async function addCategory(e) {
    e.preventDefault();
    if (!newCategory.trim()) return;
    await api.createCategory(newCategory.trim());
    setNewCategory("");
    load();
  }

  return (
    <Shell>
      <h1 className="font-display text-2xl text-ink mb-1">Menu</h1>
      <p className="text-sm text-ink/50 mb-6">Manage dishes, pricing, and availability</p>

      {error && <p className="text-chili text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 card-surface">
          <table className="w-full text-sm">
            <thead className="text-left text-xs font-mono uppercase text-ink/50 border-b border-line">
              <tr>
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
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    {item.imageUrl ? (
                      <img src={resolveImageUrl(item.imageUrl)} alt={item.name} className="w-10 h-10 object-cover rounded-sm" />
                    ) : (
                      <div className="w-10 h-10 bg-line rounded-sm" />
                    )}
                  </td>
                  <td className="px-4 py-3">                    {item.name}
                    <span className={`ml-2 inline-block w-2 h-2 rounded-full ${item.isVeg ? "bg-basil" : "bg-chili"}`} />
                    {item.soldByWeight && (
                      <span className="ml-2 text-[10px] font-mono uppercase bg-basil/15 text-basil px-1.5 py-0.5 rounded-sm">
                        per kg
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
                    <button onClick={() => edit(item)} className="text-saffron2 text-xs hover:underline">Edit</button>
                    <button onClick={() => remove(item)} className="text-chili text-xs hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="card-surface p-5">
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
              <p className="text-xs text-ink/40 mb-3 ml-6">
                Price above will be treated as ₹ per kg. Customers order in grams;
                a ₹1,000 minimum order value applies automatically.
              </p>
            )}
            <div className="mb-3" />
            <div className="flex gap-2">
              <button type="submit" className="btn-primary text-sm flex-1">
                {editingId ? "Save changes" : "Add item"}
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
