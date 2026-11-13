"use client";

// Weekly meal box plans: same as the "Weekly box" screen in the mobile app.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { useAuth } from "@/lib/useAuth";
import { api } from "@/lib/api";
import { rupees, computeTotals } from "@/lib/pricing";

const DAYS = [
  { n: 1, label: "Mon" }, { n: 2, label: "Tue" }, { n: 3, label: "Wed" }, { n: 4, label: "Thu" },
  { n: 5, label: "Fri" }, { n: 6, label: "Sat" }, { n: 0, label: "Sun" },
];
const DAY_LABEL = Object.fromEntries(DAYS.map((d) => [d.n, d.label]));
const longDate = (d) => new Date(`${d}T12:00:00+05:30`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
const card = "bg-white border border-line rounded-2xl p-4";
const cap = "text-[11px] font-bold uppercase tracking-wider text-ink/40 mb-2.5";

function PlanCard({ plan, onChanged }) {
  const [busy, setBusy] = useState(false);
  async function run(fn) {
    setBusy(true);
    try { await fn(); await onChanged(); } catch (e) { alert(e.message); } finally { setBusy(false); }
  }
  const paused = plan.status === "PAUSED";
  return (
    <div className={card}>
      <div className="flex justify-between items-start gap-2">
        <div className="font-bold text-ink">{plan.boxesPerDay} x {plan.menuItem?.name}</div>
        <span className={`text-[10px] font-extrabold rounded px-1.5 py-0.5 ${paused ? "bg-saffron/20 text-saffron2" : "bg-basil/10 text-basil"}`}>{plan.status}</span>
      </div>
      <p className="text-sm text-ink/50 mt-1">{plan.days.map((d) => DAY_LABEL[d]).join(", ")} · {plan.timeSlot}</p>
      <p className="text-sm text-ink/50">{rupees(plan.weekly?.total)} per week (incl. {plan.weekly?.gstPercent ?? 5}% GST)</p>

      <div className={`${cap} mt-4`}>Upcoming deliveries</div>
      {plan.upcoming.length === 0 ? (
        <p className="text-sm text-ink/50">{paused ? "Paused. Resume to schedule deliveries." : "No upcoming deliveries."}</p>
      ) : plan.upcoming.slice(0, 4).map((u) => (
        <div key={u.date} className="flex justify-between py-2 border-b border-[#EDE8DC] last:border-0 text-sm">
          <span className={u.skipped ? "line-through text-ink/40" : "text-ink"}>{longDate(u.date)}</span>
          {u.canChange ? (
            <button disabled={busy} className="text-saffron2 font-bold"
              onClick={() => run(() => (u.skipped ? api.unskipSubscriptionDay(plan.id, u.date) : api.skipSubscriptionDay(plan.id, u.date)))}>
              {u.skipped ? "Undo skip" : "Skip"}
            </button>
          ) : <span className="text-ink/40 text-xs">Locked</span>}
        </div>
      ))}

      <div className="flex justify-between items-center mt-4">
        {paused ? (
          <button disabled={busy} onClick={() => run(() => api.updateSubscription(plan.id, { status: "ACTIVE" }))} className="bg-charcoal text-paper text-sm font-bold rounded-lg px-4 py-2">Resume</button>
        ) : (
          <button disabled={busy} className="bg-charcoal text-paper text-sm font-bold rounded-lg px-4 py-2"
            onClick={() => {
              const d = new Date(Date.now() + 5.5 * 3600 * 1000 + 7 * 86400000).toISOString().slice(0, 10);
              run(() => api.updateSubscription(plan.id, { status: "PAUSED", pausedUntil: d }));
            }}>Pause 1 week</button>
        )}
        <button disabled={busy} className="text-sm text-chili font-semibold"
          onClick={() => confirm("Cancel this plan?\n\nDeliveries already scheduled for tomorrow stay. Nothing after that will be created.") && run(() => api.updateSubscription(plan.id, { status: "CANCELLED" }))}>
          Cancel plan
        </button>
      </div>
    </div>
  );
}

export default function WeeklyBoxPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [info, setInfo] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [itemId, setItemId] = useState(null);
  const [days, setDays] = useState([1, 2, 3, 4, 5]);
  const [slot, setSlot] = useState("12:30 PM");
  const [boxes, setBoxes] = useState(10);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { if (!authLoading && !user) router.replace("/login"); }, [authLoading, user, router]);

  const load = useCallback(async () => {
    try {
      const [pl, mine, addrs] = await Promise.all([api.subscriptionPlans(), api.mySubscriptions(), api.myAddresses().catch(() => ({ addresses: [] }))]);
      setInfo(pl);
      setPlans(mine.subscriptions || []);
      setItemId((cur) => cur || pl.items[0]?.id || null);
      if (pl.slots?.length) setSlot((cur) => (pl.slots.includes(cur) ? cur : pl.slots[0]));
      const def = addrs.addresses.find((a) => a.isDefault) || addrs.addresses[0];
      if (def) { setAddress((cur) => cur || def.address); if (def.phone) setPhone((cur) => cur || def.phone); }
    } catch (e) { setMsg(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { if (user) { setPhone((p) => p || user.phone || ""); load(); } }, [user, load]);

  const item = info?.items.find((i) => i.id === itemId);
  const gross = item ? item.price * boxes * days.length : 0;
  const discount = info ? Math.round((gross * info.discountPct) / 100) : 0;
  const gstPercent = info?.gstPercent ?? 5;
  const wk = computeTotals({ subtotal: gross, discount, gstPercent });

  const toggleDay = (n) => setDays((prev) => (prev.includes(n) ? prev.filter((d) => d !== n) : [...prev, n]));

  async function start() {
    setMsg("");
    if (!item) return;
    if (!days.length) return setMsg("Choose at least one delivery day.");
    if (!address.trim() || !phone.trim()) return setMsg("Delivery address and phone are required.");
    setSaving(true);
    try {
      await api.createSubscription({ menuItemId: item.id, boxesPerDay: boxes, days, timeSlot: slot, address: address.trim(), phone: phone.trim() });
      setMsg("Plan started. We create each day's order the evening before, and you pay on delivery.");
      await load();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) { setMsg(e.message); } finally { setSaving(false); }
  }

  if (authLoading || !user) return null;
  return (
    <div className="min-h-screen bg-paper pb-24 md:pb-10">
      <Nav />
      <div className="max-w-xl mx-auto px-4 py-6 space-y-3">
        <Link href="/profile" className="text-sm text-ink/50">‹ Profile</Link>
        <div className="bg-charcoal rounded-2xl p-5">
          <h1 className="font-display text-2xl text-paper">Lunch, on repeat</h1>
          <p className="text-sm text-[#CFC9B8] mt-1">Pick the days and the box. We deliver fresh and you pay on delivery. Skip or pause any day.</p>
        </div>
        {msg && <p className="text-sm text-ink/70 bg-white border border-line rounded-xl px-3 py-2">{msg}</p>}
        {loading && <p className="text-ink/50 text-sm">Loading…</p>}

        {plans.length > 0 && (
          <>
            <div className={`${cap} mt-4`}>Your plans</div>
            {plans.map((p) => <PlanCard key={p.id} plan={p} onChanged={load} />)}
          </>
        )}

        {!loading && (!info || info.items.length === 0) ? (
          <p className="text-center text-sm text-ink/50 py-6">Weekly meal boxes are not open yet. Please check back soon.</p>
        ) : info && (
          <>
            <div className={`${cap} mt-4`}>{plans.length ? "Start another plan" : "Set up your plan"}</div>
            <div className={card}>
              <div className={cap}>Delivery days</div>
              <div className="grid grid-cols-7 gap-1.5">
                {DAYS.map((d) => (
                  <button key={d.n} onClick={() => toggleDay(d.n)}
                    className={`py-2 rounded-lg text-sm border ${days.includes(d.n) ? "bg-basil border-basil text-white font-bold" : "border-line text-ink"}`}>{d.label}</button>
                ))}
              </div>
              <div className={`${cap} mt-4`}>Delivery time</div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {info.slots.map((s) => (
                  <button key={s} onClick={() => setSlot(s)}
                    className={`px-3.5 py-1.5 rounded-full text-sm border whitespace-nowrap ${slot === s ? "border-saffron2 bg-saffron/15 text-saffron2 font-bold" : "border-line text-ink"}`}>{s}</button>
                ))}
              </div>
            </div>

            <div className={card}>
              <div className={cap}>Box</div>
              {info.items.map((i) => (
                <button key={i.id} onClick={() => setItemId(i.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border mb-2 text-left ${itemId === i.id ? "border-saffron2 bg-saffron/10" : "border-line"}`}>
                  <span className={`w-4 h-4 rounded-full border-2 shrink-0 ${itemId === i.id ? "border-saffron2 bg-saffron2" : "border-line"}`} />
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-ink text-sm">{i.name}</span>
                    {i.description && <span className="block text-xs text-ink/50 truncate">{i.description}</span>}
                  </span>
                  <span className="font-bold text-sm">{rupees(i.price)}</span>
                </button>
              ))}
              <div className="flex justify-between items-center mt-2">
                <span className="font-bold text-sm">Boxes per day</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => setBoxes((b) => Math.max(1, b - 1))} className="w-9 h-9 rounded-lg border border-line text-lg">−</button>
                  <span className="w-8 text-center font-bold">{boxes}</span>
                  <button onClick={() => setBoxes((b) => Math.min(500, b + 1))} className="w-9 h-9 rounded-lg bg-charcoal text-white text-lg">+</button>
                </div>
              </div>
            </div>

            <div className={card}>
              <div className={cap}>Deliver to</div>
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} placeholder="Office or home address" className="w-full border border-line rounded-lg p-3 text-sm" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="Phone number" className="w-full border border-line rounded-lg p-3 text-sm mt-2" />
            </div>

            <div className={`${card} text-sm space-y-1.5`}>
              <div className="flex justify-between"><span>{boxes} boxes x {days.length} days x {rupees(item?.price || 0)}</span><span>{rupees(gross)}</span></div>
              {discount > 0 && <div className="flex justify-between text-basil"><span>Weekly plan saving ({Math.round(info.discountPct)}%)</span><span>−{rupees(discount)}</span></div>}
              <div className="flex justify-between"><span>GST ({gstPercent}%)</span><span>{rupees(wk.gst)}</span></div>
              <div className="flex justify-between font-bold text-base border-t border-line pt-2"><span>Per week (incl. GST)</span><span>{rupees(wk.total)}</span></div>
            </div>
            <p className="text-xs text-ink/50">First delivery {info.firstDelivery ? longDate(info.firstDelivery) : "soon"} or the next day you picked. Skip or pause before 6 PM the day before.</p>
            <button disabled={saving} onClick={start} className="w-full bg-saffron text-charcoal rounded-xl py-3.5 font-bold disabled:opacity-60">
              {saving ? "Starting…" : "Start weekly plan"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
