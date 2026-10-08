"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

// Polls for pending orders while the dashboard is open and shouts when a new
// one lands: a beep, a banner, and a desktop notification if allowed. This
// works even without Firebase/WhatsApp being set up, so the kitchen desk
// never misses an order while the page is open.
function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    [880, 1175].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.connect(gain); gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.16);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.17);
    });
  } catch { /* audio blocked until first click - fine */ }
}

export default function NewOrderWatcher() {
  const seen = useRef(null);
  const [fresh, setFresh] = useState([]);

  useEffect(() => {
    let stop = false;
    async function tick() {
      try {
        const { orders } = await api.listOrders("PENDING");
        const ids = new Set(orders.map((o) => o.id));
        if (seen.current === null) {
          seen.current = ids; // first load: don't alert for old orders
        } else {
          const added = orders.filter((o) => !seen.current.has(o.id));
          if (added.length && !stop) {
            beep();
            setFresh((f) => [...added, ...f].slice(0, 4));
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              try { new Notification(`New order - Rs ${Math.round(added[0].totalAmount)}`, { body: `${added.length} new order(s) waiting`, icon: "/logo.png" }); } catch { /* ignore */ }
            }
          }
          seen.current = ids;
        }
      } catch { /* offline / token expired - ignore */ }
    }
    tick();
    const t = setInterval(tick, 20000);
    return () => { stop = true; clearInterval(t); };
  }, []);

  if (!fresh.length) return null;
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 w-80">
      {fresh.map((o) => (
        <div key={o.id} className="bg-charcoal text-paper border-l-4 border-saffron shadow-xl rounded-sm px-4 py-3 text-sm">
          <div className="font-medium">New order · ₹{Math.round(o.totalAmount)}</div>
          <div className="text-white/60 text-xs mb-2">#{o.id.slice(0, 8)} · {o.user?.name || "Customer"}</div>
          <div className="flex gap-3 text-xs">
            <Link href="/orders" className="text-saffron hover:underline" onClick={() => setFresh([])}>View orders</Link>
            <button onClick={() => setFresh((f) => f.filter((x) => x.id !== o.id))} className="text-white/50 hover:text-white">Dismiss</button>
          </div>
        </div>
      ))}
    </div>
  );
}
