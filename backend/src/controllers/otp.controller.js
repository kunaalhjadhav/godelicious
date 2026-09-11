const crypto = require("crypto");
const prisma = require("../config/db");
const { signToken } = require("../utils/jwt");

const OTP_TTL_MINUTES = 10;

const USE_MSG91 = Boolean(process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID);

if (!USE_MSG91) {
  console.warn(
    "[otp] MSG91_AUTH_KEY / MSG91_TEMPLATE_ID not set — falling back to a dev-only OTP mode " +
    "that returns the code directly in the API response instead of sending a real SMS. Fine for " +
    "local testing, but no code is ever actually delivered to a phone. Set MSG91 credentials " +
    "before going live — see PRODUCTION_READY_GUIDE.md section 3."
  );
}

// MSG91 expects a country code prefixed but no "+" sign (e.g. 919876543210).
// Defaults to India (91) if the number looks like a bare 10-digit mobile.
function toMsg91Number(phone) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

// POST /api/auth/otp/request
// body: { phone }
async function requestOtp(req, res) {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: "phone is required." });

  if (USE_MSG91) {
    try {
      const mobile = toMsg91Number(phone);
      const response = await fetch("https://control.msg91.com/api/v5/otp", {
        method: "POST",
        headers: { authkey: process.env.MSG91_AUTH_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: process.env.MSG91_TEMPLATE_ID,
          mobile,
          otp_expiry: OTP_TTL_MINUTES,
        }),
      });
      const data = await response.json();
      if (data.type !== "success") {
        console.error("MSG91 requestOtp error:", data.message);
        return res.status(500).json({ error: "Could not send OTP. Please check the phone number and try again." });
      }
      return res.json({ success: true, message: "OTP sent." });
    } catch (err) {
      console.error("MSG91 requestOtp error:", err.message);
      return res.status(500).json({ error: "Could not send OTP. Please check the phone number and try again." });
    }
  }

  // ---- Dev-only fallback (no MSG91 configured) ----
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  await prisma.otpCode.create({ data: { phone, code, expiresAt } });

  const response = { success: true, message: "OTP sent (dev mode — see devCode)." };
  if (process.env.NODE_ENV !== "production") {
    response.devCode = code;
  }
  res.json(response);
}

// POST /api/auth/otp/verify
// body: { phone, code, name? }
// On success, finds or creates a CUSTOMER account for this phone and returns a JWT,
// same shape as password login/register.
async function verifyOtp(req, res) {
  const { phone, code, name } = req.body;
  if (!phone || !code) return res.status(400).json({ error: "phone and code are required." });

  if (USE_MSG91) {
    try {
      const mobile = toMsg91Number(phone);
      const url = `https://control.msg91.com/api/v5/otp/verify?otp=${encodeURIComponent(code)}&mobile=${encodeURIComponent(mobile)}`;
      const response = await fetch(url, {
        method: "GET",
        headers: { authkey: process.env.MSG91_AUTH_KEY },
      });
      const data = await response.json();
      if (data.type !== "success") {
        return res.status(400).json({ error: "Invalid or expired code." });
      }
    } catch (err) {
      console.error("MSG91 verifyOtp error:", err.message);
      return res.status(400).json({ error: "Invalid or expired code." });
    }
  } else {
    // Dev-only fallback path
    const otp = await prisma.otpCode.findFirst({
      where: { phone, code, consumed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!otp) return res.status(400).json({ error: "Invalid or expired code." });
    await prisma.otpCode.update({ where: { id: otp.id }, data: { consumed: true } });
  }

  let user = await prisma.user.findFirst({ where: { phone } });
  if (!user) {
    // First-time phone login — create a minimal account. Email is required
    // to be unique in our schema, so give it a placeholder derived from the
    // phone; the person can add a real email later from their profile if needed.
    user = await prisma.user.create({
      data: {
        name: name || "Godelicious Customer",
        email: `${phone.replace(/\D/g, "")}@phone.godelicious.local`,
        phone,
        passwordHash: crypto.randomBytes(32).toString("hex"), // unusable random hash — this account only logs in via OTP
        role: "CUSTOMER",
      },
    });
  }

  const token = signToken(user);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, brandId: user.brandId } });
}

module.exports = { requestOtp, verifyOtp };
