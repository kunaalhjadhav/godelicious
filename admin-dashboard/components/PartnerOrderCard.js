"use client";

const STATUS_COLORS = {
  PENDING: "text-saffron2",
  CONFIRMED: "text-blue-600",
  PREPARING: "text-saffron2",
  OUT_FOR_DELIVERY: "text-blue-600",
  DELIVERED: "text-basil",
  CANCELLED: "text-chili",
};

function qty(item) {
  return item.menuItem.soldByWeight ? `${item.quantity}g` : `${item.quantity}×`;
}

export function OrderCard({ order }) {
  const when = order.eventDate
    ? `${new Date(order.eventDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}${order.eventTime ? ` · ${order.eventTime}` : ""}`
    : null;
  return (
    <div className="bg-white border border-line rounded-sm p-4">
      <div className="flex items-center gap-3 mb-1 flex-wrap">
        <span className={`ticket-pill ${STATUS_COLORS[order.status]}`}>{order.status.replace(/_/g, " ")}</span>
        <span className="font-mono text-xs text-ink/40">#{order.id.slice(0, 8)}</span>
        <span className="text-xs text-ink/40">placed {new Date(order.createdAt).toLocaleDateString("en-IN")}</span>
        <span className="ml-auto font-mono text-sm text-ink">₹{order.brandTotal.toFixed(0)}</span>
      </div>
      {when && <div className="text-sm text-saffron2 font-medium">Deliver on {when}</div>}
      <div className="font-medium text-ink mt-1">{order.user?.name} · {order.contactPhone || order.user?.phone}</div>
      <ul className="text-sm text-ink/70 mt-2">
        {order.items.map((item) => (
          <li key={item.id}>{qty(item)} {item.menuItem.name} — ₹{(item.price * item.quantity).toFixed(0)}</li>
        ))}
      </ul>
      {order.notes && <div className="text-xs text-ink/50 mt-2">Note: {order.notes}</div>}
    </div>
  );
}

export default OrderCard;
