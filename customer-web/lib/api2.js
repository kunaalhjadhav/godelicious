// Extra API calls added for GST / meal boxes. Kept in its own file so lib/api.js (login/OTP) is untouched.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const TOKEN_KEY = "godelicious_web_token";

async function request(path, options = {}) {
  const token = typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }), ...options.headers },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed with status ${res.status}`);
  return data;
}

export const api2 = {
  listMealBoxes: () => request("/api/meal-boxes"),
  serviceCheck: (latitude, longitude) => request("/api/settings/service-check", { method: "POST", body: { latitude, longitude } }),
  home: () => request("/api/home"),
  getSettings: () => request("/api/settings"),
  listBanners: () => request("/api/banners"),
  listCategories: () => request("/api/menu/categories"),
  listMenuAll: () => request("/api/menu?available=true"),
  planParty: (guests, foodStyle, occasion) => request("/api/planner/suggest", { method: "POST", body: { guests, foodStyle, occasion } }),
  // Address search / autofill (served by our backend; works with or without a Google key)
  placesAutocomplete: (q, lat, lng) =>
    request(`/api/places/autocomplete?q=${encodeURIComponent(q)}${lat != null ? `&lat=${lat}&lng=${lng}` : ""}`),
  placeDetails: (id) => request(`/api/places/details?id=${encodeURIComponent(id)}`),
  placesReverse: (lat, lng) => request(`/api/places/reverse?lat=${lat}&lng=${lng}`),
};

// ---- Where did this customer come from? (first touch is remembered; used for the marketing report) ----
const SOURCE_KEY = "godelicious_source";
export function captureSource() {
  try {
    if (localStorage.getItem(SOURCE_KEY)) return;
    const q = new URLSearchParams(window.location.search);
    let src = q.get("ref") || q.get("utm_source");
    if (!src && document.referrer) {
      const host = new URL(document.referrer).hostname.replace(/^www\./, "");
      if (host && !host.endsWith("godelicious.in")) {
        if (/instagram/.test(host)) src = "instagram";
        else if (/facebook|fb\./.test(host)) src = "facebook";
        else if (/google/.test(host)) src = "google";
        else if (/youtube|youtu\.be/.test(host)) src = "youtube";
        else if (/whatsapp|wa\.me/.test(host)) src = "whatsapp";
        else src = host;
      }
    }
    if (src) localStorage.setItem(SOURCE_KEY, String(src).toLowerCase().slice(0, 40));
  } catch (_) {}
}
export function getSource() {
  try { return localStorage.getItem(SOURCE_KEY) || undefined; } catch (_) { return undefined; }
}
