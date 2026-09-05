"use client";

import { useEffect, useState } from "react";
import PartnerShell from "@/components/PartnerShell";
import { api } from "@/lib/api";

const STATUS_COLORS = {
  PENDING: "text-saffron2",
  CONFIRMED: "text-blue-600",
  PREPARING: "text-saffron2",
  OUT_FOR_DELIVERY: "text-blue-600",
  DELIVERED: "text-basil",
  CANCELLED: "text-chili",
};

export default function PartnerOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.myBrandOrders().then((d) => setOrders(d.orders)).catch((e) => setError(e.message));
  }, []);

  return (
    <PartnerShell>
      <h1 className="font-display text-2xl text-ink mb-1">Orders</h1>
      <p className="text-sm text-ink/50 mb-6">
        Orders containing your items — only your own line items are shown, even when a customer
        orders from multiple brands in one cart
      </p>

      {error && <p className="text-chili text-sm mb-4">{error}</p>}

      <div className="space-y-3">
        {orders.map((order) => (
          <div key={order.id} className="bg-white border border-line rounded-sm p-4">
            <div className="flex items-center gap-3 mb-1">
              <span className={`ticket-pill ${STATUS_COLORS[order.status]}`}>
                {order.status.replace(/_/g, " ")}
              </span>
              <span className="font-mono text-xs text-ink/40">#{order.id.slice(0, 8)}</span>
              <span className="text-xs text-ink/40">{new Date(order.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="font-medium text-ink">{order.user.name} · {order.user.phone}</div>
            <ul className="text-sm text-ink/70 mt-2">
              {order.items.map((item) => (
                <li key={item.id}>
                  {item.quantity}× {item.menuItem.name} — ₹{(item.price * item.quantity).toFixed(0)}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {orders.length === 0 && <p className="text-sm text-ink/40">No orders yet.</p>}
      </div>
    </PartnerShell>
  );
}
