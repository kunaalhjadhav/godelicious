"use client";

import { useEffect, useState } from "react";
import PartnerShell from "@/components/PartnerShell";
import { api } from "@/lib/api";

export default function PartnerLocationsPage() {
  const [locations, setLocations] = useState([]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");

  function load() {
    api.myBrandLocations().then((d) => setLocations(d.locations)).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await api.createMyBrandLocation({ name, address });
      setName("");
      setAddress("");
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(location) {
    if (!confirm(`Delete "${location.name}"?`)) return;
    await api.deleteMyBrandLocation(location.id);
    load();
  }

  return (
    <PartnerShell>
      <h1 className="font-display text-2xl text-ink mb-1">Locations</h1>
      <p className="text-sm text-ink/50 mb-6">Outlets or kitchens you operate from</p>

      {error && <p className="text-chili text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-3">
          {locations.map((loc) => (
            <div key={loc.id} className="bg-white border border-line rounded-sm p-4 flex justify-between items-start">
              <div>
                <h3 className="font-display text-lg">{loc.name}</h3>
                <p className="text-sm text-ink/60">{loc.address}</p>
              </div>
              <button onClick={() => remove(loc)} className="text-chili text-xs hover:underline">Delete</button>
            </div>
          ))}
          {locations.length === 0 && <p className="text-sm text-ink/40">No locations added yet.</p>}
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-line rounded-sm p-5 h-fit">
          <h2 className="font-display text-lg mb-3">New location</h2>
          <input
            placeholder="Name, e.g. Koramangala outlet" required value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mb-2 px-3 py-2 border border-line rounded-sm text-sm"
          />
          <textarea
            placeholder="Full address" required value={address} rows={3}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full mb-4 px-3 py-2 border border-line rounded-sm text-sm"
          />
          <button type="submit" className="w-full bg-charcoal text-paper text-sm px-4 py-2 rounded-sm">
            Add location
          </button>
        </form>
      </div>
    </PartnerShell>
  );
}
