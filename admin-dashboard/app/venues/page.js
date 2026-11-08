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

  const empty = { venueName: "", address: "", city: "Mysuru", capacity: "", name: "", email: "", phone: "", password: "" };
  const [form, setForm] = useState(empty);
  const [showAdd, setShowAdd] = useState(false);
  const [msg, setMsg] = useState(null);
  const [resetFor, setResetFor] = useState(null); // venue id
  const [newPass, setNewPass] = useState("");

  async function addVenue(e) {
    e.preventDefault(); setMsg(null);
    try {
      const r = await api.createVenueAdmin(form);
      setMsg({ ok: true, text: `Venue added and live. Owner login: ${r.email} with the password you set. Share the /venue/login link with them.` });
      setForm(empty); setShowAdd(false); load();
    } catch (err) { setMsg({ ok: false, text: err.message }); }
  }
  async function resetPassword(v) {
    setMsg(null);
    try {
      const r = await api.resetVenuePassword(v.id, newPass);
      setMsg({ ok: true, text: `Password reset for ${r.email}. Share the new password with the owner.` });
      setResetFor(null); setNewPass("");
    } catch (err) { setMsg({ ok: false, text: err.message }); }
  }

  async function update(id, payload) {
    setError("");
    try { await api.updateVenueAdmin(id, payload); load(); } catch (e) { setError(e.message); }
  }

  return (
    <Shell>
      <h1 className="font-display text-2xl text-ink mb-1">Venue Partners</h1>
      <p className="text-sm text-ink/50 mb-6">
        Venue owners register themselves at <span className="font-mono">/venue/register</span> and appear to customers only after
        you approve them. You can also add a venue for an owner here. Owners sign in at <span className="font-mono">/venue/login</span>.
      </p>
      {error && <p className="text-chili text-sm mb-4">{error}</p>}
      {msg && <p className={`text-sm mb-4 px-3 py-2 border-l-2 ${msg.ok ? "text-basil border-basil bg-basil/10" : "text-chili border-chili bg-chili/10"}`}>{msg.text}</p>}

      <button onClick={() => setShowAdd(!showAdd)} className="mb-4 bg-charcoal text-paper text-sm px-4 py-2 rounded-sm">
        {showAdd ? "Close" : "+ Add a venue and owner login"}
      </button>
      {showAdd && (
        <form onSubmit={addVenue} className="bg-white border border-line rounded-sm p-5 mb-6 grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl">
          <div className="md:col-span-2 text-xs font-mono uppercase text-ink/50">Venue</div>
          <input required placeholder="Venue name" value={form.venueName} onChange={(e) => setForm({ ...form, venueName: e.target.value })} className="px-3 py-2 border border-line rounded-sm text-sm" />
          <input placeholder="Capacity (guests)" type="number" min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className="px-3 py-2 border border-line rounded-sm text-sm" />
          <input required placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="px-3 py-2 border border-line rounded-sm text-sm" />
          <input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="px-3 py-2 border border-line rounded-sm text-sm" />
          <div className="md:col-span-2 text-xs font-mono uppercase text-ink/50 mt-2">Owner's portal login</div>
          <input required placeholder="Owner name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="px-3 py-2 border border-line rounded-sm text-sm" />
          <input placeholder="Owner phone (gets WhatsApp alerts)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="px-3 py-2 border border-line rounded-sm text-sm" />
          <input required type="email" placeholder="Login email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="px-3 py-2 border border-line rounded-sm text-sm" />
          <input required minLength={6} placeholder="Password (min 6 characters)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="px-3 py-2 border border-line rounded-sm text-sm" />
          <button type="submit" className="md:col-span-2 bg-basil text-white text-sm px-4 py-2 rounded-sm">Add venue (goes live straight away)</button>
          <p className="md:col-span-2 text-xs text-ink/40">The owner then signs in at /venue/login to add photos, event types, tariffs and manage requests.</p>
        </form>
      )}

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
                  {resetFor === v.id ? (
                    <span className="inline-flex gap-1 align-middle">
                      <input value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="New password" className="w-32 px-2 py-1 border border-line rounded-sm text-xs" />
                      <button onClick={() => resetPassword(v)} className="text-xs bg-charcoal text-paper px-2 py-1 rounded-sm">Save</button>
                      <button onClick={() => { setResetFor(null); setNewPass(""); }} className="text-xs text-ink/50">Cancel</button>
                    </span>
                  ) : (
                    <button onClick={() => { setResetFor(v.id); setNewPass(""); }} className="text-ink/60 text-xs hover:underline">Reset password</button>
                  )}
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
