"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

export default function DeliveryPartnersPage() {
  const [partners, setPartners] = useState([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  function load() {
    api.listAllDeliveryPartners().then((d) => setPartners(d.partners)).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    try {
      await api.createDeliveryPartner({ name, phone });
      setName("");
      setPhone("");
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleActive(partner) {
    await api.updateDeliveryPartner(partner.id, { isActive: !partner.isActive });
    load();
  }

  async function remove(partner) {
    if (!confirm(`Delete "${partner.name}"?`)) return;
    try {
      await api.deleteDeliveryPartner(partner.id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Shell>
      <h1 className="font-display text-2xl text-ink mb-1">Delivery Partners</h1>
      <p className="text-sm text-ink/50 mb-6">
        Couriers/riders orders can be forwarded to via WhatsApp — set up their name and number here,
        then use "Forward" on any order in the Orders page.
      </p>

      {error && <p className="text-chili text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 card-surface">
          <table className="w-full text-sm">
            <thead className="text-left text-xs font-mono uppercase text-ink/50 border-b border-line">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {partners.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">{p.name}</td>
                  <td className="px-4 py-3 font-mono">{p.phone}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(p)}
                      className={`text-xs px-2 py-1 rounded-sm ${p.isActive ? "bg-basil/10 text-basil" : "bg-chili/10 text-chili"}`}
                    >
                      {p.isActive ? "Active" : "Disabled"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => remove(p)} className="text-chili text-xs hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
              {partners.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-ink/40">No delivery partners yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <form onSubmit={handleCreate} className="card-surface p-5 h-fit">
          <h2 className="font-display text-lg mb-3">New delivery partner</h2>
          <input
            placeholder="Name" required value={name}
            onChange={(e) => setName(e.target.value)}
            className="field-input mb-2"
          />
          <input
            placeholder="Phone, e.g. 9876543210" required value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="field-input mb-4"
          />
          <button type="submit" className="btn-primary text-sm w-full">Add partner</button>
        </form>
      </div>
    </Shell>
  );
}
