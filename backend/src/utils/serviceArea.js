// Delivery area: a circle of serviceRadiusKm around (serviceLat, serviceLng), set in Admin -> Settings.
const NOT_AVAILABLE = "Service not available to this area yet. Coming shortly. Thank you.";

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// -> { ok, distanceKm, message }
function checkServiceArea(settings, latitude, longitude) {
  if (!settings.serviceAreaOn) return { ok: true, distanceKm: null };
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (latitude == null || longitude == null || latitude === "" || longitude === "" || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, distanceKm: null, needsLocation: true, message: "Please pick your delivery location (use current location or choose on the map) so we can check that we deliver there." };
  }
  const d = distanceKm(settings.serviceLat, settings.serviceLng, lat, lng);
  const ok = d <= settings.serviceRadiusKm;
  return { ok, distanceKm: Math.round(d * 10) / 10, message: ok ? undefined : NOT_AVAILABLE };
}

module.exports = { distanceKm, checkServiceArea, NOT_AVAILABLE };
