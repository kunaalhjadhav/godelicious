"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

const STATUS_COLORS = {
  PENDING: "text-saffron2",
  CONFIRMED: "text-blue-600",
  PREPARING: "text-saffron2",
  OUT_FOR_DELIVERY: "text-blue-600",
  DELIVERED: "text-basil",
  CANCELLED: "text-chili",
};

const NEXT_STATUS = {
  PENDING: "CONFIRMED",
  CONFIRMED: "PREPARING",
  PREPARING: "OUT_FOR_DELIVERY",
  OUT_FOR_DELIVERY: "DELIVERED",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(null);
  const [partners, setPartners] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState({}); // { [orderId]: partnerId }

  function load() {
    api
      .listOrders(filter)
      .then((data) => setOrders(data.orders))
      .catch((e) => setError(e.message));
  }

  useEffect(load, [filter]);
  useEffect(() => {
    api.listActiveDeliveryPartners().then((d) => setPartners(d.partners)).catch(() => {});
  }, []);

  // Formats a phone number for a wa.me link — strips everything but digits,
  // and assumes India (+91) if no country code looks present (10-digit number).
  function toWhatsAppNumber(phone) {
    const digits = (phone || "").replace(/\D/g, "");
    if (digits.length === 10) return `91${digits}`;
    return digits;
  }

  function buildOrderMessage(order) {
    const mapsLink = order.latitude && order.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryAddress)}`;

    const itemLines = order.items.map((i) => `${i.quantity}x ${i.menuItem.name}`).join("\n");
    const addonLines = (order.addons || []).map((a) => `${a.quantity}x ${a.addon.name} (add-on)`).join("\n");

    return [
      `*New Delivery — Order #${order.id.slice(0, 8)}*`,
      ``,
      `Customer: ${order.user.name}`,
      `Phone: ${order.user.phone}`,
      `Address: ${order.deliveryAddress}`,
      `Directions: ${mapsLink}`,
      ``,
      `Payment: ${order.paymentMethod} — ${order.paymentStatus}`,
      ``,
      `Items:`,
      itemLines,
      addonLines,
      ``,
      `Total: ₹${order.totalAmount.toFixed(0)}`,
    ].filter(Boolean).join("\n");
  }

  async function forwardOrder(order) {
    const partnerId = selectedPartner[order.id];
    if (!partnerId) {
      setError("Pick a delivery partner first.");
      return;
    }
    const partner = partners.find((p) => p.id === partnerId);
    if (!partner) return;

    const message = buildOrderMessage(order);
    const waNumber = toWhatsAppNumber(partner.phone);
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`, "_blank");

    try {
      await api.forwardOrderToPartner(order.id, partnerId);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function advance(order) {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    setUpdating(order.id);
    try {
      await api.updateOrderStatus(order.id, next);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setUpdating(null);
    }
  }

  async function cancel(order) {
    if (!confirm(`Cancel order for ${order.user.name}? Stock will be restored.`)) return;
    setUpdating(order.id);
    try {
      await api.updateOrderStatus(order.id, "CANCELLED");
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setUpdating(null);
    }
  }

  async function confirmCod(order) {
    if (!confirm(`Confirm that ₹${order.totalAmount.toFixed(0)} cash was collected for order #${order.id.slice(0, 8)}?`)) return;
    setUpdating(order.id);
    try {
      await api.confirmCod(order.id);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setUpdating(null);
    }
  }

  return (
    <Shell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-ink mb-1">Orders</h1>
          <p className="text-sm text-ink/50">Kitchen ticket rail — advance orders as they're worked</p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-line rounded-sm px-3 py-1.5 text-sm bg-white"
        >
          <option value="">All statuses</option>
          {Object.keys(STATUS_COLORS).map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-chili text-sm mb-4">{error}</p>}

      <div className="space-y-3">
        {orders.map((order) => (
          <div key={order.id} className="card-surface p-4 flex items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <span className={`ticket-pill ${STATUS_COLORS[order.status]}`}>
                  {order.status.replace(/_/g, " ")}
                </span>
                <span className="font-mono text-xs text-ink/40">#{order.id.slice(0, 8)}</span>
                <span className={`text-xs font-mono px-1.5 py-0.5 rounded-sm ${order.paymentStatus === "PAID" ? "bg-basil/10 text-basil" : "bg-saffron/10 text-saffron2"}`}>
                  {order.paymentMethod} · {order.paymentStatus}
                </span>
                {order.deliveryPartner && (
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded-sm bg-blue-50 text-blue-700">
                    → {order.deliveryPartner.name}
                  </span>
                )}
              </div>
              <div className="font-medium text-ink">{order.user.name} · {order.user.phone}</div>
              <div className="text-sm text-ink/60">
                <a
                  href={order.latitude && order.longitude
                    ? `https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryAddress)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="hover:text-saffron2 hover:underline"
                >
                  📍 {order.deliveryAddress}
                </a>
              </div>
              <div className="text-xs text-ink/40 mt-0.5">
                Placed {new Date(order.createdAt).toLocaleString()}
              </div>
              {order.eventDate && (
                <div className="mt-1 text-xs">
                  <span className="bg-basil/15 text-basil px-2 py-0.5 rounded-sm font-mono">
                    Delivery: {new Date(order.eventDate).toLocaleDateString()}{order.eventTime ? ` · ${order.eventTime}` : ""}
                  </span>
                  {order.guestCount ? <span className="text-ink/50 ml-2">{order.guestCount} guests</span> : null}
                </div>
              )}
              {order.orderType && (
                <div className="mt-1 text-xs">
                  <span className="bg-charcoal text-paper px-2 py-0.5 rounded-sm font-mono">{order.orderType.name}</span>
                </div>
              )}
              <ul className="text-sm text-ink/70 mt-2">
                {order.items.map((item) => (
                  <li key={item.id}>
                    {item.menuItem.soldByWeight ? `${item.quantity}g` : `${item.quantity}×`} {item.menuItem.name} — ₹{(item.price * item.quantity).toFixed(0)}
                  </li>
                ))}
                {order.needsStaff && (
                  <li>{order.staffCount} staff requested — ₹{order.staffCost.toFixed(0)}</li>
                )}
                {order.addons?.map((oa) => (
                  <li key={oa.id}>
                    {oa.quantity}× {oa.addon.name} (add-on) — ₹{(oa.price * oa.quantity).toFixed(0)}
                  </li>
                ))}
                {order.discountAmount > 0 && (
                  <li className="text-basil">
                    Discount {order.couponCode ? `(${order.couponCode})` : ""} — −₹{order.discountAmount.toFixed(0)}
                  </li>
                )}
              </ul>
              <div className="mt-2 font-mono text-sm text-ink font-medium">
                Total: ₹{order.totalAmount.toFixed(0)}
              </div>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              {partners.length > 0 && (
                <div className="flex gap-1">
                  <select
                    value={selectedPartner[order.id] || ""}
                    onChange={(e) => setSelectedPartner({ ...selectedPartner, [order.id]: e.target.value })}
                    className="text-xs border border-line rounded-sm px-1.5 py-1.5 bg-white max-w-[120px]"
                  >
                    <option value="">Partner…</option>
                    {partners.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => forwardOrder(order)}
                    className="bg-[#25D366] text-white text-xs px-2.5 py-1.5 rounded-sm whitespace-nowrap"
                    title="Opens WhatsApp with order details pre-filled"
                  >
                    Forward
                  </button>
                </div>
              )}
              {order.paymentMethod === "COD" && order.paymentStatus !== "PAID" && (
                <button
                  onClick={() => confirmCod(order)}
                  disabled={updating === order.id}
                  className="bg-basil text-white text-xs px-3 py-1.5 rounded-sm disabled:opacity-50"
                >
                  Confirm COD payment
                </button>
              )}
              {NEXT_STATUS[order.status] && (
                <button
                  onClick={() => advance(order)}
                  disabled={updating === order.id}
                  className="btn-primary text-xs disabled:opacity-50"
                >
                  Mark {NEXT_STATUS[order.status].replace(/_/g, " ")}
                </button>
              )}
              {!["DELIVERED", "CANCELLED"].includes(order.status) && (
                <button
                  onClick={() => cancel(order)}
                  disabled={updating === order.id}
                  className="text-chili text-xs px-3 py-1.5 border border-chili/30 rounded-sm hover:bg-chili/5 disabled:opacity-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))}
        {orders.length === 0 && <p className="text-sm text-ink/40">No orders found.</p>}
      </div>
    </Shell>
  );
}
