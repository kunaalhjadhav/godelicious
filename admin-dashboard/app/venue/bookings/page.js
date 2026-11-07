"use client";

import { useEffect, useMemo, useState } from "react";
import VenueShell from "@/components/VenueShell";
import { api } from "@/lib/api";

const TABS = [
  { id: "all", label: "All" },
  { id: "new", label: "New requests" },
  { id: "awaiting", label: "Awaiting advance" },
  { id: "confirmed", label: "Confirmed" },
  { id: "closed", label: "Declined / cancelled" },
];
const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
const day = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

function stage(b) {
  if (b.status === "PENDING") return { id: "new", label: "New request", cls: "bg-saffron/15 text-saffron2" };
  if (b.status === "ACCEPTED" && b.advancePaid) return { id: "confirmed", label: "Confirmed", cls: "bg-basil/10 text-basil" };
  if (b.status === "ACCEPTED") return { id: "awaiting", label: "Awaiting advance", cls: "bg-saffron/10 text-saffron2" };
  return { id: "closed", label: b.status === "REJECTED" ? "Declined" : "Cancelled", cls: "bg-chili/10 text-chili" };
}

// Every booking request with its payment status, newest event first.
export default function VenueBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [tab, setTab] = useState("all");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.myVenueBookings().then((d) => { setBookings(d.bookings || []); setLoaded(true); }).catch((e) => setError(e.message));
  }, []);

  const rows = useMemo(
    () => bookings.filter((b) => tab === "all" || stage(b).id === tab).sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate)),
    [bookings, tab]
  );
  const confirmed = bookings.filter((b) => stage(b).id === "confirmed");
  const advTotal = confirmed.reduce((s, b) => s + (b.advanceAmount || 0), 0);
  const quoteTotal = confirmed.reduce((s, b) => s + (b.quotedAmount || 0), 0);
  const count = (id) => bookings.filter((b) => stage(b).id === id).length;

  return (
    <VenueShell>
      <h1 className="font-display text-2xl text-ink mb-1">Bookings & Payments</h1>
      <p className="text-sm text-ink/50 mb-5">Every request you have received, with the price you quoted and whether the customer paid the advance.</p>
      {error && <p className="text-chili text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-white border border-line rounded-sm p-3"><div className="text-xs text-ink/50">New requests</div><div className="font-display text-2xl">{count("new")}</div></div>
        <div className="bg-white border border-line rounded-sm p-3"><div className="text-xs text-ink/50">Awaiting advance</div><div className="font-display text-2xl">{count("awaiting")}</div></div>
        <div className="bg-white border border-line rounded-sm p-3"><div className="text-xs text-ink/50">Confirmed bookings</div><div className="font-display text-2xl">{confirmed.length}</div></div>
        <div className="bg-white border border-line rounded-sm p-3"><div className="text-xs text-ink/50">Advances paid / total quoted</div><div className="font-display text-lg">{inr(advTotal)} <span className="text-ink/40 text-sm">/ {inr(quoteTotal)}</span></div></div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`text-sm px-3 py-1.5 rounded-sm border ${tab === t.id ? "bg-charcoal text-paper border-charcoal" : "border-line hover:bg-white"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-line rounded-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-paper text-left text-xs font-mono uppercase text-ink/50">
            <tr>
              <th className="px-3 py-2">Event date</th><th className="px-3 py-2">Customer</th><th className="px-3 py-2">Event</th>
              <th className="px-3 py-2">Guests</th><th className="px-3 py-2">Quote</th><th className="px-3 py-2">Advance</th><th className="px-3 py-2">Balance</th><th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => {
              const st = stage(b);
              const bal = b.quotedAmount ? Math.max(0, b.quotedAmount - (b.advancePaid ? b.advanceAmount || 0 : 0)) : null;
              return (
                <tr key={b.id} className="border-t border-line align-top">
                  <td className="px-3 py-2 whitespace-nowrap">{day(b.eventDate)}{b.startTime ? <div className="text-xs text-ink/40">{b.startTime}{b.endTime ? `–${b.endTime}` : ""}</div> : null}</td>
                  <td className="px-3 py-2">{b.customer?.name}<div className="text-xs"><a className="text-saffron2" href={`tel:${b.contactPhone}`}>{b.contactPhone}</a></div></td>
                  <td className="px-3 py-2">{b.eventType}{b.foodOption ? <div className="text-xs text-ink/40">{b.foodOption}</div> : null}</td>
                  <td className="px-3 py-2">{b.guestCount}</td>
                  <td className="px-3 py-2">{b.quotedAmount ? inr(b.quotedAmount) : "—"}</td>
                  <td className="px-3 py-2">{b.advancePaid ? <span className="text-basil">{inr(b.advanceAmount)} paid</span> : b.status === "ACCEPTED" ? "Not paid yet" : "—"}</td>
                  <td className="px-3 py-2">{bal != null && b.status === "ACCEPTED" ? inr(bal) : "—"}</td>
                  <td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded-sm ${st.cls}`}>{st.label}</span></td>
                </tr>
              );
            })}
            {loaded && rows.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-10 text-center text-ink/40">No bookings here yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink/40 mt-3">The balance is settled directly between you and the customer. Godelicious collects only the advance online.</p>
    </VenueShell>
  );
}
