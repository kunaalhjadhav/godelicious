const prisma = require("../config/db");

// GET /api/chat/my (CUSTOMER) - the logged-in customer's own thread
async function myMessages(req, res) {
  const messages = await prisma.message.findMany({
    where: { customerId: req.user.id },
    orderBy: { createdAt: "asc" },
  });
  // mark admin messages as read by this customer as they view the thread
  await prisma.message.updateMany({
    where: { customerId: req.user.id, senderRole: "ADMIN", readByCustomer: false },
    data: { readByCustomer: true },
  });
  res.json({ messages });
}

// POST /api/chat/my (CUSTOMER) - send a message in your own thread
async function sendMyMessage(req, res) {
  const { body } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: "Message body is required." });

  const message = await prisma.message.create({
    data: { customerId: req.user.id, senderId: req.user.id, senderRole: "CUSTOMER", body: body.trim() },
  });
  res.status(201).json({ message });
}

// GET /api/chat/threads (ADMIN/STAFF) - one row per customer with an unread count
async function listThreads(req, res) {
  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER", messages: { some: {} } },
    select: {
      id: true,
      name: true,
      email: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: {
        select: { messages: { where: { senderRole: "CUSTOMER", readByAdmin: false } } },
      },
    },
  });

  const threads = customers
    .map((c) => ({
      customerId: c.id,
      customerName: c.name,
      customerEmail: c.email,
      lastMessage: c.messages[0] || null,
      unreadCount: c._count.messages,
    }))
    .sort((a, b) => new Date(b.lastMessage?.createdAt || 0) - new Date(a.lastMessage?.createdAt || 0));

  res.json({ threads });
}

// GET /api/chat/threads/:customerId (ADMIN/STAFF)
async function getThread(req, res) {
  const messages = await prisma.message.findMany({
    where: { customerId: req.params.customerId },
    orderBy: { createdAt: "asc" },
  });
  await prisma.message.updateMany({
    where: { customerId: req.params.customerId, senderRole: "CUSTOMER", readByAdmin: false },
    data: { readByAdmin: true },
  });
  res.json({ messages });
}

// POST /api/chat/threads/:customerId (ADMIN/STAFF) - reply to a customer
async function replyToThread(req, res) {
  const { body } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: "Message body is required." });

  const message = await prisma.message.create({
    data: {
      customerId: req.params.customerId,
      senderId: req.user.id,
      senderRole: "ADMIN",
      body: body.trim(),
    },
  });
  res.status(201).json({ message });
}

module.exports = { myMessages, sendMyMessage, listThreads, getThread, replyToThread };
