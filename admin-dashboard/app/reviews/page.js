"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

function Stars({ rating }) {
  return (
    <span className="text-saffron2">
      {"★".repeat(rating)}
      <span className="text-line">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.listReviews().then((d) => setReviews(d.reviews)).catch((e) => setError(e.message));
  }, []);

  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "—";

  return (
    <Shell>
      <h1 className="font-display text-2xl text-ink mb-1">Reviews</h1>
      <p className="text-sm text-ink/50 mb-6">Customer ratings and feedback on delivered orders</p>

      {error && <p className="text-chili text-sm mb-4">{error}</p>}

      <div className="bg-white border border-line rounded-sm p-5 mb-6 inline-block">
        <div className="text-xs font-mono uppercase text-ink/50 mb-1">Average rating</div>
        <div className="font-display text-3xl text-ink">{avg} <span className="text-base text-ink/40">/ 5</span></div>
        <div className="text-xs text-ink/40">{reviews.length} review{reviews.length === 1 ? "" : "s"}</div>
      </div>

      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="bg-white border border-line rounded-sm p-4">
            <div className="flex justify-between items-start mb-1">
              <div>
                <Stars rating={r.rating} />
                <span className="text-sm font-medium text-ink ml-2">{r.user.name}</span>
              </div>
              <span className="text-xs text-ink/40">{new Date(r.createdAt).toLocaleDateString()}</span>
            </div>
            {r.comment && <p className="text-sm text-ink/70 mt-1">{r.comment}</p>}
            <p className="text-xs text-ink/40 font-mono mt-1">Order #{r.order.id.slice(0, 8)} · ₹{r.order.totalAmount.toFixed(0)}</p>
          </div>
        ))}
        {reviews.length === 0 && <p className="text-sm text-ink/40">No reviews yet.</p>}
      </div>
    </Shell>
  );
}
