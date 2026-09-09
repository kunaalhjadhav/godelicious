const crypto = require("crypto");
const prisma = require("../config/db");
const { signToken } = require("../utils/jwt");

const OTP_TTL_MINUTES = 10;

const USE_TWILIO = Boolean(
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_VERIFY_SERVICE_SID
);

if (!USE_TWILIO) {
  console.warn(
    "[otp] TWILIO_* env vars not set — falling back to a dev-only OTP mode that returns the " +
    "code directly in the API response instead of sending a real SMS. Fine for local testing, " +
    "but no code is ever actually delivered to a phone. Set Twilio credentials before going live " +
    "— see PRODUCTION_READY_GUIDE.md section 3."
  );
}

function twilioClient() {
  // Lazily required so the app doesn't crash on boot if the package or
  // credentials aren't present yet — matches the Cloudinary/Razorpay pattern.
  const twilio = require("twilio");
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

// Twilio Verify expects E.164 format (e.g. +919876543210). If the number
// doesn't already start with "+", assume India (+91) as a sane default for
// this project — adjust here if you operate in a different country.
function toE164(phone) {
  const digits = phone.replace(/\D/g, "");
  if (phone.startsWith("+")) return phone;
  return `+91${digits}`;
}

// POST /api/auth/otp/request
// body: { phone }
async function requestOtp(req, res) {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: "phone is required." });

  if (USE_TWILIO) {
    try {
      const client = twilioClient();
      await client.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verifications.create({ to: toE164(phone), channel: "sms" });
      return res.json({ success: true, message: "OTP sent." });
    } catch (err) {
      console.error("Twilio requestOtp error:", err.message);
      return res.status(500).json({ error: "Could not send OTP. Please check the phone number and try again." });
    }
  }

  // ---- Dev-only fallback (no Twilio configured) ----
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

  if (USE_TWILIO) {
    try {
      const client = twilioClient();
      const check = await client.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verificationChecks.create({ to: toE164(phone), code });
      if (check.status !== "approved") {
        return res.status(400).json({ error: "Invalid or expired code." });
      }
    } catch (err) {
      console.error("Twilio verifyOtp error:", err.message);
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
