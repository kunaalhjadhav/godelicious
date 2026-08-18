const prisma = require("../config/db");

// POST /api/notifications (ADMIN) - broadcast to all customers
async function createNotification(req, res) {
  const { title, body } = req.body;
  if (!title || !body) return res.status(400).json({ error: "title and body are required." });

  const notification = await prisma.notification.create({ data: { title, body } });
  res.status(201).json({ notification });
}

// GET /api/notifications (ADMIN) - sent history
async function listNotifications(req, res) {
  const notifications = await prisma.notification.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ notifications });
}

// GET /api/notifications/my (CUSTOMER) - feed with per-user read status
async function myNotifications(req, res) {
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    include: { reads: { where: { userId: req.user.id } } },
    take: 50,
  });
  const withReadFlag = notifications.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    createdAt: n.createdAt,
    isRead: n.reads.length > 0,
  }));
  res.json({ notifications: withReadFlag });
}

// POST /api/notifications/:id/read (CUSTOMER)
async function markRead(req, res) {
  await prisma.notificationRead.upsert({
    where: { notificationId_userId: { notificationId: req.params.id, userId: req.user.id } },
    update: {},
    create: { notificationId: req.params.id, userId: req.user.id },
  });
  res.json({ success: true });
}

module.exports = { createNotification, listNotifications, myNotifications, markRead };
