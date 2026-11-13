// SMS through TextLocal using the DLT-approved header DSETRE (DS Enterprises).
//
// Every message below must match its DLT content template word for word, with each
// {#var#} replaced by a value of at most 30 characters, or the operator drops it.
// A template is only used once its key is listed in SMS_TEMPLATES_LIVE (Render env),
// e.g. SMS_TEMPLATES_LIVE=OTP,ORDER_PLACED,ORDER_CONFIRMED  (or "ALL").
// Env: TEXTLOCAL_API_KEY, TEXTLOCAL_SENDER=DSETRE, TEXTLOCAL_ENTITY_ID (your DLT PE ID).
const SIGN = " - DS Enterprises";
const v = (x) => String(x ?? "").replace(/\s+/g, " ").trim().slice(0, 30);

const TEMPLATES = {
  OTP: (code) => `${v(code)} is your Godelicious verification code. It is valid for 10 minutes. Do not share it with anyone.${SIGN}`,
  ORDER_PLACED: (name, ref, amt) => `Hi ${v(name)}, your Godelicious order ${v(ref)} for Rs ${v(amt)} is received. We will confirm it shortly.${SIGN}`,
  ORDER_CONFIRMED: (ref, when) => `Your Godelicious order ${v(ref)} is confirmed for delivery on ${v(when)}.${SIGN}`,
  ORDER_OUT: (ref) => `Your Godelicious order ${v(ref)} is out for delivery and will reach you soon.${SIGN}`,
  ORDER_OUT_TRACK: (ref, rider, code, token) => `Your Godelicious order ${v(ref)} is out for delivery with ${v(rider)}. Delivery code ${v(code)}. Track: https://godelicious.in/track/${v(token)}${SIGN}`,
  ORDER_DELIVERED: (ref) => `Your Godelicious order ${v(ref)} has been delivered. Thank you for ordering with us.${SIGN}`,
  ORDER_CANCELLED: (ref) => `Your Godelicious order ${v(ref)} has been cancelled. Any online payment will be refunded as per our refund policy.${SIGN}`,
  PAYMENT_RECEIVED: (amt, ref) => `We have received Rs ${v(amt)} for your Godelicious order ${v(ref)}. Thank you.${SIGN}`,
  VENUE_CONFIRMED: (venue, date, amt) => `Your Godelicious venue booking at ${v(venue)} on ${v(date)} is confirmed. Advance of Rs ${v(amt)} received.${SIGN}`,
  ADMIN_NEW_ORDER: (ref, amt, name) => `New Godelicious order ${v(ref)} for Rs ${v(amt)} from ${v(name)}. Please check the admin dashboard.${SIGN}`,
  RIDER_NEW_ORDER: (ref, area) => `New Godelicious delivery ${v(ref)} near ${v(area)}. Open the rider app to accept or reject it.${SIGN}`,
  RIDER_APPROVED: () => `Your Godelicious delivery partner account is approved. Open the rider app and go on duty to receive orders.${SIGN}`,
};

const configured = () => Boolean(process.env.TEXTLOCAL_API_KEY && process.env.TEXTLOCAL_SENDER);
function isLive(key) {
  const list = String(process.env.SMS_TEMPLATES_LIVE || "OTP").toUpperCase().split(",").map((s) => s.trim());
  return list.includes("ALL") || list.includes(key);
}
function toNumber(phone) {
  const d = String(phone || "").replace(/\D/g, "");
  return d.length === 10 ? `91${d}` : d.length === 12 && d.startsWith("91") ? d : null;
}

// Throws on failure (OTP needs to know); use smsQuiet for notifications.
async function sendSms(phone, key, ...vars) {
  if (!TEMPLATES[key]) throw new Error(`Unknown SMS template ${key}`);
  if (!configured() || !isLive(key)) return false;
  const number = toNumber(phone);
  if (!number) throw new Error("Not an Indian mobile number");
  const params = new URLSearchParams({
    apikey: process.env.TEXTLOCAL_API_KEY,
    numbers: number,
    sender: process.env.TEXTLOCAL_SENDER,
    message: TEMPLATES[key](...vars),
  });
  if (process.env.TEXTLOCAL_ENTITY_ID) params.set("entity_id", process.env.TEXTLOCAL_ENTITY_ID);
  const res = await fetch("https://api.textlocal.in/send/", { method: "POST", body: params });
  const data = await res.json().catch(() => ({}));
  if (data.status !== "success") throw new Error(data.errors?.[0]?.message || `SMS failed (${res.status})`);
  return true;
}
function smsQuiet(phone, key, ...vars) {
  return sendSms(phone, key, ...vars).catch((err) => { console.error(`[sms] ${key} failed:`, err.message); return false; });
}

module.exports = { sendSms, smsQuiet, TEMPLATES, isLive, configured };
