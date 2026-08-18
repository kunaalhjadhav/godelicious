"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

const STATUS_COLORS = {
  PENDING: "text-saffron2",
  CONFIRMED: "text-blue-600",
  PREPARING: "text-saffron2",
  OUT_FOR_DELIVERY: "text-blue-600",
  DELIVERED: "text-basil",
  CANCELLED: "text-chili",
};

export default function OrdersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (user) api.myOrders().then((d) => setOrders(d.orders)).catch(() => {});
  }, [user]);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-paper">
      <Nav />
      <div className="max-w-3xl mx-auto px-5 py-10">
        <h1 className="font-display text-2xl text-ink mb-6">My orders</h1>

        {orders.length === 0 ? (
          <p className="text-ink/50">You haven't placed any orders yet.</p>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block bg-white border border-line rounded-sm p-4 hover:border-saffron2"
              >
                <div className="flex justify-between mb-1">
                  <span className={`ticket-pill ${STATUS_COLORS[order.status]}`}>
                    {order.status.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-ink/40">{new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-ink/70">
                  {order.items.map((i) => `${i.quantity}× ${i.menuItem.name}`).join(", ")}
                </p>
                <p className="font-mono font-medium text-ink mt-1">₹{order.totalAmount.toFixed(0)}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
