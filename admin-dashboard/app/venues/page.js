"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

export default function VenuePartnersPage() {
  const [venues, setVenues] = useState([]);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  function load() {
    api.listAllVenues().then((d) => { setVenues(d.venues); setLoaded(true); }).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function update(id, payload) {
    setError("");
    try { await api.updateVenueAdmin(id, payload); load(); } catch (e) { setError(e.message); }
  }

  return (
    <Shell>
      <h1 className="font-display text-2xl text-ink mb-1">Venue Partners</h1>
      <p className="text-sm text-ink/50 mb-6">
        Venue owners register themselves and appear to customers only after you approve them.
        Share <span className="font-mono">/venue/register</span> with owners to sign up.
      </p>
      {error && <p className="text-chili text-sm mb-4">{error}</p>}

      <div className="bg-white border border-line rounded-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs font-mono uppercase text-ink/50 border-b border-line">
            <tr>
              <th className="px-4 py-3">Venue</th><th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Capacity</th><th className="px-4 py-3">Tariffs</th>
              <th className="px-4 py-3">Requests</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {venues.map((v) => (
              <tr key={v.id}>
                <td className="px-4 py-3">
                  <div className="font-medium">{v.name}</div>
                  <div className="text-xs text-ink/50">{v.address}{v.city ? `, ${v.city}` : ""}</div>
                  <div className="text-xs text-ink/40">{v.eventTypes.join(", ")}</div>
                </td>
                <td className="px-4 py-3 text-xs">{v.owner?.name}<br />{v.owner?.email}<br />{v.owner?.phone}</td>
                <td className="px-4 py-3 font-mono">{v.capacity}</td>
                <td className="px-4 py-3 font-mono">{v._count?.tariffs}</td>
                <td className="px-4 py-3 font-mono">{v._count?.bookings}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-sm ${v.isApproved ? "bg-basil/10 text-basil" : "bg-saffron/15 text-saffron2"}`}>
                    {v.isApproved ? (v.isActive ? "Live" : "Hidden") : "Pending approval"}
                  </span>
                </td>
                <td className="px-4 py-3 space-x-3 whitespace-nowrap">
                  {!v.isApproved ? (
                    <button onClick={() => update(v.id, { isApproved: true })} className="text-basil text-xs hover:underline">Approve</button>
                  ) : (
                    <>
                      <button onClick={() => update(v.id, { isActive: !v.isActive })} className="text-saffron2 text-xs hover:underline">
                        {v.isActive ? "Hide" : "Show"}
                      </button>
                      <button onClick={() => update(v.id, { isApproved: false })} className="text-chili text-xs hover:underline">Revoke</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {loaded && venues.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-ink/40">No venue partners yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
