"use client";

import { useEffect, useState } from "react";
import PartnerShell from "@/components/PartnerShell";
import { api } from "@/lib/api";
import OrderCard from "@/components/PartnerOrderCard";

export default function PartnerOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  function load() {
    api.myBrandOrdersView("active").then((d) => { setOrders(d.orders); setLoaded(true); }).catch((e) => setError(e.message));
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 30000); // pick up new orders without a refresh
    return () => clearInterval(t);
  }, []);

  return (
    <PartnerShell>
      <h1 className="font-display text-2xl text-ink mb-1">Orders</h1>
      <p className="text-sm text-ink/50 mb-6">
        Live orders containing your items, soonest delivery first. Only your own line items are shown.
        Finished and cancelled orders are under Order History.
      </p>
      {error && <p className="text-chili text-sm mb-4">{error}</p>}
      <div className="space-y-3 max-w-3xl">
        {orders.map((o) => <OrderCard key={o.id} order={o} />)}
        {loaded && orders.length === 0 && <p className="text-sm text-ink/40">No active orders right now.</p>}
      </div>
    </PartnerShell>
  );
}
