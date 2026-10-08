"use client";

import { useEffect, useState } from "react";
import VenueShell from "@/components/VenueShell";
import { api } from "@/lib/api";

const KINDS = [
  { value: "HALL", label: "Venue / hall rent" },
  { value: "FOOD", label: "Food (catering)" },
  { value: "SERVICE", label: "Other service" },
];
const UNITS = [
  { value: "EVENT", label: "per event" },
  { value: "DAY", label: "per day" },
  { value: "HOUR", label: "per hour" },
  { value: "PLATE", label: "per plate" },
];
const EMPTY = { eventType: "Any", label: "", kind: "HALL", unit: "EVENT", price: "" };

export default function VenueTariffsPage() {
  const [venue, setVenue] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  function load() { api.myVenue().then((d) => setVenue(d.venue)).catch((e) => setError(e.message)); }
  useEffect(load, []);

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      if (editingId) await api.updateVenueTariff(editingId, form);
      else await api.addVenueTariff(form);
      setForm(EMPTY); setEditingId(null); load();
    } catch (err) { setError(err.message); }
  }

  function edit(t) {
    setEditingId(t.id);
    setForm({ eventType: t.eventType, label: t.label, kind: t.kind, unit: t.unit, price: t.price });
  }

  async function remove(t) {
    if (!confirm(`Delete "${t.label}"?`)) return;
    try { await api.deleteVenueTariff(t.id); load(); } catch (err) { setError(err.message); }
  }

  async function toggle(t) {
    try { await api.updateVenueTariff(t.id, { isActive: !t.isActive }); load(); } catch (err) { setError(err.message); }
  }

  const types = ["Any", ...(venue?.eventTypes || [])];
  const grouped = {};
  (venue?.tariffs || []).forEach((t) => { (grouped[t.eventType] ||= []).push(t); });

  return (
    <VenueShell>
      <h1 className="font-display text-2xl text-ink mb-1">Tariffs</h1>
      <p className="text-sm text-ink/50 mb-6">
        Set your prices per type of event: hall rent, food per plate, and other services (decoration, DJ, parking…).
        Customers see these and you can use them to quote. Add event types under Venue Details first.
      </p>
      {error && <p className="text-chili text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-5">
          {Object.entries(grouped).map(([type, list]) => (
            <div key={type} className="bg-white border border-line rounded-sm">
              <div className="px-4 py-2 border-b border-line font-display">{type === "Any" ? "All event types" : type}</div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-line">
                  {list.map((t) => (
                    <tr key={t.id} className={t.isActive ? "" : "opacity-50"}>
                      <td className="px-4 py-2.5">
                        {t.label}
                        <span className="ml-2 text-[10px] uppercase font-mono text-ink/40">{KINDS.find((k) => k.value === t.kind)?.label}</span>
                      </td>
                      <td className="px-4 py-2.5 font-mono whitespace-nowrap">₹{t.price.toLocaleString("en-IN")} <span className="text-ink/40">{UNITS.find((u) => u.value === t.unit)?.label}</span></td>
                      <td className="px-4 py-2.5 text-right space-x-2 whitespace-nowrap">
                        <button onClick={() => toggle(t)} className="text-xs text-ink/50 hover:underline">{t.isActive ? "Hide" : "Show"}</button>
                        <button onClick={() => edit(t)} className="text-xs text-saffron2 hover:underline">Edit</button>
                        <button onClick={() => remove(t)} className="text-xs text-chili hover:underline">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {venue && venue.tariffs.length === 0 && <p className="text-sm text-ink/40">No tariffs yet — add your first one.</p>}
        </div>

        <form onSubmit={submit} className="bg-white border border-line rounded-sm p-5 h-fit">
          <h2 className="font-display text-lg mb-3">{editingId ? "Edit tariff" : "Add tariff"}</h2>
          <label className="block text-xs font-mono uppercase text-ink/50 mb-1">Event type</label>
          <select value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })} className="w-full mb-3 px-3 py-2 border border-line rounded-sm text-sm bg-white">
            {types.map((t) => <option key={t} value={t}>{t === "Any" ? "Any event" : t}</option>)}
          </select>
          <label className="block text-xs font-mono uppercase text-ink/50 mb-1">What is it?</label>
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="w-full mb-3 px-3 py-2 border border-line rounded-sm text-sm bg-white">
            {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
          <input
            required placeholder="e.g. Hall rent - full day, Veg buffet, DJ" value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            className="w-full mb-3 px-3 py-2 border border-line rounded-sm text-sm"
          />
          <div className="flex gap-2 mb-4">
            <input
              required type="number" min="0" placeholder="Price ₹" value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-1/2 px-3 py-2 border border-line rounded-sm text-sm"
            />
            <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-1/2 px-3 py-2 border border-line rounded-sm text-sm bg-white">
              {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-charcoal text-paper text-sm px-4 py-2 rounded-sm flex-1">{editingId ? "Save" : "Add"}</button>
            {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY); }} className="text-sm px-4 py-2 border border-line rounded-sm">Cancel</button>}
          </div>
        </form>
      </div>
    </VenueShell>
  );
}
