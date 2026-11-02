// Login with a code sent on WhatsApp. It sits beside the SMS login and gives the same result:
// the same customer account (matched by the last 10 digits of the phone) and the same token.
const crypto = require("crypto");
const prisma = require("../config/db");
const { signToken } = require("../utils/jwt");
const wa = require("../services/waOtp.service");

const TTL_MINUTES = 10;
const MAX_REQUESTS_PER_PHONE = 3;   // per 10 minutes: every message costs money
const MAX_REQUESTS_PER_IP = 20;     // per hour
const MAX_WRONG_TRIES = 5;          // per code

const phoneHits = new Map(); // last10 -> [timestamps]
const ipHits = new Map();    // ip -> [timestamps]
const wrongTries = new Map(); // last10 -> count

function hit(map, key, windowMs, max) {
  const now = Date.now();
  const list = (map.get(key) || []).filter((t) => now - t < windowMs);
  if (list.length >= max) { map.set(key, list); return false; }
  list.push(now); map.set(key, list); return true;
}

const last10 = (v) => String(v || "").replace(/\D/g, "").slice(-10);
const key = (phone) => `wa:${last10(phone)}`; // stored in the OtpCode table, kept apart from SMS codes

function isReviewPhone(phone) {
  const rp = process.env.REVIEW_PHONE;
  return Boolean(rp && process.env.REVIEW_OTP && last10(rp) === last10(phone));
}

// GET /api/auth/wa/status - lets the apps show the WhatsApp button only when it is set up
function status(req, res) {
  res.json({ enabled: wa.isConfigured() || process.env.NODE_ENV !== "production" });
}

// POST /api/auth/wa/request { phone }
async function request(req, res) {
  const phone = String(req.body?.phone || "").trim();
  if (last10(phone).length !== 10) return res.status(400).json({ error: "Please enter a valid 10 digit mobile number." });

  if (isReviewPhone(phone)) return res.json({ success: true, message: "Code sent on WhatsApp." });

  const ip = (req.headers["x-forwarded-for"] || req.ip || "").toString().split(",")[0].trim();
  if (!hit(ipHits, ip, 3600 * 1000, MAX_REQUESTS_PER_IP) || !hit(phoneHits, last10(phone), 10 * 60 * 1000, MAX_REQUESTS_PER_PHONE)) {
    return res.status(429).json({ error: "Too many requests. Please wait a few minutes and try again." });
  }

  const configured = wa.isConfigured();
  if (!configured && process.env.NODE_ENV === "production") {
    return res.status(503).json({ error: "WhatsApp login isn't available yet. Please use SMS or try again shortly." });
  }

  const code = String(crypto.randomInt(100000, 1000000));
  await prisma.otpCode.create({ data: { phone: key(phone), code, expiresAt: new Date(Date.now() + TTL_MINUTES * 60 * 1000) } });
  wrongTries.delete(last10(phone));

  if (configured) {
    try {
      await wa.sendOtp(phone, code);
      return res.json({ success: true, message: "Code sent on WhatsApp." });
    } catch (err) {
      console.error("[wa-otp] send failed:", err.message);
      return res.status(502).json({ error: "Couldn't send the WhatsApp message. Check the number has WhatsApp, or use SMS." });
    }
  }
  res.json({ success: true, message: "Code ready (dev mode, see devCode).", devCode: code });
}

// POST /api/auth/wa/verify { phone, code, name? }
async function verify(req, res) {
  const phone = String(req.body?.phone || "").trim();
  const code = String(req.body?.code || "").trim();
  const name = req.body?.name;
  if (last10(phone).length !== 10 || !code) return res.status(400).json({ error: "phone and code are required." });

  if (isReviewPhone(phone)) {
    if (code !== String(process.env.REVIEW_OTP)) return res.status(400).json({ error: "Invalid or expired code." });
  } else {
    const tries = (wrongTries.get(last10(phone)) || 0);
    if (tries >= MAX_WRONG_TRIES) return res.status(429).json({ error: "Too many wrong attempts. Please request a new code." });
    const otp = await prisma.otpCode.findFirst({
      where: { phone: key(phone), code, consumed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!otp) {
      wrongTries.set(last10(phone), tries + 1);
      return res.status(400).json({ error: "Invalid or expired code." });
    }
    await prisma.otpCode.update({ where: { id: otp.id }, data: { consumed: true } });
    wrongTries.delete(last10(phone));
  }

  // Same customer as the SMS login: match on the last 10 digits, whatever format was saved.
  let user = await prisma.user.findFirst({ where: { phone: { endsWith: last10(phone) }, role: "CUSTOMER" } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: name || "Godelicious Customer",
        email: `${last10(phone)}@phone.godelicious.local`,
        phone,
        passwordHash: crypto.randomBytes(32).toString("hex"),
        role: "CUSTOMER",
      },
    });
  }
  const token = signToken(user);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, brandId: user.brandId } });
}

module.exports = { status, request, verify };
