"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

export default function VenueEnquiryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    venueName: "", location: "", eventDate: "", guestCount: "", budget: "", contactPhone: "", notes: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/venue-enquiry");
  }, [loading, user, router]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.createEnquiry({
        ...form,
        eventDate: new Date(form.eventDate).toISOString(),
        guestCount: Number(form.guestCount),
        budget: form.budget ? Number(form.budget) : undefined,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user) return null;

  if (success) {
    return (
      <div className="min-h-screen bg-paper">
        <Nav />
        <div className="max-w-lg mx-auto px-5 py-16 text-center">
          <h1 className="font-display text-2xl text-ink mb-3">Enquiry submitted</h1>
          <p className="text-ink/60 mb-6">Our team will review your venue enquiry and get back to you shortly.</p>
          <Link href="/my-enquiries" className="text-saffron2 font-medium hover:underline">
            View my enquiries →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <Nav />
      <div className="max-w-xl mx-auto px-5 py-10">
        <h1 className="font-display text-2xl text-ink mb-1">Enquire for a venue</h1>
        <p className="text-ink/60 text-sm mb-6">
          Planning an event? Tell us about the venue and we'll review it for catering.
        </p>

        {error && <div className="mb-4 text-sm text-chili bg-chili/10 border-l-2 border-chili px-3 py-2">{error}</div>}

        <form onSubmit={handleSubmit} className="bg-white border border-line rounded-sm p-6 space-y-3">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Venue name</label>
            <input required value={form.venueName} onChange={(e) => set("venueName", e.target.value)} placeholder="e.g. Grand Palace Banquet" className="w-full px-3 py-2 border border-line rounded-sm text-sm" />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Location</label>
            <input required value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Area, city" className="w-full px-3 py-2 border border-line rounded-sm text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Event date</label>
              <input required type="date" value={form.eventDate} onChange={(e) => set("eventDate", e.target.value)} className="w-full px-3 py-2 border border-line rounded-sm text-sm" />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Guest count</label>
              <input required type="number" value={form.guestCount} onChange={(e) => set("guestCount", e.target.value)} placeholder="150" className="w-full px-3 py-2 border border-line rounded-sm text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Budget (optional)</label>
              <input type="number" value={form.budget} onChange={(e) => set("budget", e.target.value)} placeholder="₹" className="w-full px-3 py-2 border border-line rounded-sm text-sm" />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Contact phone</label>
              <input required value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} className="w-full px-3 py-2 border border-line rounded-sm text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-ink/60 mb-1">Notes (optional)</label>
            <textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} className="w-full px-3 py-2 border border-line rounded-sm text-sm" />
          </div>

          <button
            type="submit" disabled={submitting}
            className="w-full bg-charcoal text-paper py-3 rounded-sm font-medium disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit enquiry"}
          </button>
        </form>
      </div>
    </div>
  );
}
