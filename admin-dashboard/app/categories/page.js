"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api, API_URL } from "@/lib/api";

function resolveUrl(url) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [editingImageUrl, setEditingImageUrl] = useState("");
  const [error, setError] = useState("");

  function load() {
    api.listCategories().then((d) => setCategories(d.categories)).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function handleUpload(e, isEditing) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { url } = await api.uploadImage(file);
      if (isEditing) setEditingImageUrl(url);
      else setImageUrl(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    try {
      await api.createCategory({ name, imageUrl });
      setName("");
      setImageUrl("");
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(cat) {
    setEditingId(cat.id);
    setEditingName(cat.name);
    setEditingImageUrl(cat.imageUrl || "");
  }

  async function saveEdit(id) {
    setError("");
    try {
      await api.updateCategory(id, { name: editingName, imageUrl: editingImageUrl });
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function move(cat, direction) {
    await api.updateCategory(cat.id, { sortOrder: (cat.sortOrder || 0) + direction });
    load();
  }

  async function remove(cat) {
    if (!confirm(`Delete "${cat.name}"? Menu items in this category will need to be reassigned.`)) return;
    try {
      await api.deleteCategory(cat.id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Shell>
      <h1 className="font-display text-2xl text-ink mb-1">Categories</h1>
      <p className="text-sm text-ink/50 mb-6">
        Menu categories shown to customers as image cards, e.g. Starters, Mains, Desserts
      </p>

      {error && <p className="text-chili text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-3">
          {categories.map((cat) => (
            <div key={cat.id} className="card-surface p-4 flex items-center gap-4">
              {editingId === cat.id ? (
                <>
                  {editingImageUrl ? (
                    <img src={resolveUrl(editingImageUrl)} alt="" className="w-14 h-14 object-cover rounded-sm" />
                  ) : (
                    <div className="w-14 h-14 bg-line rounded-sm" />
                  )}
                  <input type="file" accept="image/*" onChange={(e) => handleUpload(e, true)} disabled={uploading} className="text-xs w-28" />
                  <input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="field-input flex-1"
                    autoFocus
                  />
                  <button onClick={() => saveEdit(cat.id)} className="text-basil text-xs hover:underline">Save</button>
                  <button onClick={() => setEditingId(null)} className="text-ink/50 text-xs hover:underline">Cancel</button>
                </>
              ) : (
                <>
                  {cat.imageUrl ? (
                    <img src={resolveUrl(cat.imageUrl)} alt="" className="w-14 h-14 object-cover rounded-sm" />
                  ) : (
                    <div className="w-14 h-14 bg-line rounded-sm" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-display text-lg">{cat.name}</h3>
                    <p className="text-xs text-ink/40 font-mono">Sort order: {cat.sortOrder ?? 0}</p>
                  </div>
                  <button onClick={() => move(cat, -1)} className="text-xs px-1.5 border border-line rounded-sm">↑</button>
                  <button onClick={() => move(cat, 1)} className="text-xs px-1.5 border border-line rounded-sm">↓</button>
                  <button onClick={() => startEdit(cat)} className="text-saffron2 text-xs hover:underline">Edit</button>
                  <button onClick={() => remove(cat)} className="text-chili text-xs hover:underline">Delete</button>
                </>
              )}
            </div>
          ))}
          {categories.length === 0 && <p className="text-sm text-ink/40">No categories yet.</p>}
        </div>

        <form onSubmit={handleCreate} className="card-surface p-5 h-fit">
          <h2 className="font-display text-lg mb-3">New category</h2>
          <input
            placeholder="Name, e.g. Starters" required value={name}
            onChange={(e) => setName(e.target.value)}
            className="field-input mb-3"
          />
          <label className="field-label">Image</label>
          <div className="flex items-center gap-3 mb-4">
            {imageUrl ? (
              <img src={resolveUrl(imageUrl)} alt="" className="w-14 h-14 object-cover rounded-sm border border-line" />
            ) : (
              <div className="w-14 h-14 bg-line rounded-sm" />
            )}
            <div>
              <input type="file" accept="image/*" onChange={(e) => handleUpload(e, false)} disabled={uploading} className="text-xs" />
              {uploading && <p className="text-xs text-saffron2 mt-1">Uploading…</p>}
            </div>
          </div>
          <button type="submit" className="btn-primary text-sm w-full">Add category</button>
        </form>
      </div>
    </Shell>
  );
}
