"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { api, API_URL } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

const UNIT = { EVENT: "per event", DAY: "per day", HOUR: "per hour", PLATE: "per plate" };
const KIND = { HALL: "Venue", FOOD: "Food", SERVICE: "Services" };

export default function VenueDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [venue, setVenue] = useState(null);
  const [unavailable, setUnavailable] = useState([]);
  const [form, setForm] = useState({ eventType: "", eventDate: "", startTime: "", endTime: "", guestCount: "", foodOption: "", services: [], contactPhone: "", notes: "" });
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getVenue(id).then((d) => { setVenue(d.venue); setUnavailable(d.unavailable); }).catch((e) => setError(e.message));
  }, [id]);

  async function submit(e) {
    e.preventDefault();
    if (!user) return router.push(`/login?next=/venues/${id}`);
    setError(""); setBusy(true);
    try {
      await api.requestVenue(id, form);
      setSent(true);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  if (!venue) return <div className="min-h-screen bg-paper"><Nav /><p className="p-10 text-ink/50">{error || "Loading…"}</p></div>;

  const dateTaken = form.eventDate && unavailable.includes(form.eventDate);
  const groups = {};
  venue.tariffs.forEach((t) => { (groups[t.kind] ||= []).push(t); });
  const field = "w-full mb-3 px-3 py-2 border border-line rounded-sm text-sm bg-white text-ink";

  return (
    <div className="min-h-screen bg-paper">
      <Nav />
      <div className="max-w-4xl mx-auto px-5 py-10 grid md:grid-cols-5 gap-8">
        <div className="md:col-span-3">
          {venue.imageUrl && <img src={venue.imageUrl.startsWith("http") ? venue.imageUrl : `${API_URL}${venue.imageUrl}`} alt="" className="w-full h-64 object-cover rounded-sm mb-4" />}
          <h1 className="font-display text-2xl text-ink">{venue.name}</h1>
          <p className="text-sm text-ink/60 mb-2">{venue.address}{venue.city ? `, ${venue.city}` : ""} · up to {venue.capacity} guests</p>
          {venue.description && <p className="text-sm text-ink/80 mb-4">{venue.description}</p>}
          {[["Events hosted", venue.eventTypes], ["Food", venue.foodOptions], ["Other services", venue.services]].map(([label, list]) =>
            list.length ? <p key={label} className="text-sm text-ink/70 mb-1"><strong className="text-ink">{label}:</strong> {list.join(", ")}</p> : null
          )}

          <h2 className="font-display text-lg text-ink mt-6 mb-2">Tariff</h2>
          {Object.entries(groups).map(([kind, list]) => (
            <div key={kind} className="bg-white border border-line rounded-sm mb-3">
              <div className="px-4 py-2 border-b border-line text-xs font-mono uppercase text-ink/50">{KIND[kind]}</div>
              {list.map((t) => (
                <div key={t.id} className="px-4 py-2 text-sm flex justify-between border-b border-line last:border-0">
                  <span className="text-ink">{t.label}{t.eventType !== "Any" ? ` · ${t.eventType}` : ""}</span>
                  <span className="font-mono text-ink">₹{t.price.toLocaleString("en-IN")} <span className="text-ink/40">{UNIT[t.unit]}</span></span>
                </div>
              ))}
            </div>
          ))}
          {venue.tariffs.length === 0 && <p className="text-sm text-ink/50">Send a request and the owner will quote you.</p>}
        </div>

        <form onSubmit={submit} className="md:col-span-2 bg-white border border-line rounded-sm p-5 h-fit">
          <h2 className="font-display text-lg text-ink mb-3">Request this venue</h2>
          {sent ? (
            <p className="text-sm text-basil">Request sent! The owner will accept or decline soon. Track it under “My venue requests”.</p>
          ) : (
            <>
              <select required value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })} className={field}>
                <option value="">Type of event</option>
                {venue.eventTypes.map((t) => <option key={t}>{t}</option>)}
              </select>
              <input required type="date" value={form.eventDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} className={field} />
              {dateTaken && <p className="text-xs text-chili -mt-2 mb-2">This date looks unavailable. You can still send a request for another time.</p>}
              <div className="flex gap-2">
                <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className={field} aria-label="Start time" />
                <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className={field} aria-label="End time" />
              </div>
              <input required type="number" min="1" max={venue.capacity} placeholder="Number of guests" value={form.guestCount} onChange={(e) => setForm({ ...form, guestCount: e.target.value })} className={field} />
              {venue.foodOptions.length > 0 && (
                <select value={form.foodOption} onChange={(e) => setForm({ ...form, foodOption: e.target.value })} className={field}>
                  <option value="">Food preference</option>
                  {venue.foodOptions.map((t) => <option key={t}>{t}</option>)}
                </select>
              )}
              {venue.services.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-mono uppercase text-ink/50 mb-1">Extra services</div>
                  {venue.services.map((s) => (
                    <label key={s} className="flex items-center gap-2 text-sm text-ink">
                      <input type="checkbox" checked={form.services.includes(s)} onChange={(e) => setForm({ ...form, services: e.target.checked ? [...form.services, s] : form.services.filter((x) => x !== s) })} /> {s}
                    </label>
                  ))}
                </div>
              )}
              <input required type="tel" placeholder="Your phone number" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} className={field} />
              <textarea rows={2} placeholder="Anything else the owner should know?" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={field} />
              {error && <p className="text-chili text-sm mb-2">{error}</p>}
              <button disabled={busy} className="w-full bg-charcoal text-paper py-2.5 rounded-sm text-sm disabled:opacity-50">{busy ? "Sending…" : user ? "Send request" : "Log in to send request"}</button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
