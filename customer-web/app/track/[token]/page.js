"use client";

// Public live tracking page: godelicious.in/track/<token> (link sent on WhatsApp and shown in the order).
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const STEPS = [["CONFIRMED", "Confirmed"], ["PREPARING", "Preparing"], ["OUT_FOR_DELIVERY", "On the way"], ["DELIVERED", "Delivered"]];

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  return new Promise((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet"; css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);
    const s = document.createElement("script");
    s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.onload = () => resolve(window.L); s.onerror = reject;
    document.body.appendChild(s);
  });
}
function km(a, b) {
  const R = 6371, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export default function TrackPage() {
  const { token } = useParams();
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  const box = useRef(null), map = useRef(null), riderMk = useRef(null), homeMk = useRef(null), fitted = useRef(false);

  useEffect(() => {
    let alive = true;
    const pull = () => fetch(`${API_URL}/api/track/${token}`).then(async (r) => {
      const j = await r.json().catch(() => ({}));
      if (!alive) return;
      if (!r.ok) setError(j.error || "Tracking link not found."); else { setD(j); setError(""); }
    }).catch(() => alive && setError("Can't reach Godelicious right now. Retrying…"));
    pull();
    const t = setInterval(pull, 10000);
    return () => { alive = false; clearInterval(t); };
  }, [token]);

  const loc = d?.rider?.location;
  const dest = d?.destination;
  useEffect(() => {
    if (!d || (!loc && !dest)) return;
    loadLeaflet().then((L) => {
      if (!box.current) return;
      if (!map.current) {
        map.current = L.map(box.current, { zoomControl: false }).setView([(loc || dest).lat, (loc || dest).lng], 15);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map.current);
      }
      if (dest && !homeMk.current) {
        homeMk.current = L.marker([dest.lat, dest.lng], { icon: L.divIcon({ className: "", html: '<div style="font-size:28px;line-height:1">📍</div>', iconAnchor: [14, 28] }) }).addTo(map.current);
      }
      if (loc) {
        const icon = L.divIcon({ className: "", html: '<div style="font-size:30px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))">🛵</div>', iconAnchor: [15, 15] });
        if (!riderMk.current) riderMk.current = L.marker([loc.lat, loc.lng], { icon }).addTo(map.current);
        else riderMk.current.setLatLng([loc.lat, loc.lng]);
      }
      if (!fitted.current && loc && dest) { map.current.fitBounds([[loc.lat, loc.lng], [dest.lat, dest.lng]], { padding: [50, 50], maxZoom: 16 }); fitted.current = true; }
    }).catch(() => {});
  }, [d, loc, dest]);

  if (error && !d) return <div className="min-h-screen flex items-center justify-center bg-paper px-6 text-center text-ink/60">{error}</div>;
  if (!d) return <div className="min-h-screen flex items-center justify-center bg-paper text-ink/50">Loading…</div>;

  const idx = STEPS.findIndex(([s]) => s === d.status);
  const dist = loc && dest ? km(loc, dest) : null;
  const eta = dist != null ? Math.max(2, Math.round((dist * 1.3) / 22 * 60)) : null; // road factor 1.3, ~22 km/h in town
  const seenMin = loc?.at ? Math.round((Date.now() - new Date(loc.at).getTime()) / 60000) : null;
  const headline = {
    PENDING: "Order received", CONFIRMED: "Order confirmed", PREPARING: "Your food is being prepared",
    OUT_FOR_DELIVERY: eta ? `Arriving in about ${eta} min` : "On the way", DELIVERED: "Delivered. Enjoy your meal!", CANCELLED: "This order was cancelled",
  }[d.status];

  return (
    <div className="min-h-screen bg-paper flex flex-col max-w-lg mx-auto">
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <img src="/logo.png" alt="Godelicious" className="w-8 h-8 rounded-lg" />
          <span className="font-mono text-xs text-ink/50">Order #{d.code}</span>
        </div>
        <h1 className="font-display text-2xl text-ink">{headline}</h1>
        {dist != null && d.status === "OUT_FOR_DELIVERY" && (
          <p className="text-sm text-ink/60 mt-1">{dist.toFixed(1)} km away{seenMin != null && seenMin > 2 ? ` · location updated ${seenMin} min ago` : ""}</p>
        )}
      </div>

      {(loc || dest) && d.status !== "DELIVERED" && d.status !== "CANCELLED" ? (
        <div ref={box} className="h-[46vh] w-full bg-line z-0" />
      ) : null}

      {d.status !== "CANCELLED" && (
        <div className="flex px-5 py-5">
          {STEPS.map(([s, l], i) => (
            <div key={s} className="flex-1 flex flex-col items-center relative">
              {i > 0 && <div className={`absolute top-2 right-1/2 w-full h-0.5 ${i <= idx ? "bg-basil" : "bg-line"}`} />}
              <div className={`w-4 h-4 rounded-full z-10 ${i <= idx ? "bg-basil" : "bg-line"}`} />
              <span className={`text-[11px] mt-1.5 ${i <= idx ? "text-ink font-medium" : "text-ink/40"}`}>{l}</span>
            </div>
          ))}
        </div>
      )}

      {d.rider && d.status !== "DELIVERED" && (
        <div className="mx-5 mb-4 bg-white border border-line rounded-xl p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-basil/10 flex items-center justify-center text-xl">🛵</div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold">{d.rider.name}</div>
            <div className="text-xs text-ink/50">{d.rider.vehicle || "Godelicious delivery partner"}</div>
          </div>
          <a href={`tel:${d.rider.phone}`} className="px-4 py-2 rounded-full bg-basil text-white text-sm font-medium">Call</a>
        </div>
      )}
      {d.status === "OUT_FOR_DELIVERY" && (
        <p className="mx-5 text-sm text-ink/60">Share your 4-digit delivery code with the rider only when you receive your food. You'll find it on WhatsApp and in your order in the app.</p>
      )}
      <p className="text-center text-xs text-ink/40 mt-auto py-6">Godelicious · Mysuru</p>
    </div>
  );
}
