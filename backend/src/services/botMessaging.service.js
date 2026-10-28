// Sends replies on WhatsApp and Instagram for the reply assistant. These are in-conversation
// (free-form) messages, allowed by Meta within 24 hours of the customer's last message.
//
// Env vars:
//   WHATSAPP_TOKEN, WHATSAPP_PHONE_ID    same ones the order alerts use
//   INSTAGRAM_ACCESS_TOKEN               access token for the Instagram professional account's messaging
const GRAPH_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";

async function post(url, token, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  return data;
}

async function sendWhatsAppText(to, text) {
  if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_ID) throw new Error("WhatsApp isn't configured.");
  const data = await post(`https://graph.facebook.com/${GRAPH_VERSION}/${process.env.WHATSAPP_PHONE_ID}/messages`, process.env.WHATSAPP_TOKEN, {
    messaging_product: "whatsapp",
    to: String(to).replace(/\D/g, ""),
    type: "text",
    text: { body: String(text).slice(0, 4000) },
  });
  return data?.messages?.[0]?.id || null;
}

async function sendInstagramText(recipientId, text) {
  if (!process.env.INSTAGRAM_ACCESS_TOKEN) throw new Error("Instagram isn't configured.");
  const data = await post(`https://graph.facebook.com/${GRAPH_VERSION}/me/messages`, process.env.INSTAGRAM_ACCESS_TOKEN, {
    recipient: { id: String(recipientId) },
    message: { text: String(text).slice(0, 1000) },
  });
  return data?.message_id || null;
}

function sendText(channel, contactId, text) {
  return channel === "INSTAGRAM" ? sendInstagramText(contactId, text) : sendWhatsAppText(contactId, text);
}

const isConfigured = {
  whatsapp: () => Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID),
  instagram: () => Boolean(process.env.INSTAGRAM_ACCESS_TOKEN),
};

module.exports = { sendText, sendWhatsAppText, sendInstagramText, isConfigured };
