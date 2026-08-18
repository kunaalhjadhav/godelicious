const crypto = require("crypto");
const prisma = require("../config/db");
const { signToken } = require("../utils/jwt");

const OTP_TTL_MINUTES = 10;

// POST /api/auth/otp/request
// body: { phone }
// Creates a 6-digit code valid for 10 minutes. In production, plug in an SMS
// provider (MSG91, Twilio, etc.) where the comment below says so — for now
// this returns the code directly in the response so the feature is fully
// testable without one. NEVER ship that behavior to real users; gate it
// behind NODE_ENV !== "production" at minimum, or remove once SMS is wired.
async function requestOtp(req, res) {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: "phone is required." });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.otpCode.create({ data: { phone, code, expiresAt } });

  // ---- SMS PROVIDER INTEGRATION POINT ----
  // Example with an SMS API (pseudo-code — swap in your provider's SDK/HTTP call):
  //   await smsProvider.send({ to: phone, message: `Your Godelicious OTP is ${code}` });
  // -----------------------------------------

  const response = { success: true, message: "OTP sent." };
  if (process.env.NODE_ENV !== "production") {
    response.devCode = code; // visible only outside production, for testing without SMS setup
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

  const otp = await prisma.otpCode.findFirst({
    where: { phone, code, consumed: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) return res.status(400).json({ error: "Invalid or expired code." });

  await prisma.otpCode.update({ where: { id: otp.id }, data: { consumed: true } });

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
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}

module.exports = { requestOtp, verifyOtp };
