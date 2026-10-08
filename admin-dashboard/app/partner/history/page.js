"use client";

import { useEffect, useState } from "react";
import PartnerShell from "@/components/PartnerShell";
import { api } from "@/lib/api";
import OrderCard from "@/components/PartnerOrderCard";

export default function PartnerHistoryPage() {
  const [orders, setOrders] = useState([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  function load() {
    setError("");
    api.myBrandOrdersView("history", from, to).then((d) => { setOrders(d.orders); setLoaded(true); }).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  const delivered = orders.filter((o) => o.status === "DELIVERED");
  const total = delivered.reduce((s, o) => s + o.brandTotal, 0);

  return (
    <PartnerShell>
      <h1 className="font-display text-2xl text-ink mb-1">Order History</h1>
      <p className="text-sm text-ink/50 mb-6">Delivered and cancelled orders for your items</p>

      <div className="flex items-end gap-3 mb-4">
        <div>
          <label className="block text-xs font-mono uppercase text-ink/50 mb-1">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-3 py-2 border border-line rounded-sm text-sm bg-white" />
        </div>
        <div>
          <label className="block text-xs font-mono uppercase text-ink/50 mb-1">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-3 py-2 border border-line rounded-sm text-sm bg-white" />
        </div>
        <button onClick={load} className="bg-charcoal text-paper text-sm px-4 py-2 rounded-sm">Apply</button>
      </div>

      {error && <p className="text-chili text-sm mb-4">{error}</p>}
      {loaded && (
        <div className="grid grid-cols-3 gap-4 mb-5 max-w-3xl">
          <div className="bg-white border border-line rounded-sm p-4"><div className="text-xs font-mono uppercase text-ink/50">Orders</div><div className="font-display text-xl">{orders.length}</div></div>
          <div className="bg-white border border-line rounded-sm p-4"><div className="text-xs font-mono uppercase text-ink/50">Delivered</div><div className="font-display text-xl text-basil">{delivered.length}</div></div>
          <div className="bg-white border border-line rounded-sm p-4"><div className="text-xs font-mono uppercase text-ink/50">Delivered value</div><div className="font-display text-xl">₹{total.toFixed(0)}</div></div>
        </div>
      )}
      <div className="space-y-3 max-w-3xl">
        {orders.map((o) => <OrderCard key={o.id} order={o} />)}
        {loaded && orders.length === 0 && <p className="text-sm text-ink/40">No past orders in this range.</p>}
      </div>
    </PartnerShell>
  );
}
