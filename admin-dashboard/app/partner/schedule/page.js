"use client";

// Brand partner schedule: orders by delivery day, and days the kitchen is closed.
import { useCallback, useEffect, useMemo, useState } from "react";
import PartnerShell from "@/components/PartnerShell";
import { api } from "@/lib/api";

const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const todayYmd = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
const rs = (n) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
const STATUS = { PENDING: "bg-chili/10 text-chili", CONFIRMED: "bg-saffron/15 text-saffron2", PREPARING: "bg-saffron/15 text-saffron2", OUT_FOR_DELIVERY: "bg-basil/10 text-basil", DELIVERED: "bg-line text-ink/60" };

function monthLabel(m) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
}
function shift(m, d) {
  const [y, mo] = m.split("-").map(Number);
  const t = new Date(Date.UTC(y, mo - 1 + d, 1));
  return t.toISOString().slice(0, 7);
}

export default function SchedulePage() {
  const [month, setMonth] = useState(todayYmd().slice(0, 7));
  const [data, setData] = useState({ days: {}, closures: [] });
  const [selected, setSelected] = useState(todayYmd());
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api.brandSchedule(month).then((d) => { setData(d); setError(""); }).catch((e) => setError(e.message));
  }, [month]);
  useEffect(load, [load]);

  const cells = useMemo(() => {
    const [y, mo] = month.split("-").map(Number);
    const first = new Date(Date.UTC(y, mo - 1, 1));
    const lead = (first.getUTCDay() + 6) % 7; // Monday first
    const count = new Date(Date.UTC(y, mo, 0)).getUTCDate();
    return [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
  }, [month]);

  const closedMap = Object.fromEntries(data.closures.map((c) => [c.date, c]));
  const dayOrders = data.days[selected] || [];
  const closed = closedMap[selected];
  const past = selected < todayYmd();
  const monthOrders = Object.values(data.days).flat();

  async function toggleClosed() {
    setError("");
    try {
      if (closed) await api.removeBrandClosure(closed.id);
      else await api.addBrandClosure(selected, reason.trim() || undefined);
      setReason("");
      load();
    } catch (err) { setError(err.message); }
  }

  return (
    <PartnerShell>
      <h1 className="font-display text-2xl text-ink mb-1">Schedule Calendar</h1>
      <p className="text-sm text-ink/50 mb-5">See every order by delivery day. Mark days you can't cook, and customers won't be able to order your dishes for those days.</p>
      {error && <p className="text-chili text-sm mb-3">{error}</p>}

      <div className="flex flex-col lg:flex-row gap-5">
        <div className="bg-white border border-line rounded-sm p-3 sm:p-4 lg:w-[460px] shrink-0">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setMonth(shift(month, -1))} className="px-3 py-1.5 border border-line rounded-sm" aria-label="Previous month">‹</button>
            <div className="font-display text-lg">{monthLabel(month)}</div>
            <button onClick={() => setMonth(shift(month, 1))} className="px-3 py-1.5 border border-line rounded-sm" aria-label="Next month">›</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-mono uppercase text-ink/40 mb-1">
            {WEEK.map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <div key={`e${i}`} />;
              const n = (data.days[d] || []).length;
              const isClosed = !!closedMap[d];
              const isSel = d === selected;
              const isToday = d === todayYmd();
              return (
                <button key={d} onClick={() => setSelected(d)}
                  className={`aspect-square rounded-sm text-sm flex flex-col items-center justify-center border transition-colors
                    ${isSel ? "border-charcoal ring-2 ring-charcoal" : "border-line"}
                    ${isClosed ? "bg-chili/10 text-chili" : n ? "bg-saffron/15" : "bg-paper/40"}
                    ${d < todayYmd() ? "opacity-50" : ""}`}>
                  <span className={isToday ? "font-bold underline" : ""}>{Number(d.slice(8))}</span>
                  {isClosed ? <span className="text-[9px] font-bold">CLOSED</span>
                    : n ? <span className="text-[10px] font-bold text-saffron2">{n} order{n > 1 ? "s" : ""}</span> : null}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-3 text-xs text-ink/60">
            <span><span className="inline-block w-3 h-3 bg-saffron/30 rounded-sm align-middle mr-1" />Orders</span>
            <span><span className="inline-block w-3 h-3 bg-chili/20 rounded-sm align-middle mr-1" />Closed</span>
            <span className="ml-auto">{monthOrders.length} orders · {rs(monthOrders.reduce((s, o) => s + o.total, 0))} this month</span>
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          <div className="bg-white border border-line rounded-sm p-4">
            <div className="font-display text-lg">
              {new Date(`${selected}T12:00:00Z`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
            </div>
            {closed ? (
              <p className="text-sm text-chili mt-1">Closed{closed.reason ? `: ${closed.reason}` : ""}. Customers can't order your dishes for this day.</p>
            ) : (
              <p className="text-sm text-ink/50 mt-1">{dayOrders.length ? `${dayOrders.length} order${dayOrders.length > 1 ? "s" : ""} to prepare.` : "No orders for this day yet."}</p>
            )}
            {!past && (
              <div className="flex flex-col sm:flex-row gap-2 mt-3">
                {!closed && <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional), e.g. Festival holiday"
                  className="flex-1 px-3 py-2 border border-line rounded-sm text-sm" />}
                <button onClick={toggleClosed} className={`px-4 py-2 rounded-sm text-sm font-medium ${closed ? "bg-basil text-white" : "bg-chili text-white"}`}>
                  {closed ? "Open this day again" : "Mark closed"}
                </button>
              </div>
            )}
            {closed && dayOrders.length > 0 && <p className="text-xs text-saffron2 mt-2">Orders already placed for this day still need to be delivered.</p>}
          </div>

          {dayOrders.map((o) => (
            <div key={o.id} className="bg-white border border-line rounded-sm p-4">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-mono text-sm">#{o.code}</span>
                <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded-sm ${STATUS[o.status] || "bg-line"}`}>{o.status.replace(/_/g, " ")}</span>
                <span className="text-sm text-ink/60 ml-auto">{o.eventTime}</span>
              </div>
              <div className="text-sm text-ink/70">{o.customer}{o.guestCount ? ` · ${o.guestCount} guests` : ""}</div>
              <ul className="text-sm mt-2 space-y-0.5">
                {o.items.map((it, i) => <li key={i}>{it.soldByWeight ? `${it.quantity} g` : `${it.quantity} ×`} {it.name}</li>)}
              </ul>
              <div className="text-sm font-medium mt-2">Your share: {rs(o.total)}</div>
            </div>
          ))}
        </div>
      </div>
    </PartnerShell>
  );
}
