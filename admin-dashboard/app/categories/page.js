"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState("");

  function load() {
    api.listCategories().then((d) => setCategories(d.categories)).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    try {
      await api.createCategory(name);
      setName("");
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(cat) {
    setEditingId(cat.id);
    setEditingName(cat.name);
  }

  async function saveEdit(id) {
    setError("");
    try {
      await api.updateCategory(id, { name: editingName });
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
      <p className="text-sm text-ink/50 mb-6">Menu categories shown to customers, e.g. Starters, Mains, Desserts</p>

      {error && <p className="text-chili text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 card-surface">
          <table className="w-full text-sm">
            <thead className="text-left text-xs font-mono uppercase text-ink/50 border-b border-line">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Sort order</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {categories.map((cat) => (
                <tr key={cat.id}>
                  <td className="px-4 py-3">
                    {editingId === cat.id ? (
                      <input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="field-input"
                        autoFocus
                      />
                    ) : (
                      cat.name
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-ink/60">{cat.sortOrder ?? 0}</td>
                  <td className="px-4 py-3 space-x-2 whitespace-nowrap">
                    {editingId === cat.id ? (
                      <>
                        <button onClick={() => saveEdit(cat.id)} className="text-basil text-xs hover:underline">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-ink/50 text-xs hover:underline">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => move(cat, -1)} className="text-xs px-1.5 border border-line rounded-sm">↑</button>
                        <button onClick={() => move(cat, 1)} className="text-xs px-1.5 border border-line rounded-sm">↓</button>
                        <button onClick={() => startEdit(cat)} className="text-saffron2 text-xs hover:underline">Edit</button>
                        <button onClick={() => remove(cat)} className="text-chili text-xs hover:underline">Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-ink/40">No categories yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <form onSubmit={handleCreate} className="card-surface p-5 h-fit">
          <h2 className="font-display text-lg mb-3">New category</h2>
          <input
            placeholder="Name, e.g. Starters" required value={name}
            onChange={(e) => setName(e.target.value)}
            className="field-input mb-4"
          />
          <button type="submit" className="btn-primary text-sm w-full">Add category</button>
        </form>
      </div>
    </Shell>
  );
}
