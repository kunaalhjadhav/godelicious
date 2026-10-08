"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const STATUS_STYLE = {
  ACTIVE: "bg-basil/10 text-basil",
  PAUSED: "bg-saffron/20 text-saffron2",
  CANCELLED: "bg-chili/10 text-chili",
};

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  function load() {
    api.listSubscriptions().then((d) => { setSubs(d.subscriptions); setLoaded(true); }).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function setStatus(id, status) {
    setError("");
    try { await api.setSubscriptionStatus(id, status); load(); } catch (e) { setError(e.message); }
  }

  async function runNow() {
    setError(""); setNote("");
    try {
      const r = await api.runSubscriptions();
      setNote(r.created ? `Created ${r.created} order(s).` : "Nothing due right now.");
    } catch (e) { setError(e.message); }
  }

  return (
    <Shell>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-ink mb-1">Weekly Meal Boxes</h1>
          <p className="text-sm text-ink/50 max-w-xl">
            Recurring plans set up by customers in the app. The evening before each delivery (6 PM), the system creates a
            normal order for it, paid on delivery, and it shows up in Orders and in your alerts.
          </p>
        </div>
        <button onClick={runNow} className="text-sm px-3 py-2 border border-line rounded-sm bg-white">Create due orders now</button>
      </div>
      {error && <p className="text-chili text-sm mb-4">{error}</p>}
      {note && <p className="text-basil text-sm mb-4">{note}</p>}

      <div className="bg-white border border-line rounded-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs font-mono uppercase text-ink/50 border-b border-line">
            <tr>
              <th className="px-4 py-3">Customer</th><th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Days</th><th className="px-4 py-3">Per week</th>
              <th className="px-4 py-3">Next delivery</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {subs.map((s) => {
              const next = (s.upcoming || []).find((u) => !u.skipped);
              return (
                <tr key={s.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{s.user?.name}</div>
                    <div className="text-xs text-ink/50">{s.phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    {s.boxesPerDay} x {s.menuItem?.name}
                    <div className="text-xs text-ink/50">{s.timeSlot} · {s.address}</div>
                  </td>
                  <td className="px-4 py-3">{s.days.map((d) => DAY_NAMES[d]).join(", ")}</td>
                  <td className="px-4 py-3 font-mono">₹{s.weekly?.total?.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3">{s.status === "ACTIVE" && next ? next.date : "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-sm ${STATUS_STYLE[s.status] || ""}`}>{s.status}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {s.status === "ACTIVE" && <button onClick={() => setStatus(s.id, "PAUSED")} className="text-xs mr-3 hover:underline">Pause</button>}
                    {s.status === "PAUSED" && <button onClick={() => setStatus(s.id, "ACTIVE")} className="text-xs mr-3 hover:underline">Resume</button>}
                    {s.status !== "CANCELLED" && (
                      <button onClick={() => confirm("Cancel this plan?") && setStatus(s.id, "CANCELLED")} className="text-xs text-chili hover:underline">Cancel</button>
                    )}
                  </td>
                </tr>
              );
            })}
            {loaded && subs.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-ink/40">No weekly plans yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
