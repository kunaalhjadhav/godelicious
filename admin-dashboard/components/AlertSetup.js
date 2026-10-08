"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { api } from "@/lib/api";
import { FIREBASE_CONFIGURED, getPushToken } from "@/lib/firebase";

// Small sidebar control: registers this browser for push alerts (new orders,
// approvals, venue requests). If permission was already granted it registers
// silently on load; otherwise shows a button, because browsers only allow the
// permission prompt after a click.
export default function AlertSetup() {
  const [state, setState] = useState("idle"); // idle | on | blocked | off
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!FIREBASE_CONFIGURED || typeof Notification === "undefined") { setState("off"); return; }
    if (Notification.permission === "denied") { setState("blocked"); return; }
    if (Notification.permission === "granted") {
      getPushToken().then((t) => {
        if (t) api.registerDevice(t, "web").then(() => setState("on")).catch(() => {});
      });
    }
  }, []);

  async function enable() {
    setBusy(true);
    const token = await getPushToken({ askPermission: true });
    if (token) {
      try { await api.registerDevice(token, "web"); setState("on"); } catch { /* ignore */ }
    } else if (typeof Notification !== "undefined" && Notification.permission === "denied") {
      setState("blocked");
    }
    setBusy(false);
  }

  if (state === "off") return null;
  if (state === "on") {
    return <div className="flex items-center gap-1.5 text-[11px] text-basil/90 bg-white/5 px-2 py-1 rounded-sm mb-3"><Bell size={12} /> Alerts on</div>;
  }
  if (state === "blocked") {
    return <div className="flex items-center gap-1.5 text-[11px] text-white/50 mb-3"><BellOff size={12} /> Alerts blocked in browser settings</div>;
  }
  return (
    <button onClick={enable} disabled={busy} className="flex items-center gap-1.5 text-[11px] text-saffron border border-saffron/40 px-2 py-1 rounded-sm mb-3 hover:bg-white/5 disabled:opacity-50">
      <Bell size={12} /> {busy ? "Enabling…" : "Turn on alerts"}
    </button>
  );
}
