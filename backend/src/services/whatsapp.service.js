// WhatsApp Business Cloud API sender (Meta). Optional: if the env vars aren't
// set every call quietly returns { sent:false, reason } so nothing else breaks.
//
// Env vars:
//   WHATSAPP_TOKEN          permanent access token (System User token from Meta Business)
//   WHATSAPP_PHONE_ID       "Phone number ID" of your WhatsApp Business number
//   WHATSAPP_TEMPLATE_NAME  (recommended) name of an approved template with ONE body variable {{1}}
//   WHATSAPP_TEMPLATE_LANG  template language code, default "en"
//
// Why a template: WhatsApp only lets a business send free-form text to someone
// who messaged the business number in the last 24 hours. Alerts to admins,
// brand partners and venue owners are business-initiated, so they must use an
// approved template. Without WHATSAPP_TEMPLATE_NAME we fall back to plain text,
// which works only inside that 24-hour window.

const GRAPH_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";

function isConfigured() {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
}

// Cloud API wants digits only with country code. Bare 10-digit Indian numbers get 91.
function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
}

// Template variables can't contain newlines/tabs, so flatten the message.
function flatten(text) {
  return String(text).replace(/\s*\n+\s*/g, " | ").replace(/\s{2,}/g, " ").slice(0, 1000);
}

async function sendWhatsApp(phone, text) {
  if (!isConfigured()) return { sent: false, reason: "WhatsApp API not configured" };
  const to = normalizePhone(phone);
  if (!to) return { sent: false, reason: "no phone number" };

  const template = process.env.WHATSAPP_TEMPLATE_NAME;
  const payload = template
    ? {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: template,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "en" },
          components: [{ type: "body", parameters: [{ type: "text", text: flatten(text) }] }],
        },
      }
    : { messaging_product: "whatsapp", to, type: "text", text: { body: String(text).slice(0, 4000) } };

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${process.env.WHATSAPP_PHONE_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.error?.message || `HTTP ${res.status}`;
      console.error(`[whatsapp] send to ${to} failed: ${msg}`);
      return { sent: false, reason: msg };
    }
    return { sent: true, id: data?.messages?.[0]?.id };
  } catch (err) {
    console.error("[whatsapp] send error:", err.message);
    return { sent: false, reason: err.message };
  }
}

module.exports = { sendWhatsApp, isConfigured, normalizePhone };
