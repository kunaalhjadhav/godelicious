"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

export default function AddonsPage() {
  const [addons, setAddons] = useState([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");

  function load() {
    api.listAllAddons().then((d) => setAddons(d.addons)).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await api.createAddon({ name, price: Number(price) });
      setName("");
      setPrice("");
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleActive(addon) {
    await api.updateAddon(addon.id, { isActive: !addon.isActive });
    load();
  }

  async function remove(addon) {
    if (!confirm(`Delete "${addon.name}"?`)) return;
    await api.deleteAddon(addon.id);
    load();
  }

  return (
    <Shell>
      <h1 className="font-display text-2xl text-ink mb-1">Add-ons</h1>
      <p className="text-sm text-ink/50 mb-6">
        Extras customers can attach to a booking, e.g. "Extra dessert table," "Live counter"
      </p>

      {error && <p className="text-chili text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 card-surface">
          <table className="w-full text-sm">
            <thead className="text-left text-xs font-mono uppercase text-ink/50 border-b border-line">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {addons.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3">{a.name}</td>
                  <td className="px-4 py-3 font-mono">₹{a.price}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(a)}
                      className={`text-xs px-2 py-1 rounded-sm ${a.isActive ? "bg-basil/10 text-basil" : "bg-chili/10 text-chili"}`}
                    >
                      {a.isActive ? "Active" : "Disabled"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => remove(a)} className="text-chili text-xs hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
              {addons.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-ink/40">No add-ons yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <form onSubmit={handleSubmit} className="card-surface p-5 h-fit">
          <h2 className="font-display text-lg mb-3">New add-on</h2>
          <input
            placeholder="Name" required value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mb-2 px-3 py-2 border border-line rounded-sm text-sm"
          />
          <input
            type="number" placeholder="Price (₹)" required value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full mb-4 px-3 py-2 border border-line rounded-sm text-sm"
          />
          <button type="submit" className="btn-primary text-sm w-full">
            Add
          </button>
        </form>
      </div>
    </Shell>
  );
}
