"use client";

// Godelicious Rider: the delivery partner app (works as a mobile web app; "Add to Home screen").
// Go online -> get order offers -> accept -> navigate -> picked up -> deliver with the customer's code.
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { api, API_URL } from "@/lib/api";
import { APP_NAME } from "@/lib/brand";

const rs = (n) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
const fileUrl = (u) => (!u ? "" : u.startsWith("/") ? `${API_URL}${u}` : u);
const mapsTo = (o) =>
  o.latitude && o.longitude
    ? `https://www.google.com/maps/dir/?api=1&destination=${o.latitude},${o.longitude}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(o.deliveryAddress || "")}`;
const when = (o) => {
  const d = o.eventDate ? new Date(o.eventDate) : null;
  return [d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "", o.eventTime || ""].filter(Boolean).join(", ");
};

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.35, 0.7].forEach((t) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.25, ctx.currentTime + t); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.2);
    });
    navigator.vibrate?.([300, 150, 300, 150, 300]);
  } catch {}
}

export default function RiderApp() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState("home");
  const [me, setMe] = useState(null);
  const [orders, setOrders] = useState({ offers: [], active: [], recent: [] });
  const [error, setError] = useState("");
  const [gps, setGps] = useState("off"); // off | asking | on | denied
  const seenOffers = useRef(new Set());
  const first = useRef(true);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/rider/login");
    else if (user.role !== "DELIVERY_PARTNER") router.replace("/dashboard");
  }, [user, loading, router]);

  const refresh = useCallback(async () => {
    try {
      const [m, o] = await Promise.all([api.riderMe(), api.riderOrders()]);
      setMe(m); setOrders(o); setError("");
      const fresh = o.offers.filter((x) => !seenOffers.current.has(x.id));
      fresh.forEach((x) => seenOffers.current.add(x.id));
      if (fresh.length && !first.current) beep();
      first.current = false;
    } catch (err) { setError(err.message); }
  }, []);

  const ready = user?.role === "DELIVERY_PARTNER";
  useEffect(() => {
    if (!ready) return;
    refresh();
    const t = setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 10000);
    return () => clearInterval(t);
  }, [ready, refresh]);

  const online = Boolean(me?.partner?.isOnline);

  // Live location while online: watch the GPS, send at most every 12 seconds. Keep the screen awake.
  useEffect(() => {
    if (!online || !navigator.geolocation) { setGps("off"); return; }
    setGps("asking");
    let last = 0, wake = null;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setGps("on");
        if (Date.now() - last < 12000) return;
        last = Date.now();
        api.riderLocation(pos.coords.latitude, pos.coords.longitude).catch(() => {});
      },
      () => setGps("denied"),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 },
    );
    const lock = async () => { try { wake = await navigator.wakeLock?.request("screen"); } catch {} };
    lock();
    const onVis = () => document.visibilityState === "visible" && lock();
    document.addEventListener("visibilitychange", onVis);
    return () => { navigator.geolocation.clearWatch(id); wake?.release?.().catch?.(() => {}); document.removeEventListener("visibilitychange", onVis); };
  }, [online]);

  async function toggleOnline() {
    try { await api.riderOnline(!online); await refresh(); } catch (err) { setError(err.message); }
  }

  if (!ready || !me) {
    return <div className="min-h-screen flex items-center justify-center bg-paper text-ink/50">{error || "Loading…"}</div>;
  }
  const p = me.partner;
  const docsMissing = ["photoUrl", "licenceUrl", "rcUrl", "idProofUrl"].filter((k) => !p[k]).length;

  return (
    <div className="min-h-screen bg-paper pb-24 max-w-lg mx-auto">
      <header className={`px-4 pt-5 pb-4 text-white ${online ? "bg-basil" : "bg-charcoal"}`}>
        <div className="flex items-center gap-3">
          {p.photoUrl ? <img src={fileUrl(p.photoUrl)} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-white/30" />
            : <div className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center font-semibold">{p.name?.[0]}</div>}
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{p.name}</div>
            <div className="text-xs text-white/70">{p.vehicleType || "Rider"} {p.vehicleNumber ? `· ${p.vehicleNumber}` : ""}</div>
          </div>
          <button onClick={toggleOnline} disabled={p.status !== "APPROVED"}
            className={`relative w-[104px] h-10 rounded-full text-xs font-bold transition disabled:opacity-40 ${online ? "bg-white text-basil" : "bg-white/15 text-white"}`}>
            <span className={`absolute top-1 w-8 h-8 rounded-full transition-all ${online ? "left-[68px] bg-basil" : "left-1 bg-white/70"}`} />
            <span className={online ? "pr-8" : "pl-8"}>{online ? "ON DUTY" : "OFF DUTY"}</span>
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          <Stat label="Today's trips" value={me.today.deliveries} />
          <Stat label="Earned" value={rs(me.today.earnings)} />
          <Stat label="Cash in hand" value={rs(me.today.cash)} />
        </div>
      </header>

      {p.status === "PENDING" && <Banner tone="saffron">Your account is under review. {docsMissing ? `Upload your ${docsMissing} missing document${docsMissing > 1 ? "s" : ""} in Profile to get approved faster.` : "We'll message you on WhatsApp once approved."}</Banner>}
      {p.status === "SUSPENDED" && <Banner tone="chili">Your account is paused. Please call Godelicious.</Banner>}
      {online && gps === "denied" && <Banner tone="chili">Location is blocked. Allow location for this site in your browser settings so customers can track you.</Banner>}
      {online && gps === "on" && <Banner tone="basil">Sharing live location. Keep this screen open while delivering.</Banner>}
      {error && <Banner tone="chili">{error}</Banner>}

      <main className="px-4 pt-4">
        {tab === "home" && <Home orders={orders} online={online} approved={p.status === "APPROVED"} refresh={refresh} setError={setError} />}
        {tab === "earnings" && <Earnings />}
        {tab === "profile" && <Profile partner={p} refresh={refresh} logout={logout} />}
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-line">
        <div className="max-w-lg mx-auto grid grid-cols-3">
          {[["home", "Orders", orders.offers.length], ["earnings", "Earnings"], ["profile", "Profile", docsMissing]].map(([k, l, n]) => (
            <button key={k} onClick={() => setTab(k)} className={`py-3 text-sm font-medium relative ${tab === k ? "text-basil" : "text-ink/50"}`}>
              {l}
              {n ? <span className="absolute top-2 ml-1 text-[10px] bg-chili text-white rounded-full px-1.5">{n}</span> : null}
              {tab === k && <span className="absolute top-0 inset-x-8 h-0.5 bg-basil" />}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white/10 rounded-lg py-2">
      <div className="text-lg font-bold leading-tight">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-white/60">{label}</div>
    </div>
  );
}

function Banner({ tone, children }) {
  const c = { saffron: "bg-saffron/15 text-saffron2", chili: "bg-chili/10 text-chili", basil: "bg-basil/10 text-basil" }[tone];
  return <div className={`mx-4 mt-3 px-3 py-2 rounded-lg text-sm ${c}`}>{children}</div>;
}

function Home({ orders, online, approved, refresh, setError }) {
  const run = async (fn) => { try { await fn(); await refresh(); } catch (err) { setError(err.message); } };
  const nothing = !orders.offers.length && !orders.active.length;
  return (
    <div className="space-y-4">
      {orders.offers.map((o) => (
        <div key={o.id} className="rounded-xl border-2 border-saffron bg-white shadow-sm overflow-hidden">
          <div className="bg-saffron text-charcoal px-4 py-2 text-sm font-bold flex justify-between">
            <span>New delivery request</span><span>Earn {rs(o.earning)}</span>
          </div>
          <OrderBody o={o} />
          <div className="grid grid-cols-2 gap-2 p-3 pt-0">
            <button onClick={() => { const r = prompt("Reason (optional)") ?? null; if (r !== null) run(() => api.riderReject(o.id, r)); }}
              className="py-3 rounded-lg border border-chili text-chili font-semibold">Reject</button>
            <button onClick={() => run(() => api.riderAccept(o.id))} className="py-3 rounded-lg bg-basil text-white font-semibold">Accept</button>
          </div>
        </div>
      ))}

      {orders.active.map((o) => <ActiveOrder key={o.id} o={o} run={run} />)}

      {nothing && (
        <div className="text-center py-14 text-ink/50">
          <div className="text-5xl mb-3">{online ? "🛵" : "😴"}</div>
          <div className="font-medium text-ink/70">{online ? "Waiting for orders…" : approved ? "You're off duty" : "Not approved yet"}</div>
          <p className="text-sm mt-1">{online ? "New requests ring here and come to your WhatsApp." : approved ? "Switch ON DUTY at the top to start getting orders." : "You'll be able to go on duty once approved."}</p>
        </div>
      )}

      {orders.recent.length > 0 && (
        <div>
          <h3 className="text-xs font-mono uppercase text-ink/50 mb-2 mt-6">Delivered recently</h3>
          <div className="bg-white rounded-xl border border-line divide-y divide-line">
            {orders.recent.map((o) => (
              <div key={o.id} className="px-4 py-3 flex justify-between text-sm">
                <span>#{o.code} · {o.customerName}</span><span className="text-basil font-medium">+{rs(o.earning)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OrderBody({ o }) {
  return (
    <div className="p-4 text-sm">
      <div className="flex justify-between mb-1">
        <span className="font-mono text-ink/60">#{o.code}</span>
        <span className="text-ink/60">{when(o)}</span>
      </div>
      <div className="font-semibold text-ink">{o.customerName}</div>
      <div className="text-ink/70 mt-0.5">{o.deliveryAddress}</div>
      <div className="mt-2 text-ink/60">{o.items.map((i) => `${i.quantity}${i.soldByWeight ? "g" : "×"} ${i.name}`).join(", ")}</div>
      {o.notes && <div className="mt-2 text-xs bg-paper rounded px-2 py-1">Note: {o.notes}</div>}
      <div className={`mt-3 text-sm font-semibold ${o.cashToCollect > 0 ? "text-chili" : "text-basil"}`}>
        {o.cashToCollect > 0 ? `Collect cash ${rs(o.cashToCollect)}` : "Prepaid — no cash to collect"}
      </div>
    </div>
  );
}

function ActiveOrder({ o, run }) {
  const [otp, setOtp] = useState("");
  const [cash, setCash] = useState(o.cashToCollect ? String(Math.round(o.cashToCollect)) : "");
  const out = o.status === "OUT_FOR_DELIVERY";
  return (
    <div className="rounded-xl border border-line bg-white shadow-sm overflow-hidden">
      <div className={`px-4 py-2 text-sm font-bold text-white flex justify-between ${out ? "bg-basil" : "bg-charcoal"}`}>
        <span>{out ? "On the way to customer" : "Go to the kitchen and pick up"}</span><span>{rs(o.earning)}</span>
      </div>
      <OrderBody o={o} />
      <div className="grid grid-cols-2 gap-2 px-3">
        <a href={mapsTo(o)} target="_blank" rel="noreferrer" className="py-2.5 text-center rounded-lg bg-paper border border-line font-medium">Navigate</a>
        <a href={`tel:${o.contactPhone || ""}`} className="py-2.5 text-center rounded-lg bg-paper border border-line font-medium">Call customer</a>
      </div>
      <div className="p-3">
        {!out ? (
          <button onClick={() => run(() => api.riderPickup(o.id))} className="w-full py-3 rounded-lg bg-saffron text-charcoal font-bold">
            Picked up — start delivery
          </button>
        ) : (
          <div className="space-y-2">
            <label className="block text-xs font-mono uppercase text-ink/60">Customer's 4-digit delivery code</label>
            <input inputMode="numeric" maxLength={4} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              className="w-full px-3 py-3 border border-line rounded-lg text-center text-2xl tracking-[0.5em] font-mono" placeholder="••••" />
            {o.cashToCollect > 0 && (
              <>
                <label className="block text-xs font-mono uppercase text-ink/60">Cash collected (₹)</label>
                <input inputMode="decimal" value={cash} onChange={(e) => setCash(e.target.value)} className="w-full px-3 py-3 border border-line rounded-lg text-lg" />
              </>
            )}
            <button disabled={otp.length !== 4} onClick={() => run(() => api.riderDeliver(o.id, otp, Number(cash) || 0))}
              className="w-full py-3 rounded-lg bg-basil text-white font-bold disabled:opacity-40">Complete delivery</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Earnings() {
  const [days, setDays] = useState(7);
  const [d, setD] = useState(null);
  useEffect(() => { api.riderEarnings(days).then(setD).catch(() => setD(null)); }, [days]);
  return (
    <div>
      <div className="flex gap-2 mb-4">
        {[[1, "Today"], [7, "7 days"], [30, "30 days"]].map(([n, l]) => (
          <button key={n} onClick={() => setDays(n)} className={`px-4 py-2 rounded-full text-sm ${days === n ? "bg-charcoal text-white" : "bg-white border border-line"}`}>{l}</button>
        ))}
      </div>
      {!d ? <p className="text-ink/50">Loading…</p> : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[["Trips", d.deliveries], ["Earnings", rs(d.earnings)], ["Cash collected", rs(d.cashCollected)]].map(([l, v]) => (
              <div key={l} className="bg-white border border-line rounded-xl p-3 text-center">
                <div className="text-lg font-bold">{v}</div><div className="text-[10px] uppercase text-ink/50">{l}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-ink/50 mb-3">{rs(d.payPerOrder)} per delivered order. Hand the cash you collect to Godelicious at the end of the day.</p>
          <div className="bg-white rounded-xl border border-line divide-y divide-line">
            {d.orders.length === 0 && <div className="px-4 py-6 text-center text-ink/50 text-sm">No deliveries in this period.</div>}
            {d.orders.map((o) => (
              <div key={o.id} className="px-4 py-3 text-sm flex justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-mono">#{o.code}</div>
                  <div className="text-xs text-ink/50 truncate">{new Date(o.deliveredAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} · {o.deliveryAddress}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-basil font-medium">+{rs(o.earning)}</div>
                  {o.cashCollected > 0 && <div className="text-xs text-ink/50">cash {rs(o.cashCollected)}</div>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const DOCS = [["photoUrl", "Your photo"], ["licenceUrl", "Driving licence"], ["rcUrl", "Vehicle RC"], ["idProofUrl", "Aadhaar / ID proof"]];

function Profile({ partner, refresh, logout }) {
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [veh, setVeh] = useState({ vehicleType: partner.vehicleType || "", vehicleNumber: partner.vehicleNumber || "" });

  async function upload(key, file) {
    if (!file) return;
    setBusy(key); setMsg("");
    try { const { url } = await api.uploadImage(file); await api.riderUpdate({ [key]: url }); await refresh(); setMsg("Uploaded."); }
    catch (err) { setMsg(err.message); } finally { setBusy(""); }
  }
  async function saveVehicle() {
    try { await api.riderUpdate(veh); await refresh(); setMsg("Saved."); } catch (err) { setMsg(err.message); }
  }

  const statusTone = { APPROVED: "bg-basil/10 text-basil", PENDING: "bg-saffron/15 text-saffron2", SUSPENDED: "bg-chili/10 text-chili" }[partner.status];
  return (
    <div className="space-y-4">
      <div className="bg-white border border-line rounded-xl p-4">
        <div className="flex justify-between items-center">
          <div><div className="font-semibold">{partner.name}</div><div className="text-sm text-ink/60">{partner.phone}</div></div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusTone}`}>{partner.status}</span>
        </div>
      </div>

      <div className="bg-white border border-line rounded-xl p-4">
        <h3 className="font-semibold mb-3">Vehicle</h3>
        <div className="grid grid-cols-2 gap-2">
          <input value={veh.vehicleType} onChange={(e) => setVeh({ ...veh, vehicleType: e.target.value })} placeholder="Bike" className="px-3 py-2 border border-line rounded-lg" />
          <input value={veh.vehicleNumber} onChange={(e) => setVeh({ ...veh, vehicleNumber: e.target.value.toUpperCase() })} placeholder="KA09 AB 1234" className="px-3 py-2 border border-line rounded-lg" />
        </div>
        <button onClick={saveVehicle} className="mt-3 px-4 py-2 rounded-lg bg-charcoal text-white text-sm">Save</button>
      </div>

      <div className="bg-white border border-line rounded-xl p-4">
        <h3 className="font-semibold mb-1">Documents</h3>
        <p className="text-xs text-ink/50 mb-3">Clear photos, all four needed for approval.</p>
        <div className="grid grid-cols-2 gap-3">
          {DOCS.map(([k, l]) => (
            <label key={k} className="block border border-dashed border-line rounded-lg p-2 text-center cursor-pointer">
              {partner[k] ? <img src={fileUrl(partner[k])} alt={l} className="h-24 w-full object-cover rounded" />
                : <div className="h-24 flex items-center justify-center text-3xl text-ink/30">+</div>}
              <div className="text-xs mt-1 font-medium">{busy === k ? "Uploading…" : l}</div>
              <div className={`text-[10px] ${partner[k] ? "text-basil" : "text-chili"}`}>{partner[k] ? "Uploaded · tap to replace" : "Missing"}</div>
              <input type="file" accept="image/*" capture={k === "photoUrl" ? "user" : "environment"} className="hidden" onChange={(e) => upload(k, e.target.files?.[0])} />
            </label>
          ))}
        </div>
        {msg && <p className="text-sm mt-3 text-ink/70">{msg}</p>}
      </div>

      <div className="bg-white border border-line rounded-xl p-4 text-sm text-ink/70">
        <h3 className="font-semibold text-ink mb-2">Install on your phone</h3>
        Android (Chrome): menu ⋮ → <b>Add to Home screen</b>. iPhone (Safari): Share → <b>Add to Home Screen</b>.
        Keep the app open while on duty so customers can follow you on the map.
      </div>

      <button onClick={logout} className="w-full py-3 rounded-lg border border-chili text-chili font-semibold">Sign out</button>
      <p className="text-center text-xs text-ink/40">{APP_NAME} Rider</p>
    </div>
  );
}
