"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

const COLORS = { PENDING: "text-saffron2", ACCEPTED: "text-basil", REJECTED: "text-chili", CANCELLED: "text-ink/40" };

export default function MyVenueRequestsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  function load() { api.myVenueRequests().then((d) => setRows(d.bookings)).catch((e) => setError(e.message)); }
  useEffect(() => { if (!loading && !user) router.replace("/login?next=/venues/requests"); }, [loading, user, router]);
  useEffect(() => { if (user) load(); }, [user]);

  async function cancel(id) {
    try { await api.cancelVenueRequest(id); load(); } catch (e) { setError(e.message); }
  }

  if (loading || !user) return null;
  return (
    <div className="min-h-screen bg-paper">
      <Nav />
      <div className="max-w-2xl mx-auto px-5 py-10">
        <h1 className="font-display text-2xl text-ink mb-6">My venue requests</h1>
        {error && <p className="text-chili text-sm mb-3">{error}</p>}
        <div className="space-y-3">
          {rows.map((b) => (
            <div key={b.id} className="bg-white border border-line rounded-sm p-4">
              <span className={`text-xs font-mono uppercase ${COLORS[b.status]}`}>{b.status}</span>
              <h3 className="font-display text-lg text-ink">{b.venue.name}</h3>
              <p className="text-sm text-ink/60">
                {b.eventType} · {new Date(b.eventDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })} · {b.guestCount} guests
              </p>
              {b.status === "ACCEPTED" && b.quotedAmount != null && <p className="text-sm text-basil mt-1">Owner's quote: ₹{Math.round(b.quotedAmount).toLocaleString("en-IN")} · call {b.venue.contactPhone}</p>}
              {b.ownerNote && <p className="text-sm text-ink/60 mt-1">Owner: {b.ownerNote}</p>}
              {["PENDING", "ACCEPTED"].includes(b.status) && <button onClick={() => cancel(b.id)} className="text-xs text-chili mt-2 hover:underline">Cancel request</button>}
            </div>
          ))}
          {rows.length === 0 && <p className="text-ink/50">No requests yet.</p>}
        </div>
      </div>
    </div>
  );
}
