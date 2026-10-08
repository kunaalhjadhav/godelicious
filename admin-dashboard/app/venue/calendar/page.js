"use client";

import { useEffect, useMemo, useState } from "react";
import VenueShell from "@/components/VenueShell";
import { api } from "@/lib/api";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad = (n) => String(n).padStart(2, "0");
const dayKey = (iso) => String(iso).slice(0, 10);
const UNIT = { EVENT: "per event", DAY: "per day", HOUR: "per hour", PLATE: "per plate" };

export default function VenueCalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-11
  const [bookings, setBookings] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [pending, setPending] = useState([]);
  const [venue, setVenue] = useState(null);
  const [selected, setSelected] = useState(null); // YYYY-MM-DD
  const [quote, setQuote] = useState({});
  const [note, setNote] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const monthKey = `${year}-${pad(month + 1)}`;

  function load() {
    api.myVenueBookings({ month: monthKey }).then((d) => { setBookings(d.bookings); setBlocks(d.blocks); }).catch((e) => setError(e.message));
    api.myVenueBookings({ status: "PENDING" }).then((d) => setPending(d.bookings)).catch(() => {});
  }
  useEffect(load, [monthKey]);
  useEffect(() => { api.myVenue().then((d) => setVenue(d.venue)).catch(() => {}); }, []);

  const byDay = useMemo(() => {
    const map = {};
    bookings.forEach((b) => { (map[dayKey(b.eventDate)] ||= []).push(b); });
    return map;
  }, [bookings]);
  const blockByDay = useMemo(() => Object.fromEntries(blocks.map((b) => [dayKey(b.date), b])), [blocks]);

  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(first.getDay()).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  function shift(delta) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear()); setMonth(d.getMonth()); setSelected(null);
  }

  function suggested(b) {
    if (!venue) return null;
    const lines = venue.tariffs.filter((t) => t.isActive && (t.eventType === "Any" || t.eventType === b.eventType));
    const hall = lines.find((t) => t.kind === "HALL" && ["EVENT", "DAY"].includes(t.unit));
    const plate = lines.find((t) => t.kind === "FOOD" && t.unit === "PLATE");
    if (!hall && !plate) return null;
    return (hall ? hall.price : 0) + (plate ? plate.price * b.guestCount : 0);
  }

  async function decide(b, status) {
    setError(""); setBusy(b.id);
    try {
      await api.decideVenueBooking(b.id, { status, quotedAmount: quote[b.id], ownerNote: note[b.id] });
      load();
    } catch (e) { setError(e.message); } finally { setBusy(""); }
  }

  async function toggleBlock(key) {
    setError("");
    try {
      if (blockByDay[key]) await api.removeVenueBlock(blockByDay[key].id);
      else await api.addVenueBlock(key, "Unavailable");
      load();
    } catch (e) { setError(e.message); }
  }

  const dayBookings = selected ? byDay[selected] || [] : [];
  const tariffsFor = (type) => (venue ? venue.tariffs.filter((t) => t.isActive && (t.eventType === "Any" || t.eventType === type)) : []);

  function BookingCard({ b }) {
    const sug = b.status === "PENDING" ? suggested(b) : null;
    return (
      <div className="border border-line rounded-sm p-4 bg-white">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs px-2 py-0.5 rounded-sm ${b.status === "PENDING" ? "bg-saffron/15 text-saffron2" : b.status === "ACCEPTED" ? "bg-basil/10 text-basil" : "bg-chili/10 text-chili"}`}>{b.status}</span>
          <span className="font-medium text-sm">{b.eventType}</span>
          <span className="text-xs text-ink/40 ml-auto">{new Date(b.eventDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })}</span>
        </div>
        <div className="text-sm text-ink/70">{b.customer.name} · <a className="text-saffron2" href={`tel:${b.contactPhone}`}>{b.contactPhone}</a></div>
        <div className="text-sm text-ink/70">
          {b.guestCount} guests{b.startTime ? ` · ${b.startTime}${b.endTime ? `–${b.endTime}` : ""}` : " · full day"}
          {b.foodOption ? ` · ${b.foodOption}` : ""}
        </div>
        {b.services.length > 0 && <div className="text-xs text-ink/50">Services: {b.services.join(", ")}</div>}
        {b.notes && <div className="text-xs text-ink/50 mt-1">“{b.notes}”</div>}
        {b.status === "ACCEPTED" && b.quotedAmount != null && <div className="text-sm text-basil mt-1">Quoted ₹{Math.round(b.quotedAmount).toLocaleString("en-IN")}</div>}
        {b.ownerNote && b.status !== "PENDING" && <div className="text-xs text-ink/50 mt-1">Your note: {b.ownerNote}</div>}

        {b.status === "PENDING" && (
          <div className="mt-3 pt-3 border-t border-line">
            {tariffsFor(b.eventType).length > 0 && (
              <div className="text-xs text-ink/50 mb-2">
                Your tariff: {tariffsFor(b.eventType).map((t) => `${t.label} ₹${t.price} ${UNIT[t.unit]}`).join(" · ")}
              </div>
            )}
            <div className="flex gap-2 mb-2">
              <input
                type="number" min="0" placeholder="Your quote (₹)" value={quote[b.id] ?? ""}
                onChange={(e) => setQuote({ ...quote, [b.id]: e.target.value })}
                className="w-40 px-3 py-2 border border-line rounded-sm text-sm"
              />
              {sug != null && (
                <button type="button" onClick={() => setQuote({ ...quote, [b.id]: String(Math.round(sug)) })} className="text-xs text-saffron2 hover:underline">
                  Use ₹{Math.round(sug).toLocaleString("en-IN")} from tariff
                </button>
              )}
            </div>
            <input
              placeholder="Message to customer (optional)" value={note[b.id] ?? ""}
              onChange={(e) => setNote({ ...note, [b.id]: e.target.value })}
              className="w-full px-3 py-2 border border-line rounded-sm text-sm mb-2"
            />
            <div className="flex gap-2">
              <button disabled={busy === b.id} onClick={() => decide(b, "ACCEPTED")} className="bg-basil text-white text-sm px-4 py-2 rounded-sm disabled:opacity-50">Accept</button>
              <button disabled={busy === b.id} onClick={() => decide(b, "REJECTED")} className="border border-chili text-chili text-sm px-4 py-2 rounded-sm disabled:opacity-50">Reject</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <VenueShell>
      <h1 className="font-display text-2xl text-ink mb-1">Calendar & Requests</h1>
      <p className="text-sm text-ink/50 mb-5">
        Click a date to see its requests, accept or reject them, or block the date. Orange = waiting for you, green = accepted, grey = blocked.
      </p>
      {error && <p className="text-chili text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3">
          <div className="bg-white border border-line rounded-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => shift(-1)} className="px-3 py-1 border border-line rounded-sm text-sm">←</button>
              <div className="font-display text-lg">{new Date(year, month, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</div>
              <button onClick={() => shift(1)} className="px-3 py-1 border border-line rounded-sm text-sm">→</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-mono uppercase text-ink/40 mb-1">
              {DOW.map((d) => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((d, i) => {
                if (d === null) return <div key={`e${i}`} />;
                const key = `${monthKey}-${pad(d)}`;
                const list = byDay[key] || [];
                const nPending = list.filter((b) => b.status === "PENDING").length;
                const nAccepted = list.filter((b) => b.status === "ACCEPTED").length;
                const blocked = Boolean(blockByDay[key]);
                const isToday = key === `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
                return (
                  <button
                    key={key} onClick={() => setSelected(key)}
                    className={`h-16 rounded-sm border text-left p-1.5 text-xs transition-colors ${
                      selected === key ? "border-saffron bg-saffron/10" : blocked ? "border-line bg-line/60" : "border-line hover:border-saffron/60"
                    }`}
                  >
                    <div className={`font-medium ${isToday ? "text-saffron2" : ""}`}>{d}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {nPending > 0 && <span className="bg-saffron2 text-white rounded-full px-1.5 text-[10px]">{nPending}</span>}
                      {nAccepted > 0 && <span className="bg-basil text-white rounded-full px-1.5 text-[10px]">{nAccepted}</span>}
                      {blocked && <span className="text-[10px] text-ink/50">blocked</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selected && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-display text-lg">{new Date(`${selected}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}</h2>
                <button onClick={() => toggleBlock(selected)} className="text-xs text-saffron2 hover:underline">
                  {blockByDay[selected] ? "Unblock this date" : "Block this date"}
                </button>
              </div>
              <div className="space-y-3">
                {dayBookings.map((b) => <BookingCard key={b.id} b={b} />)}
                {dayBookings.length === 0 && <p className="text-sm text-ink/40">No requests for this date.</p>}
              </div>
            </div>
          )}
        </div>

        <div className="col-span-2">
          <h2 className="font-display text-lg mb-2">Waiting for your answer ({pending.length})</h2>
          <div className="space-y-3">
            {pending.map((b) => <BookingCard key={b.id} b={b} />)}
            {pending.length === 0 && <p className="text-sm text-ink/40">You are all caught up.</p>}
          </div>
        </div>
      </div>
    </VenueShell>
  );
}
