// Address search / autofill for Checkout and Booking (web + app).
//
// The apps used to call Google directly with a key stored in the app/web build,
// which silently did nothing whenever the key was missing, restricted, or had
// no billing. Everything now goes through the backend:
//   1. If GOOGLE_MAPS_SERVER_KEY (or GOOGLE_MAPS_API_KEY) is set, Google Places
//      / Geocoding is tried first.
//   2. If it isn't set, or Google answers with an error (REQUEST_DENIED, no
//      billing, quota...), we fall back to free OpenStreetMap services
//      (Photon for search, Nominatim for reverse geocoding) — no key needed.
// Results are biased towards the delivery area so "Vijayanagar" finds Mysuru first.

const UA = "Godelicious/1.0 (DS Enterprises, Mysuru; +https://godelicious.in)";
const GOOGLE_KEY = () => process.env.GOOGLE_MAPS_SERVER_KEY || process.env.GOOGLE_MAPS_API_KEY || "";
const DEFAULT_LAT = 12.322983; // Vijayanagar 4th Stage, Mysuru
const DEFAULT_LNG = 76.5878328;

const cache = new Map(); // tiny in-memory cache: key -> { at, value }
const TTL = 10 * 60 * 1000;
function cached(key) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;
  return null;
}
function remember(key, value) {
  if (cache.size > 500) cache.clear();
  cache.set(key, { at: Date.now(), value });
  return value;
}

async function getJson(url, timeoutMs = 7000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

const num = (v, d) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : d);

// ---------- Photon (OpenStreetMap) ----------
function photonLabel(p) {
  const street = [p.housenumber, p.street].filter(Boolean).join(" ");
  const parts = [p.name, street, p.district || p.suburb, p.locality, p.city || p.county, p.state, p.postcode]
    .filter(Boolean);
  const seen = new Set();
  return parts.filter((x) => (seen.has(x) ? false : seen.add(x))).join(", ");
}

async function photonSearch(q, lat, lng) {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=en&lat=${lat}&lon=${lng}&bbox=68,6,98,36`;
  const data = await getJson(url);
  return (data.features || [])
    .filter((f) => f.geometry?.coordinates)
    .map((f) => ({
      id: `osm:${f.properties.osm_type || ""}${f.properties.osm_id || ""}`,
      description: photonLabel(f.properties),
      latitude: f.geometry.coordinates[1],
      longitude: f.geometry.coordinates[0],
    }))
    .filter((s) => s.description);
}

async function nominatimReverse(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&lat=${lat}&lon=${lng}`;
  const data = await getJson(url);
  return data.display_name || null;
}

// ---------- Google ----------
async function googleSearch(q, lat, lng) {
  const key = GOOGLE_KEY();
  if (!key) throw new Error("no google key");
  const url =
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(q)}` +
    `&components=country:in&location=${lat},${lng}&radius=50000&key=${key}`;
  const data = await getJson(url);
  if (data.status !== "OK") throw new Error(`google ${data.status}`);
  return (data.predictions || []).map((p) => ({ id: p.place_id, description: p.description }));
}

async function googleDetails(id) {
  const key = GOOGLE_KEY();
  if (!key) throw new Error("no google key");
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(id)}&fields=geometry,formatted_address&key=${key}`;
  const data = await getJson(url);
  const loc = data.result?.geometry?.location;
  if (data.status !== "OK" || !loc) throw new Error(`google ${data.status}`);
  return { latitude: loc.lat, longitude: loc.lng, address: data.result.formatted_address };
}

async function googleReverse(lat, lng) {
  const key = GOOGLE_KEY();
  if (!key) throw new Error("no google key");
  const data = await getJson(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`);
  if (data.status !== "OK" || !data.results?.[0]) throw new Error(`google ${data.status}`);
  return data.results[0].formatted_address;
}

// GET /api/places/autocomplete?q=...&lat=..&lng=..
async function autocomplete(req, res) {
  const q = String(req.query.q || "").trim();
  if (q.length < 3) return res.json({ suggestions: [] });
  const lat = num(req.query.lat, DEFAULT_LAT);
  const lng = num(req.query.lng, DEFAULT_LNG);
  const ck = `a:${q.toLowerCase()}:${lat.toFixed(2)}:${lng.toFixed(2)}`;
  const hit = cached(ck);
  if (hit) return res.json({ suggestions: hit });

  let suggestions = [];
  try {
    suggestions = await googleSearch(q, lat, lng);
  } catch (_) {
    try {
      suggestions = await photonSearch(q, lat, lng);
    } catch (err) {
      console.error("[places] autocomplete failed:", err.message);
      return res.json({ suggestions: [] });
    }
  }
  if (suggestions.length) remember(ck, suggestions);
  res.json({ suggestions });
}

// GET /api/places/details?id=<id from autocomplete>
// OpenStreetMap suggestions already carry coordinates; this is for Google ones.
async function details(req, res) {
  const id = String(req.query.id || "");
  if (!id) return res.status(400).json({ error: "id is required." });
  try {
    res.json(await googleDetails(id));
  } catch (err) {
    res.status(502).json({ error: "Couldn't look up that place. Please pick it on the map instead." });
  }
}

// GET /api/places/reverse?lat=..&lng=..
async function reverse(req, res) {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return res.status(400).json({ error: "lat and lng are required." });
  }
  const ck = `r:${lat.toFixed(4)}:${lng.toFixed(4)}`;
  const hit = cached(ck);
  if (hit) return res.json({ address: hit });

  let address = null;
  try {
    address = await googleReverse(lat, lng);
  } catch (_) {
    try {
      address = await nominatimReverse(lat, lng);
    } catch (err) {
      console.error("[places] reverse failed:", err.message);
    }
  }
  if (!address) return res.json({ address: null });
  remember(ck, address);
  res.json({ address });
}

module.exports = { autocomplete, details, reverse };
