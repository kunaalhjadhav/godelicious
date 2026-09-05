"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Nav from "@/components/Nav";
import { api } from "@/lib/api";

const STEPS = ["PENDING", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"];

function StarPicker({ value, onChange }) {
  return (
    <div className="flex gap-1 text-2xl">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n} type="button" onClick={() => onChange(n)}
          className={n <= value ? "text-saffron2" : "text-line"}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState("");

  function load() {
    api.getOrder(id).then((d) => setOrder(d.order)).catch((e) => setError(e.message));
  }

  useEffect(load, [id]);

  async function submitReview(e) {
    e.preventDefault();
    if (rating === 0) {
      setReviewError("Please pick a star rating.");
      return;
    }
    setReviewError("");
    setSubmittingReview(true);
    try {
      await api.createReview(order.id, rating, comment);
      load();
    } catch (err) {
      setReviewError(err.message);
    } finally {
      setSubmittingReview(false);
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-paper">
        <Nav />
        <p className="max-w-xl mx-auto px-5 py-10 text-chili text-sm">{error}</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-paper">
        <Nav />
        <p className="max-w-xl mx-auto px-5 py-10 text-ink/40 text-sm">Loading…</p>
      </div>
    );
  }

  const currentStepIndex = STEPS.indexOf(order.status);
  const isCancelled = order.status === "CANCELLED";
  const isDelivered = order.status === "DELIVERED";

  return (
    <div className="min-h-screen bg-paper">
      <Nav />
      <div className="max-w-xl mx-auto px-5 py-10">
        <div className="flex items-center justify-between mb-4">
          <p className="font-mono text-xs text-ink/40">Order #{order.id.slice(0, 8)}</p>
          <span className={`text-xs font-mono px-2 py-0.5 rounded-sm ${order.paymentStatus === "PAID" ? "bg-basil/10 text-basil" : "bg-saffron/10 text-saffron2"}`}>
            {order.paymentMethod} · {order.paymentStatus}
          </span>
        </div>

        {order.orderType && (
          <div className="mb-6">
            <span className="ticket-pill text-saffron2 mb-2 inline-flex">{order.orderType.name}</span>
            {order.eventDate && (
              <p className="text-sm text-ink/60 mt-1">
                {new Date(order.eventDate).toLocaleDateString()}
                {order.eventTime ? ` at ${order.eventTime}` : ""}
                {order.guestCount ? ` · ${order.guestCount} guests` : ""}
              </p>
            )}
          </div>
        )}

        {isCancelled ? (
          <p className="text-chili font-semibold mb-8">This order was cancelled.</p>
        ) : (
          <div className="flex items-center mb-10">
            {STEPS.map((step, idx) => {
              const done = idx <= currentStepIndex;
              return (
                <div key={step} className="flex-1 flex flex-col items-center relative">
                  {idx > 0 && (
                    <div
                      className={`absolute top-2 right-1/2 w-full h-0.5 ${idx <= currentStepIndex ? "bg-basil" : "bg-line"}`}
                    />
                  )}
                  <div className={`w-4 h-4 rounded-full z-10 ${done ? "bg-basil" : "bg-line"}`} />
                  <span className={`text-[10px] mt-2 text-center ${done ? "text-ink font-medium" : "text-ink/40"}`}>
                    {step.replace(/_/g, " ")}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-white border border-line rounded-sm p-5 mb-4">
          <h2 className="font-display text-lg mb-3">Items</h2>
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm py-1">
              <span>{item.quantity}× {item.menuItem.name}</span>
              <span>₹{(item.price * item.quantity).toFixed(0)}</span>
            </div>
          ))}
          {order.needsStaff && (
            <div className="flex justify-between text-sm py-1">
              <span>{order.staffCount} staff</span>
              <span>₹{order.staffCost.toFixed(0)}</span>
            </div>
          )}
          {order.addons?.map((oa) => (
            <div key={oa.id} className="flex justify-between text-sm py-1">
              <span>{oa.quantity}× {oa.addon.name}</span>
              <span>₹{(oa.price * oa.quantity).toFixed(0)}</span>
            </div>
          ))}
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-sm py-1 text-basil">
              <span>Discount</span>
              <span>−₹{order.discountAmount.toFixed(0)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold pt-3 mt-2 border-t border-line">
            <span>Total</span>
            <span>₹{order.totalAmount.toFixed(0)}</span>
          </div>
        </div>

        <div className="bg-white border border-line rounded-sm p-5 mb-4">
          <h2 className="font-display text-lg mb-2">Delivery details</h2>
          <p className="text-sm text-ink/70">{order.deliveryAddress}</p>
          <p className="text-sm text-ink/70">{order.contactPhone}</p>
          {order.notes && <p className="text-sm text-ink/50 italic mt-2">"{order.notes}"</p>}
        </div>

        {isDelivered && (
          <div className="bg-white border border-line rounded-sm p-5">
            <h2 className="font-display text-lg mb-3">
              {order.review ? "Your review" : "How was your order?"}
            </h2>

            {order.review ? (
              <div>
                <div className="text-2xl text-saffron2 mb-1">
                  {"★".repeat(order.review.rating)}<span className="text-line">{"★".repeat(5 - order.review.rating)}</span>
                </div>
                {order.review.comment && <p className="text-sm text-ink/70">{order.review.comment}</p>}
              </div>
            ) : (
              <form onSubmit={submitReview}>
                {reviewError && <p className="text-xs text-chili mb-2">{reviewError}</p>}
                <StarPicker value={rating} onChange={setRating} />
                <textarea
                  value={comment} onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell us more (optional)" rows={2}
                  className="w-full mt-3 mb-3 px-3 py-2 border border-line rounded-sm text-sm"
                />
                <button
                  type="submit" disabled={submittingReview}
                  className="bg-charcoal text-paper text-sm px-4 py-2 rounded-sm disabled:opacity-50"
                >
                  {submittingReview ? "Submitting…" : "Submit review"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
