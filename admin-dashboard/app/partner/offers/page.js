"use client";

import { useEffect, useState } from "react";
import PartnerShell from "@/components/PartnerShell";
import { api } from "@/lib/api";

const STATUS_COLORS = { PENDING: "text-saffron2", APPROVED: "text-basil", REJECTED: "text-chili" };

export default function PartnerOffersPage() {
  const [offers, setOffers] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [error, setError] = useState("");

  function load() {
    api.myBrandOffers().then((d) => setOffers(d.offers)).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await api.createMyBrandOffer({ title, description, discountPercent: Number(discountPercent) });
      setTitle("");
      setDescription("");
      setDiscountPercent("");
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <PartnerShell>
      <h1 className="font-display text-2xl text-ink mb-1">Offers</h1>
      <p className="text-sm text-ink/50 mb-6">
        Propose a promotion — an admin reviews and approves it before customers see it
      </p>

      {error && <p className="text-chili text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-3">
          {offers.map((offer) => (
            <div key={offer.id} className="bg-white border border-line rounded-sm p-4">
              <span className={`ticket-pill ${STATUS_COLORS[offer.status]} mb-2 inline-flex`}>{offer.status}</span>
              <h3 className="font-display text-lg text-ink">{offer.title}</h3>
              <p className="text-sm text-ink/60">{offer.discountPercent}% off</p>
              {offer.description && <p className="text-sm text-ink/60 mt-1">{offer.description}</p>}
              {offer.adminNote && <p className="text-xs text-ink/40 italic mt-2">Admin note: {offer.adminNote}</p>}
            </div>
          ))}
          {offers.length === 0 && <p className="text-sm text-ink/40">No offers submitted yet.</p>}
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-line rounded-sm p-5 h-fit">
          <h2 className="font-display text-lg mb-3">New offer</h2>
          <input
            placeholder="Title, e.g. Weekend Special" required value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full mb-2 px-3 py-2 border border-line rounded-sm text-sm"
          />
          <input
            type="number" placeholder="Discount %" required value={discountPercent}
            onChange={(e) => setDiscountPercent(e.target.value)}
            className="w-full mb-2 px-3 py-2 border border-line rounded-sm text-sm"
          />
          <textarea
            placeholder="Description (optional)" value={description} rows={3}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full mb-4 px-3 py-2 border border-line rounded-sm text-sm"
          />
          <button type="submit" className="w-full bg-charcoal text-paper text-sm px-4 py-2 rounded-sm">
            Submit for approval
          </button>
        </form>
      </div>
    </PartnerShell>
  );
}
