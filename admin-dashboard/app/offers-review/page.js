"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

const STATUS_COLORS = { PENDING: "text-saffron2", APPROVED: "text-basil", REJECTED: "text-chili" };

export default function OffersReviewPage() {
  const [offers, setOffers] = useState([]);
  const [filter, setFilter] = useState("PENDING");
  const [notes, setNotes] = useState({});
  const [error, setError] = useState("");

  function load() {
    api.listAllOffers(filter).then((d) => setOffers(d.offers)).catch((e) => setError(e.message));
  }
  useEffect(load, [filter]);

  async function review(id, status) {
    setError("");
    try {
      await api.reviewOffer(id, status, notes[id] || "");
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <Shell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-ink mb-1">Brand Offers</h1>
          <p className="text-sm text-ink/50">Promotions submitted by brand partners, awaiting approval</p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-line rounded-sm px-3 py-1.5 text-sm bg-white"
        >
          <option value="">All</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {error && <p className="text-chili text-sm mb-4">{error}</p>}

      <div className="space-y-3">
        {offers.map((offer) => (
          <div key={offer.id} className="bg-white border border-line rounded-sm p-4">
            <span className={`ticket-pill ${STATUS_COLORS[offer.status]} mb-2 inline-flex`}>{offer.status}</span>
            <h3 className="font-display text-lg text-ink">{offer.title}</h3>
            <p className="text-sm text-ink/60">
              {offer.brand.name} · {offer.discountPercent}% off
            </p>
            {offer.description && <p className="text-sm text-ink/60 mt-1">{offer.description}</p>}

            {offer.status === "PENDING" && (
              <div className="mt-3 flex gap-2 items-center">
                <input
                  placeholder="Admin note (optional)"
                  value={notes[offer.id] || ""}
                  onChange={(e) => setNotes({ ...notes, [offer.id]: e.target.value })}
                  className="flex-1 px-3 py-1.5 border border-line rounded-sm text-sm"
                />
                <button
                  onClick={() => review(offer.id, "APPROVED")}
                  className="bg-basil text-white text-xs px-3 py-1.5 rounded-sm"
                >
                  Approve
                </button>
                <button
                  onClick={() => review(offer.id, "REJECTED")}
                  className="text-chili border border-chili/30 text-xs px-3 py-1.5 rounded-sm"
                >
                  Reject
                </button>
              </div>
            )}
            {offer.adminNote && (
              <div className="mt-2 text-xs text-ink/50 font-mono">Note: {offer.adminNote}</div>
            )}
          </div>
        ))}
        {offers.length === 0 && <p className="text-sm text-ink/40">No offers found.</p>}
      </div>
    </Shell>
  );
}
