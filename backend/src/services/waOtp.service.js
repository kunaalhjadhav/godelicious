// Sends a login code through the WhatsApp Business Cloud API (Meta). No DLT or SMS provider needed.
//
// Render > backend > Environment:
//   WHATSAPP_TOKEN          permanent access token (System User token from Meta Business settings)
//   WHATSAPP_PHONE_ID       the "Phone number ID" of your WhatsApp Business number
//   WHATSAPP_OTP_TEMPLATE   name of your approved AUTHENTICATION template (default: godelicious_login_otp)
//   WHATSAPP_OTP_LANG       template language code (default: en)
//   WHATSAPP_API_VERSION    optional, default v21.0
const VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";

const isConfigured = () => Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);

// "9916989185", "+91 99169 89185" or "919916989185" -> "919916989185"
function toWaNumber(phone) {
  const d = String(phone || "").replace(/\D/g, "");
  const last10 = d.slice(-10);
  return last10.length === 10 ? `91${last10}` : null;
}

async function sendOtp(phone, code) {
  const to = toWaNumber(phone);
  if (!to) throw new Error("Please enter a valid 10 digit mobile number.");
  const components = [{ type: "body", parameters: [{ type: "text", text: code }] }];
  // Meta's authentication templates carry a "copy code" button that must receive the same code.
  if (process.env.WHATSAPP_OTP_BUTTON !== "false") {
    components.push({ type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] });
  }
  const res = await fetch(`https://graph.facebook.com/${VERSION}/${process.env.WHATSAPP_PHONE_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: process.env.WHATSAPP_OTP_TEMPLATE || "godelicious_login_otp",
        language: { code: process.env.WHATSAPP_OTP_LANG || "en" },
        components,
      },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `WhatsApp API error ${res.status}`);
  return data?.messages?.[0]?.id || null;
}

module.exports = { isConfigured, sendOtp, toWaNumber };
