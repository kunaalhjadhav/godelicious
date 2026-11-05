const bcrypt = require("bcryptjs");
const prisma = require("../config/db");
const { signToken } = require("../utils/jwt");

// POST /api/auth/register
// Public. Always creates a CUSTOMER account here — staff/admin accounts are
// created by an existing admin via /api/users (see users.routes.js), never
// self-registered, to prevent privilege escalation.
async function register(req, res) {
  try {
    const { name, password, phone } = req.body;
    const email = req.body.email ? String(req.body.email).trim().toLowerCase() : req.body.email;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email and password are required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const existing = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, phone, passwordHash, role: "CUSTOMER" },
    });

    const token = signToken(user);
    return res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ error: "Something went wrong during registration." });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { password } = req.body;
    const email = req.body.email ? String(req.body.email).trim() : req.body.email;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required." });
    }

    const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = signToken(user);
    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, brandId: user.brandId },
    });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ error: "Something went wrong during login." });
  }
}

// GET /api/auth/me (requires auth)
async function me(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, name: true, email: true, phone: true, role: true, brandId: true, createdAt: true },
  });
  if (!user) return res.status(404).json({ error: "User not found." });
  return res.json({ user });
}

// DELETE /api/auth/me (CUSTOMER) - the customer deletes their own account from the app.
// Personal details are removed; order and payment records stay (needed for tax), no longer
// linked to a name, phone or email.
async function deleteMe(req, res) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: "Account not found." });
    if (user.role !== "CUSTOMER") {
      return res.status(403).json({ error: "Staff and partner accounts are removed by the Godelicious admin." });
    }
    const open = await prisma.order.count({
      where: { userId: user.id, status: { in: ["PENDING", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY"] } },
    });
    if (open > 0) {
      return res.status(409).json({ error: `You have ${open} order${open > 1 ? "s" : ""} in progress. Please wait until ${open > 1 ? "they are" : "it is"} delivered or cancelled, then try again.` });
    }
    const id = user.id;
    const crypto = require("crypto");
    // Each clean-up step is independent, so one missing table never blocks the deletion.
    const steps = [
      () => prisma.favorite.deleteMany({ where: { userId: id } }),
      () => prisma.savedAddress.deleteMany({ where: { userId: id } }),
      () => prisma.deviceToken.deleteMany({ where: { userId: id } }),
      () => prisma.notificationRead.deleteMany({ where: { userId: id } }),
      () => prisma.message.deleteMany({ where: { customerId: id } }),
      () => prisma.subscription.updateMany({ where: { userId: id }, data: { status: "CANCELLED" } }),
    ];
    for (const step of steps) {
      try { await step(); } catch (e) { console.warn("[deleteMe] clean-up step skipped:", e.message); }
    }
    await prisma.user.update({
      where: { id },
      data: {
        name: "Deleted user",
        email: `deleted-${id}@deleted.godelicious.local`,
        phone: null,
        passwordHash: crypto.randomBytes(32).toString("hex"),
        referralCode: null,
        loyaltyPoints: 0,
      },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("deleteMe error:", err);
    res.status(500).json({ error: "Could not delete the account. Please try again or contact us." });
  }
}

module.exports = { register, login, me, deleteMe };
