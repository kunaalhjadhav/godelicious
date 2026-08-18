const bcrypt = require("bcryptjs");
const prisma = require("../config/db");

// GET /api/users (ADMIN only) - list all users, optionally filter by role
async function listUsers(req, res) {
  const { role } = req.query;
  const users = await prisma.user.findMany({
    where: role ? { role } : undefined,
    select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ users });
}

// POST /api/users (ADMIN only) - create a STAFF, ADMIN, or VENUE_PARTNER account
async function createUser(req, res) {
  try {
    const { name, email, password, phone, role } = req.body;
    const allowedRoles = ["ADMIN", "STAFF", "VENUE_PARTNER", "CUSTOMER"];

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "name, email, password and role are required." });
    }
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: `role must be one of ${allowedRoles.join(", ")}` });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, phone, passwordHash, role },
    });

    res.status(201).json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("createUser error:", err);
    res.status(500).json({ error: "Could not create user." });
  }
}

// PATCH /api/users/:id/role (ADMIN only)
async function updateUserRole(req, res) {
  const { id } = req.params;
  const { role } = req.body;
  const allowedRoles = ["ADMIN", "STAFF", "VENUE_PARTNER", "CUSTOMER"];

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: `role must be one of ${allowedRoles.join(", ")}` });
  }

  const user = await prisma.user.update({ where: { id }, data: { role } });
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}

module.exports = { listUsers, createUser, updateUserRole };
