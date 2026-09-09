const prisma = require("../config/db");

// POST /api/devices/register (authenticated)
// body: { token, platform }
// Called by the client after getting a Firebase Cloud Messaging token, so
// the backend knows where to push notifications for this user.
async function registerDevice(req, res) {
  const { token, platform } = req.body;
  if (!token || !platform) return res.status(400).json({ error: "token and platform are required." });

  // A token can migrate between accounts (e.g. shared device, re-login as a
  // different user) — upsert on the token itself so it always points at
  // whoever most recently registered it.
  await prisma.deviceToken.upsert({
    where: { token },
    update: { userId: req.user.id, platform },
    create: { token, platform, userId: req.user.id },
  });
  res.status(201).json({ success: true });
}

// DELETE /api/devices/register (authenticated) — called on logout so a
// signed-out device stops receiving pushes meant for that account.
async function unregisterDevice(req, res) {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "token is required." });
  await prisma.deviceToken.deleteMany({ where: { token, userId: req.user.id } });
  res.json({ success: true });
}

module.exports = { registerDevice, unregisterDevice };
