"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

const STATUS_COLORS = { PENDING: "text-saffron2", APPROVED: "text-basil", REJECTED: "text-chili" };

export default function VenueEnquiriesPage() {
  const [enquiries, setEnquiries] = useState([]);
  const [filter, setFilter] = useState("PENDING");
  const [notes, setNotes] = useState({});
  const [error, setError] = useState("");

  function load() {
    api.listEnquiries(filter).then((d) => setEnquiries(d.enquiries)).catch((e) => setError(e.message));
  }

  useEffect(load, [filter]);

  async function review(id, status) {
    setError("");
    try {
      await api.reviewEnquiry(id, status, notes[id] || "");
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <Shell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-ink mb-1">Venue Enquiries</h1>
          <p className="text-sm text-ink/50">Requests from customers wanting catering at their venue</p>
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
        {enquiries.map((enq) => (
          <div key={enq.id} className="bg-white border border-line rounded-sm p-4">
            <div className="flex items-start justify-between">
              <div>
                <span className={`ticket-pill ${STATUS_COLORS[enq.status]} mb-2 inline-flex`}>{enq.status}</span>
                <div className="font-display text-lg text-ink">{enq.venueName}</div>
                <div className="text-sm text-ink/60">{enq.location}</div>
                <div className="text-sm text-ink/70 mt-1">
                  {new Date(enq.eventDate).toLocaleDateString()} · {enq.guestCount} guests
                  {enq.budget && ` · Budget ₹${enq.budget}`}
                </div>
                <div className="text-sm text-ink/60 mt-1">
                  {enq.user.name} · {enq.contactPhone}
                </div>
                {enq.notes && <p className="text-sm text-ink/70 mt-2 italic">"{enq.notes}"</p>}
              </div>
            </div>

            {enq.status === "PENDING" && (
              <div className="mt-4 flex gap-2 items-center">
                <input
                  placeholder="Admin note (optional)"
                  value={notes[enq.id] || ""}
                  onChange={(e) => setNotes({ ...notes, [enq.id]: e.target.value })}
                  className="flex-1 px-3 py-1.5 border border-line rounded-sm text-sm"
                />
                <button
                  onClick={() => review(enq.id, "APPROVED")}
                  className="bg-basil text-white text-xs px-3 py-1.5 rounded-sm"
                >
                  Approve
                </button>
                <button
                  onClick={() => review(enq.id, "REJECTED")}
                  className="text-chili border border-chili/30 text-xs px-3 py-1.5 rounded-sm"
                >
                  Reject
                </button>
              </div>
            )}
            {enq.adminNote && (
              <div className="mt-2 text-xs text-ink/50 font-mono">Note: {enq.adminNote}</div>
            )}
          </div>
        ))}
        {enquiries.length === 0 && <p className="text-sm text-ink/40">No enquiries found.</p>}
      </div>
    </Shell>
  );
}
