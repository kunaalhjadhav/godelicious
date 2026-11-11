"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { api, API_URL } from "@/lib/api";

const fileUrl = (u) => (!u ? "" : u.startsWith("/") ? `${API_URL}${u}` : u);
const DOCS = [["photoUrl", "Photo"], ["licenceUrl", "Licence"], ["rcUrl", "RC"], ["idProofUrl", "ID proof"]];
const TABS = [["PENDING", "Waiting for approval"], ["APPROVED", "Approved"], ["SUSPENDED", "Suspended"]];
const ago = (d) => {
  if (!d) return "never";
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};

export default function DeliveryPartnersPage() {
  const [partners, setPartners] = useState([]);
  const [tab, setTab] = useState("APPROVED");
  const [open, setOpen] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", vehicleType: "Bike", vehicleNumber: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  function load() {
    api.listAllDeliveryPartners().then((d) => {
      setPartners(d.partners);
      if (d.partners.some((p) => p.status === "PENDING")) setTab((t) => t);
    }).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function act(fn, done) {
    setError(""); setNote("");
    try { await fn(); if (done) setNote(done); load(); } catch (err) { setError(err.message); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    await act(() => api.createDeliveryPartner(form), `${form.name} added and approved.`);
    setForm({ name: "", phone: "", vehicleType: "Bike", vehicleNumber: "", email: "", password: "" });
  }

  function setLogin(p) {
    const password = prompt(p.loginEmail ? `New password for ${p.loginEmail} (6+ characters)` : "Password for the rider app (6+ characters)");
    if (!password) return;
    const email = p.loginEmail ? undefined : prompt("Email for the rider to sign in with");
    if (!p.loginEmail && !email) return;
    act(() => api.updateDeliveryPartner(p.id, { password, email }), p.loginEmail ? "Password changed." : `Login created. The rider signs in at ${location.origin}/rider`);
  }

  const counts = Object.fromEntries(TABS.map(([k]) => [k, partners.filter((p) => p.status === k).length]));
  const list = partners.filter((p) => p.status === tab);
  const input = "w-full mb-3 px-3 py-2 border border-line rounded-sm text-sm";

  return (
    <Shell>
      <div className="flex items-start justify-between mb-1">
        <h1 className="font-display text-2xl text-ink">Delivery Partners</h1>
        <Link href="/live-map" className="text-sm px-3 py-1.5 bg-charcoal text-paper rounded-sm">Open live map</Link>
      </div>
      <p className="text-sm text-ink/50 mb-5">
        Riders join at <span className="font-mono">{typeof window !== "undefined" ? window.location.origin : ""}/rider/register</span>, upload documents, and appear here for approval.
        Approved riders go on duty in the rider app, get orders you assign from the Orders page (or by WhatsApp: <span className="font-mono">ASSIGN code name</span>), and share live location.
      </p>

      {error && <p className="text-chili text-sm mb-3">{error}</p>}
      {note && <p className="text-basil text-sm mb-3">{note}</p>}

      <div className="flex gap-2 mb-4">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-3 py-1.5 text-sm rounded-sm border ${tab === k ? "bg-charcoal text-paper border-charcoal" : "border-line text-ink/70"}`}>
            {l} <span className={`ml-1 text-xs ${k === "PENDING" && counts[k] ? "bg-chili text-white px-1.5 rounded-full" : "opacity-60"}`}>{counts[k]}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 card-surface">
          <table className="w-full text-sm">
            <thead className="text-left text-xs font-mono uppercase text-ink/50 border-b border-line">
              <tr>
                <th className="px-4 py-3">Rider</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Now</th>
                <th className="px-4 py-3">Trips</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-ink/40">Nobody here.</td></tr>}
              {list.map((p) => {
                const missing = DOCS.filter(([k]) => !p[k]).length;
                return (
                  <FragmentRow key={p.id}>
                    <tr className="align-top">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {p.photoUrl ? <img src={fileUrl(p.photoUrl)} alt="" className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-line" />}
                          <div>
                            <div className="font-medium">{p.name}</div>
                            <div className="font-mono text-xs text-ink/60">{p.phone}</div>
                            <div className="text-xs text-ink/40">{p.loginEmail ? `App login: ${p.loginEmail}` : "WhatsApp only (no app login)"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">{p.vehicleType || "—"}<br /><span className="font-mono">{p.vehicleNumber || ""}</span></td>
                      <td className="px-4 py-3 text-xs">
                        {p.isOnline ? <span className="text-basil font-medium">● On duty</span> : <span className="text-ink/40">Off duty</span>}
                        <div className="text-ink/40">seen {ago(p.lastSeenAt)}</div>
                        {p.activeOrders > 0 && <div className="text-saffron2">{p.activeOrders} active order{p.activeOrders > 1 ? "s" : ""}</div>}
                      </td>
                      <td className="px-4 py-3">{p.delivered}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap space-x-1">
                        <button onClick={() => setOpen(open === p.id ? null : p.id)} className="text-xs px-2 py-1 border border-line rounded-sm">
                          Documents{missing ? ` (${missing} missing)` : ""}
                        </button>
                        {p.status !== "APPROVED" && (
                          <button onClick={() => act(() => api.updateDeliveryPartner(p.id, { status: "APPROVED", isActive: true }), `${p.name} approved. They've been told on WhatsApp.`)}
                            className="text-xs px-2 py-1 bg-basil text-white rounded-sm">Approve</button>
                        )}
                        {p.status !== "SUSPENDED" && (
                          <button onClick={() => confirm(`${p.status === "PENDING" ? "Reject" : "Suspend"} ${p.name}?`) && act(() => api.updateDeliveryPartner(p.id, { status: "SUSPENDED" }), `${p.name} suspended.`)}
                            className="text-xs px-2 py-1 bg-chili/10 text-chili rounded-sm">{p.status === "PENDING" ? "Reject" : "Suspend"}</button>
                        )}
                      </td>
                    </tr>
                    {open === p.id && (
                      <tr>
                        <td colSpan={5} className="px-4 pb-4 bg-paper/60">
                          <div className="grid grid-cols-4 gap-3 pt-3">
                            {DOCS.map(([k, l]) => (
                              <div key={k} className="text-center">
                                {p[k] ? <a href={fileUrl(p[k])} target="_blank" rel="noreferrer"><img src={fileUrl(p[k])} alt={l} className="h-28 w-full object-cover rounded-sm border border-line" /></a>
                                  : <div className="h-28 flex items-center justify-center border border-dashed border-line text-xs text-chili rounded-sm">Not uploaded</div>}
                                <div className="text-xs mt-1">{l}</div>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2 mt-3">
                            <button onClick={() => setLogin(p)} className="text-xs px-2 py-1 border border-line rounded-sm">{p.loginEmail ? "Reset app password" : "Create app login"}</button>
                            <a href={`https://wa.me/91${String(p.phone).replace(/\D/g, "").slice(-10)}`} target="_blank" rel="noreferrer" className="text-xs px-2 py-1 border border-line rounded-sm">WhatsApp rider</a>
                            <button onClick={() => confirm(`Delete ${p.name}? This can't be undone.`) && act(() => api.deleteDeliveryPartner(p.id), "Deleted.")}
                              className="text-xs px-2 py-1 text-chili ml-auto">Delete</button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </FragmentRow>
                );
              })}
            </tbody>
          </table>
        </div>

        <form onSubmit={handleCreate} className="card-surface p-5 h-fit">
          <h2 className="font-display text-lg mb-1">Add a rider yourself</h2>
          <p className="text-xs text-ink/50 mb-4">Added riders are approved straight away. Give an email and password to let them use the rider app; without it they get orders on WhatsApp only.</p>
          <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} />
          <input required placeholder="Mobile (10 digits)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={input} />
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Vehicle" value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })} className={input} />
            <input placeholder="KA09 AB 1234" value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value.toUpperCase() })} className={input} />
          </div>
          <input type="email" placeholder="Email for app login (optional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={input} />
          <input type="password" placeholder="Password (optional)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={input} />
          <button className="w-full bg-charcoal text-paper py-2 rounded-sm text-sm">Add rider</button>
        </form>
      </div>
    </Shell>
  );
}

function FragmentRow({ children }) {
  return <>{children}</>;
}
