"use client";

// Live map of riders and active orders. Leaflet + OpenStreetMap, loaded from a CDN (no API key).
import { useEffect, useRef, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

const CENTER = [12.322983, 76.616]; // Vijayanagar, Mysuru
const STATUS_COLOR = { PENDING: "#C1443B", CONFIRMED: "#E8A33D", PREPARING: "#C97F1F", OUT_FOR_DELIVERY: "#2F5233" };

function loadLeaflet() {
  if (typeof window === "undefined") return Promise.reject();
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
const mins = (d) => (d ? Math.round((Date.now() - new Date(d).getTime()) / 60000) : null);
const code = (id) => String(id).slice(0, 8).toUpperCase();

export default function LiveMapPage() {
  const box = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);
  const fitted = useRef(false);
  const [data, setData] = useState({ riders: [], orders: [] });
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    loadLeaflet().then((L) => {
      if (!alive || map.current || !box.current) return;
      map.current = L.map(box.current).setView(CENTER, 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map.current);
      layer.current = L.layerGroup().addTo(map.current);
    }).catch(() => setError("Could not load the map."));
    const pull = () => api.liveRiders().then((d) => alive && setData(d)).catch((e) => setError(e.message));
    pull();
    const t = setInterval(pull, 10000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  useEffect(() => {
    const L = typeof window !== "undefined" && window.L;
    if (!L || !layer.current) return;
    layer.current.clearLayers();
    const pts = [];
    for (const o of data.orders) {
      if (o.latitude == null || o.longitude == null) continue;
      pts.push([o.latitude, o.longitude]);
      L.circleMarker([o.latitude, o.longitude], { radius: 8, color: "#fff", weight: 2, fillColor: STATUS_COLOR[o.status] || "#666", fillOpacity: 1 })
        .bindPopup(`<b>#${code(o.id)}</b> · ${o.user?.name || ""}<br/>${o.status.replace(/_/g, " ")}<br/>${o.deliveryAddress || ""}`)
        .addTo(layer.current);
    }
    for (const r of data.riders) {
      if (r.lastLat == null || r.lastLng == null) continue;
      const stale = mins(r.lastSeenAt) > 5;
      pts.push([r.lastLat, r.lastLng]);
      const icon = L.divIcon({
        className: "",
        html: `<div style="background:${r.isOnline && !stale ? "#2F5233" : "#888"};color:#fff;border-radius:14px;padding:3px 8px;font:600 12px Inter,sans-serif;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.4)">🛵 ${r.name.split(" ")[0]}</div>`,
        iconAnchor: [20, 12],
      });
      const mine = data.orders.filter((o) => o.deliveryPartnerId === r.id).map((o) => `#${code(o.id)}`).join(", ");
      L.marker([r.lastLat, r.lastLng], { icon })
        .bindPopup(`<b>${r.name}</b> · ${r.phone}<br/>${r.isOnline ? "On duty" : "Off duty"} · seen ${mins(r.lastSeenAt)} min ago${mine ? `<br/>Orders: ${mine}` : ""}`)
        .addTo(layer.current);
    }
    if (!fitted.current && pts.length) { map.current.fitBounds(pts, { padding: [40, 40], maxZoom: 15 }); fitted.current = true; }
  }, [data]);

  const byId = Object.fromEntries(data.riders.map((r) => [r.id, r]));
  const unassigned = data.orders.filter((o) => !o.deliveryPartnerId);
  return (
    <Shell>
      <h1 className="font-display text-2xl text-ink mb-1">Live Rider Map</h1>
      <p className="text-sm text-ink/50 mb-4">Updates every 10 seconds. Green tags are riders on duty; dots are active orders (red new, yellow confirmed/preparing, green out for delivery).</p>
      {error && <p className="text-chili text-sm mb-3">{error}</p>}
      <div className="grid grid-cols-3 gap-4">
        <div ref={box} className="col-span-2 h-[70vh] rounded-sm border border-line bg-white z-0" />
        <div className="space-y-4 overflow-y-auto h-[70vh]">
          <div className="card-surface p-4">
            <h2 className="font-display text-lg mb-2">Riders</h2>
            {data.riders.length === 0 && <p className="text-sm text-ink/50">No approved riders yet.</p>}
            {data.riders.map((r) => (
              <button key={r.id} onClick={() => r.lastLat && map.current?.setView([r.lastLat, r.lastLng], 16)}
                className="w-full text-left py-2 border-b border-line last:border-0 text-sm flex justify-between">
                <span>{r.isOnline ? "🟢" : "⚪"} {r.name}</span>
                <span className="text-xs text-ink/50">{r.lastSeenAt ? `${mins(r.lastSeenAt)} min` : "no GPS yet"}</span>
              </button>
            ))}
          </div>
          <div className="card-surface p-4">
            <h2 className="font-display text-lg mb-2">Active orders</h2>
            {data.orders.length === 0 && <p className="text-sm text-ink/50">None right now.</p>}
            {data.orders.map((o) => (
              <div key={o.id} className="py-2 border-b border-line last:border-0 text-sm">
                <div className="flex justify-between">
                  <span className="font-mono">#{code(o.id)}</span>
                  <span className="text-xs" style={{ color: STATUS_COLOR[o.status] }}>{o.status.replace(/_/g, " ")}</span>
                </div>
                <div className="text-xs text-ink/60">
                  {o.deliveryPartnerId ? `🛵 ${byId[o.deliveryPartnerId]?.name || "rider"}${o.assignStatus === "OFFERED" ? " (waiting)" : ""}` : "No rider yet"}
                </div>
              </div>
            ))}
            {unassigned.length > 0 && <p className="text-xs text-saffron2 mt-2">{unassigned.length} order(s) need a rider — assign them in Orders.</p>}
          </div>
        </div>
      </div>
    </Shell>
  );
}
