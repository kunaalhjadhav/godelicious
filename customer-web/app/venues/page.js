"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import { api, API_URL } from "@/lib/api";

export default function VenuesPage() {
  const [venues, setVenues] = useState([]);
  const [city, setCity] = useState("");
  const [guests, setGuests] = useState("");
  const [eventType, setEventType] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  function load() {
    setError("");
    api.listVenues({ city, guests, eventType }).then((d) => { setVenues(d.venues); setLoaded(true); }).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  return (
    <div className="min-h-screen bg-paper">
      <Nav />
      <div className="max-w-5xl mx-auto px-5 py-10">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
          <div>
            <h1 className="font-display text-2xl text-ink">Book a venue</h1>
            <p className="text-sm text-ink/50">Pick a hall, send a date request, and the owner replies with a quote.</p>
          </div>
          <Link href="/venues/requests" className="text-sm text-saffron2 hover:underline">My venue requests →</Link>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} className="px-3 py-2 border border-line rounded-sm text-sm bg-white text-ink" />
          <input placeholder="Guests" type="number" min="1" value={guests} onChange={(e) => setGuests(e.target.value)} className="w-28 px-3 py-2 border border-line rounded-sm text-sm bg-white text-ink" />
          <input placeholder="Event (e.g. Wedding)" value={eventType} onChange={(e) => setEventType(e.target.value)} className="px-3 py-2 border border-line rounded-sm text-sm bg-white text-ink" />
          <button onClick={load} className="bg-charcoal text-paper text-sm px-4 py-2 rounded-sm">Search</button>
        </div>

        {error && <p className="text-chili text-sm mb-4">{error}</p>}
        <div className="grid md:grid-cols-2 gap-4">
          {venues.map((v) => (
            <Link key={v.id} href={`/venues/${v.id}`} className="bg-white border border-line rounded-sm overflow-hidden hover:border-saffron block">
              {v.imageUrl ? (
                <img src={v.imageUrl.startsWith("http") ? v.imageUrl : `${API_URL}${v.imageUrl}`} alt="" className="w-full h-44 object-cover" />
              ) : <div className="w-full h-44 bg-line" />}
              <div className="p-4">
                <h3 className="font-display text-lg text-ink">{v.name}</h3>
                <p className="text-sm text-ink/60">{v.address}{v.city ? `, ${v.city}` : ""}</p>
                <p className="text-xs text-ink/50 mt-1">Up to {v.capacity} guests · {v.eventTypes.slice(0, 3).join(", ")}</p>
                {v.startingFrom != null && <p className="text-sm text-basil mt-2">Hall from ₹{Math.round(v.startingFrom).toLocaleString("en-IN")}</p>}
              </div>
            </Link>
          ))}
        </div>
        {loaded && venues.length === 0 && <p className="text-ink/50">No venues match yet.</p>}
      </div>
    </div>
  );
}
