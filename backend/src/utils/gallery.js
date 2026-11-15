// Shared rules for partner photo galleries: up to 8 https photo links and one video link.
const MAX_PHOTOS = 8;
const isUrl = (u) => typeof u === "string" && /^https?:\/\/\S+$/i.test(u.trim()) && u.length <= 1000;

function parseGallery(v) {
  try { const a = JSON.parse(v || "[]"); return Array.isArray(a) ? a.filter(isUrl) : []; } catch { return []; }
}

// Returns a JSON string to store, or throws { status: 400 } with a readable message.
function cleanGallery(list) {
  if (!Array.isArray(list)) { const e = new Error("Gallery must be a list of photo links."); e.status = 400; throw e; }
  const urls = [...new Set(list.map((u) => String(u || "").trim()).filter(isUrl))];
  if (urls.length > MAX_PHOTOS) { const e = new Error(`You can add up to ${MAX_PHOTOS} photos.`); e.status = 400; throw e; }
  return JSON.stringify(urls);
}

function cleanVideo(v) {
  if (v === null || v === "" || v === undefined) return null;
  const s = String(v).trim();
  if (!isUrl(s)) { const e = new Error("The video must be an uploaded file or a link starting with https://"); e.status = 400; throw e; }
  return s;
}

module.exports = { MAX_PHOTOS, parseGallery, cleanGallery, cleanVideo };
