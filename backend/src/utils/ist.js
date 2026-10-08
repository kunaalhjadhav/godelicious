// India Standard Time helpers. The business runs on IST, and the server may run
// in UTC, so "today", "tomorrow" and delivery times are always worked out here.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// "YYYY-MM-DD" for the IST calendar day that contains this instant
function istYmd(date = new Date()) {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

// The instant of 00:00 IST on that day
function dateFromYmd(ymd) {
  return new Date(`${ymd}T00:00:00+05:30`);
}

function addDaysYmd(ymd, days) {
  const d = new Date(`${ymd}T12:00:00+05:30`);
  d.setUTCDate(d.getUTCDate() + days);
  return istYmd(d);
}

// 0 = Sunday ... 6 = Saturday, for the IST day
function weekdayOfYmd(ymd) {
  return new Date(`${ymd}T12:00:00+05:30`).getUTCDay();
}

// "12:30 PM" -> minutes after midnight (750), or null if it does not parse
function parseSlotMinutes(slot) {
  const m = String(slot || "").match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const pm = m[3].toUpperCase() === "PM";
  if (pm && h !== 12) h += 12;
  if (!pm && h === 12) h = 0;
  return h * 60 + min;
}

function formatSlot(minutes) {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${m === 0 ? "00" : m} ${h24 >= 12 ? "PM" : "AM"}`;
}

module.exports = { IST_OFFSET_MS, istYmd, dateFromYmd, addDaysYmd, weekdayOfYmd, parseSlotMinutes, formatSlot };
