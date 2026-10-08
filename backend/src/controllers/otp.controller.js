const crypto = require("crypto");
const prisma = require("../config/db");
const { signToken } = require("../utils/jwt");

const OTP_TTL_MINUTES = 10;

// TextLocal is a plain SMS-sending API (no built-in OTP/verify service like
// MSG91's Verify or Twilio Verify), so we generate and check the code
// ourselves — same OtpCode table/logic as the original dev-mode fallback,
// just wired to actually deliver via TextLocal in production.
const USE_TEXTLOCAL = Boolean(process.env.TEXTLOCAL_API_KEY && process.env.TEXTLOCAL_SENDER);

if (!USE_TEXTLOCAL) {
  console.warn(
    "[otp] TEXTLOCAL_API_KEY / TEXTLOCAL_SENDER not set — falling back to a dev-only OTP mode " +
    "that returns the code directly in the API response instead of sending a real SMS. Fine for " +
    "local testing, but no code is ever actually delivered to a phone. Set TextLocal credentials " +
    "before going live — see PRODUCTION_READY_GUIDE.md section 3."
  );
}

// TextLocal expects a country code prefixed but no "+" sign (e.g. 919876543210).
// Defaults to India (91) if the number looks like a bare 10-digit mobile.
function toTextLocalNumber(phone) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

async function sendViaTextLocal(phone, code) {
  const params = new URLSearchParams({
    apikey: process.env.TEXTLOCAL_API_KEY,
    numbers: toTextLocalNumber(phone),
    sender: process.env.TEXTLOCAL_SENDER,
    message: `Your Godelicious verification code is ${code}. Valid for ${OTP_TTL_MINUTES} minutes.`,
  });
  // Indian DLT (TRAI) regulations require a registered Entity ID (PEID) on
  // every transactional SMS sent to Indian numbers — without it, carriers
  // silently drop the message even if TextLocal itself accepts the request.
  if (process.env.TEXTLOCAL_ENTITY_ID) {
    params.set("entity_id", process.env.TEXTLOCAL_ENTITY_ID);
  }
  const response = await fetch(`https://api.textlocal.in/send/?${params.toString()}`, { method: "POST" });
  const data = await response.json();
  if (data.status !== "success") {
    const errMsg = data.errors?.[0]?.message || "Unknown TextLocal error";
    throw new Error(errMsg);
  }
}

// App Store / Google Play reviewers can't receive a real SMS, so they log in
// with ONE dedicated test number and a fixed code, both set via env vars
// (REVIEW_PHONE / REVIEW_OTP). It only matches that single number — every
// other number still needs a genuinely delivered code. Leave the vars unset
// to switch this off entirely.
function isReviewPhone(phone) {
  const reviewPhone = process.env.REVIEW_PHONE;
  if (!reviewPhone || !process.env.REVIEW_OTP) return false;
  const last10 = (v) => String(v).replace(/\D/g, "").slice(-10);
  return last10(phone) === last10(reviewPhone);
}

// POST /api/auth/otp/request
// body: { phone }
async function requestOtp(req, res) {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: "phone is required." });

  // Store reviewer test number: nothing to send, the fixed code is checked in verifyOtp.
  if (isReviewPhone(phone)) return res.json({ success: true, message: "OTP sent." });

  // In production with no SMS provider configured, say so plainly instead of
  // pretending a code was sent that will never arrive.
  if (!USE_TEXTLOCAL && process.env.NODE_ENV === "production") {
    return res.status(503).json({ error: "Phone verification isn't available yet. Please try again shortly." });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  await prisma.otpCode.create({ data: { phone, code, expiresAt } });

  if (USE_TEXTLOCAL) {
    try {
      await sendViaTextLocal(phone, code);
      return res.json({ success: true, message: "OTP sent." });
    } catch (err) {
      console.error("TextLocal requestOtp error:", err.message);
      return res.status(500).json({ error: "Could not send OTP. Please check the phone number and try again." });
    }
  }

  // ---- Dev-only fallback (no TextLocal configured) ----
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

  if (isReviewPhone(phone)) {
    if (String(code) !== String(process.env.REVIEW_OTP)) {
      return res.status(400).json({ error: "Invalid or expired code." });
    }
  } else {
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
