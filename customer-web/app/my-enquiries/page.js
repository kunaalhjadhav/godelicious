"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

const STATUS_COLORS = { PENDING: "text-saffron2", APPROVED: "text-basil", REJECTED: "text-chili" };

export default function MyEnquiriesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [enquiries, setEnquiries] = useState([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (user) api.myEnquiries().then((d) => setEnquiries(d.enquiries)).catch(() => {});
  }, [user]);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-paper">
      <Nav />
      <div className="max-w-2xl mx-auto px-5 py-10">
        <h1 className="font-display text-2xl text-ink mb-6">My venue enquiries</h1>

        {enquiries.length === 0 ? (
          <p className="text-ink/50">No venue enquiries submitted yet.</p>
        ) : (
          <div className="space-y-3">
            {enquiries.map((enq) => (
              <div key={enq.id} className="bg-white border border-line rounded-sm p-4">
                <span className={`ticket-pill ${STATUS_COLORS[enq.status]} mb-2 inline-flex`}>{enq.status}</span>
                <h3 className="font-display text-lg text-ink">{enq.venueName}</h3>
                <p className="text-sm text-ink/60">{enq.location}</p>
                <p className="text-sm text-ink/70">
                  {new Date(enq.eventDate).toLocaleDateString()} · {enq.guestCount} guests
                  {enq.budget && ` · Budget ₹${enq.budget}`}
                </p>
                {enq.adminNote && (
                  <p className="text-sm text-ink/50 italic mt-2">Admin note: {enq.adminNote}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
