"use client";

import { useEffect, useState } from "react";
import VenueShell from "@/components/VenueShell";
import { api, API_URL } from "@/lib/api";

const SUGGEST = {
  eventTypes: ["Wedding", "Reception", "Engagement", "Birthday", "Corporate event", "Baby shower", "Anniversary"],
  services: ["Decoration", "DJ / sound", "Photography", "Parking", "Rooms for guests", "Generator backup", "AC hall", "Stage & lighting"],
  foodOptions: ["Veg", "Non-veg", "Jain", "Outside caterer allowed", "In-house catering only"],
};

function TagEditor({ label, hint, values, onChange, suggestions }) {
  const [text, setText] = useState("");
  function add(v) {
    const t = v.trim();
    if (t && !values.includes(t)) onChange([...values, t]);
    setText("");
  }
  return (
    <div className="mb-5">
      <label className="block text-xs font-mono uppercase text-ink/60 mb-1">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {values.map((v) => (
          <span key={v} className="bg-saffron/15 text-ink text-xs px-2 py-1 rounded-sm">
            {v} <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} className="ml-1 text-chili">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={text} onChange={(e) => setText(e.target.value)} placeholder={hint}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(text); } }}
          className="flex-1 px-3 py-2 border border-line rounded-sm text-sm"
        />
        <button type="button" onClick={() => add(text)} className="px-3 border border-line rounded-sm text-sm">Add</button>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {suggestions.filter((s) => !values.includes(s)).map((s) => (
          <button type="button" key={s} onClick={() => add(s)} className="text-[11px] text-ink/50 border border-dashed border-line px-2 py-0.5 rounded-sm hover:border-saffron">+ {s}</button>
        ))}
      </div>
    </div>
  );
}

export default function VenueProfilePage() {
  const [v, setV] = useState(null);
  const [blockDate, setBlockDate] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function load() { api.myVenue().then((d) => setV(d.venue)).catch((e) => setError(e.message)); }
  useEffect(load, []);

  async function save(e) {
    e.preventDefault();
    setError(""); setSaved(false);
    try {
      await api.updateMyVenue({
        name: v.name, description: v.description, address: v.address, city: v.city, contactPhone: v.contactPhone,
        capacity: v.capacity, imageUrl: v.imageUrl, latitude: v.latitude, longitude: v.longitude, isActive: v.isActive,
        eventTypes: v.eventTypes, services: v.services, foodOptions: v.foodOptions,
      });
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch (err) { setError(err.message); }
  }

  async function upload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try { const { url } = await api.uploadImage(file); setV((x) => ({ ...x, imageUrl: url })); }
    catch (err) { setError(err.message); } finally { setUploading(false); }
  }

  async function addBlock() {
    if (!blockDate) return;
    try { await api.addVenueBlock(blockDate, "Unavailable"); setBlockDate(""); load(); } catch (err) { setError(err.message); }
  }

  if (!v) return <VenueShell><p className="text-sm text-ink/50">{error || "Loading…"}</p></VenueShell>;
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  const img = v.imageUrl ? (v.imageUrl.startsWith("http") ? v.imageUrl : `${API_URL}${v.imageUrl}`) : null;

  return (
    <VenueShell>
      <h1 className="font-display text-2xl text-ink mb-1">Venue Details</h1>
      <p className="text-sm text-ink/50 mb-6">What customers see: description, capacity, event types, food and other services.</p>
      {error && <p className="text-chili text-sm mb-4">{error}</p>}

      <form onSubmit={save} className="bg-white border border-line rounded-sm p-6 max-w-2xl mb-8">
        <label className="block text-xs font-mono uppercase text-ink/60 mb-1">Photo</label>
        <div className="flex items-center gap-3 mb-4">
          {img ? <img src={img} alt="" className="w-24 h-16 object-cover rounded-sm border border-line" /> : <div className="w-24 h-16 bg-line rounded-sm" />}
          <div><input type="file" accept="image/*" onChange={upload} className="text-xs" />{uploading && <p className="text-xs text-saffron2">Uploading…</p>}</div>
        </div>

        <label className="block text-xs font-mono uppercase text-ink/60 mb-1">Venue name</label>
        <input required value={v.name} onChange={set("name")} className="w-full mb-3 px-3 py-2 border border-line rounded-sm text-sm" />
        <label className="block text-xs font-mono uppercase text-ink/60 mb-1">Description</label>
        <textarea rows={3} value={v.description || ""} onChange={set("description")} className="w-full mb-3 px-3 py-2 border border-line rounded-sm text-sm" />
        <label className="block text-xs font-mono uppercase text-ink/60 mb-1">Address</label>
        <input required value={v.address} onChange={set("address")} className="w-full mb-3 px-3 py-2 border border-line rounded-sm text-sm" />
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div><label className="block text-xs font-mono uppercase text-ink/60 mb-1">City</label><input value={v.city || ""} onChange={set("city")} className="w-full px-3 py-2 border border-line rounded-sm text-sm" /></div>
          <div><label className="block text-xs font-mono uppercase text-ink/60 mb-1">Capacity</label><input type="number" min="1" value={v.capacity} onChange={set("capacity")} className="w-full px-3 py-2 border border-line rounded-sm text-sm" /></div>
          <div><label className="block text-xs font-mono uppercase text-ink/60 mb-1">Contact / WhatsApp</label><input value={v.contactPhone || ""} onChange={set("contactPhone")} className="w-full px-3 py-2 border border-line rounded-sm text-sm" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div><label className="block text-xs font-mono uppercase text-ink/60 mb-1">Latitude (optional)</label><input value={v.latitude ?? ""} onChange={set("latitude")} className="w-full px-3 py-2 border border-line rounded-sm text-sm" /></div>
          <div><label className="block text-xs font-mono uppercase text-ink/60 mb-1">Longitude (optional)</label><input value={v.longitude ?? ""} onChange={set("longitude")} className="w-full px-3 py-2 border border-line rounded-sm text-sm" /></div>
        </div>

        <TagEditor label="Types of events you host" hint="e.g. Wedding" values={v.eventTypes} suggestions={SUGGEST.eventTypes} onChange={(x) => setV({ ...v, eventTypes: x })} />
        <TagEditor label="Other services you offer" hint="e.g. Decoration" values={v.services} suggestions={SUGGEST.services} onChange={(x) => setV({ ...v, services: x })} />
        <TagEditor label="Food options" hint="e.g. Veg" values={v.foodOptions} suggestions={SUGGEST.foodOptions} onChange={(x) => setV({ ...v, foodOptions: x })} />

        <label className="flex items-center gap-2 text-sm mb-5">
          <input type="checkbox" checked={v.isActive} onChange={(e) => setV({ ...v, isActive: e.target.checked })} />
          Accepting new requests (turn off to pause your listing)
        </label>
        <button type="submit" className="bg-charcoal text-paper text-sm px-5 py-2 rounded-sm">Save details</button>
        {saved && <span className="ml-3 text-sm text-basil">✓ Saved</span>}
      </form>

      <h2 className="font-display text-lg mb-2">Blocked dates</h2>
      <div className="bg-white border border-line rounded-sm p-5 max-w-2xl">
        <div className="flex gap-2 mb-3">
          <input type="date" value={blockDate} onChange={(e) => setBlockDate(e.target.value)} className="px-3 py-2 border border-line rounded-sm text-sm" />
          <button onClick={addBlock} className="bg-charcoal text-paper text-sm px-4 rounded-sm">Block date</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {v.blocks.map((b) => (
            <span key={b.id} className="bg-line text-xs px-2 py-1 rounded-sm">
              {new Date(b.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })}
              <button onClick={async () => { await api.removeVenueBlock(b.id); load(); }} className="ml-2 text-chili">×</button>
            </span>
          ))}
          {v.blocks.length === 0 && <span className="text-sm text-ink/40">No blocked dates.</span>}
        </div>
      </div>
    </VenueShell>
  );
}
