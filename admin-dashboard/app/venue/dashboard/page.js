"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import VenueShell from "@/components/VenueShell";
import { api } from "@/lib/api";

const STATUS = {
  PENDING: "bg-saffron/15 text-saffron2",
  ACCEPTED: "bg-basil/10 text-basil",
};

export default function VenueDashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => { api.myVenueDashboard().then(setData).catch((e) => setError(e.message)); }, []);

  return (
    <VenueShell>
      <h1 className="font-display text-2xl text-ink mb-1">Dashboard</h1>
      <p className="text-sm text-ink/50 mb-6">Booking requests and upcoming events at your venue</p>
      {error && <p className="text-chili text-sm mb-4">{error}</p>}

      {data && (
        <>
          {!data.venue.isApproved && (
            <div className="bg-saffron/10 border-l-2 border-saffron2 px-4 py-3 mb-6 text-sm max-w-3xl">
              Your venue is <strong>pending admin approval</strong>. Add your tariffs and details now — customers can
              send requests once it is approved.
            </div>
          )}
          <div className="grid grid-cols-3 gap-4 mb-8 max-w-3xl">
            <Link href="/venue/calendar" className="bg-white border border-line rounded-sm p-5 hover:border-saffron">
              <div className="text-xs font-mono uppercase text-ink/50 mb-2">Requests to answer</div>
              <div className="font-display text-2xl text-saffron2">{data.pendingCount}</div>
            </Link>
            <div className="bg-white border border-line rounded-sm p-5">
              <div className="text-xs font-mono uppercase text-ink/50 mb-2">Accepted bookings</div>
              <div className="font-display text-2xl text-basil">{data.acceptedCount}</div>
            </div>
            <div className="bg-white border border-line rounded-sm p-5">
              <div className="text-xs font-mono uppercase text-ink/50 mb-2">Accepted value</div>
              <div className="font-display text-2xl">₹{Math.round(data.acceptedValue).toLocaleString("en-IN")}</div>
            </div>
          </div>

          <h2 className="font-display text-lg mb-2">Coming up</h2>
          <div className="bg-white border border-line rounded-sm max-w-3xl divide-y divide-line">
            {data.upcoming.map((b) => (
              <div key={b.id} className="px-4 py-3 flex items-center gap-3 text-sm">
                <div className="w-24 font-mono text-xs">{new Date(b.eventDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })}</div>
                <div className="flex-1">
                  <div className="font-medium">{b.eventType} · {b.guestCount} guests</div>
                  <div className="text-xs text-ink/50">{b.customer.name} · {b.contactPhone}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-sm ${STATUS[b.status]}`}>{b.status}</span>
              </div>
            ))}
            {data.upcoming.length === 0 && <div className="px-4 py-6 text-sm text-ink/40">No upcoming events yet.</div>}
          </div>
        </>
      )}
    </VenueShell>
  );
}
