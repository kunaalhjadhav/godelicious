const prisma = require("../config/db");
const { sendPushToUser } = require("../services/push.service");

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

  // Notify every admin/staff device — there's no single "admin inbox" user,
  // so this fans out to whichever staff accounts have push registered.
  prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } })
    .then((sender) =>
      prisma.user.findMany({ where: { role: { in: ["ADMIN", "STAFF"] } }, select: { id: true } })
        .then((admins) => Promise.allSettled(admins.map((a) => sendPushToUser(a.id, {
          title: `New message from ${sender?.name || "a customer"}`,
          body: body.trim().slice(0, 100),
          data: { type: "chat_message", customerId: req.user.id },
        }))))
    )
    .catch((err) => console.error("Push send failed (customer chat):", err.message));

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

  sendPushToUser(req.params.customerId, {
    title: "New message from support",
    body: body.trim().slice(0, 100),
    data: { type: "chat_message" },
  }).catch((err) => console.error("Push send failed (chat reply):", err.message));

  res.status(201).json({ message });
}

module.exports = { myMessages, sendMyMessage, listThreads, getThread, replyToThread };


// ---------- translation for the chat (Kannada <-> English) ----------
const trCache = new Map();           // "to|text" -> translated text
const trUsage = new Map();           // userId -> { count, resetAt }

// POST /api/chat/translate { text, to: "kn" | "en" }
async function translate(req, res) {
  try {
    const text = String(req.body?.text || "").trim().slice(0, 1000);
    const to = req.body?.to === "en" ? "en" : "kn";
    if (!text) return res.status(400).json({ error: "Nothing to translate." });

    const cached = trCache.get(`${to}|${text}`);
    if (cached) return res.json({ text: cached, to });

    const now = Date.now();
    const u = trUsage.get(req.user.id) || { count: 0, resetAt: now + 60 * 60 * 1000 };
    if (u.resetAt < now) { u.count = 0; u.resetAt = now + 60 * 60 * 1000; }
    if (u.count >= 60) return res.status(429).json({ error: "Too many translations. Please try again in a while." });
    u.count += 1; trUsage.set(req.user.id, u);

    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return res.status(503).json({ error: "Translation isn't switched on yet." });

    const target = to === "kn" ? "Kannada (in Kannada script)" : "English";
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.TRANSLATE_MODEL || process.env.MARKETING_MODEL || "claude-sonnet-5-5",
        max_tokens: 800,
        system: `You translate customer chat messages for a food and catering company in Mysuru. Translate the user's message into ${target}. Keep names, numbers, prices and order codes unchanged. Reply with the translation only, no notes.`,
        messages: [{ role: "user", content: text }],
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error("[chat translate] Anthropic error:", r.status, data?.error?.message);
      return res.status(502).json({ error: "Could not translate right now. Please try again." });
    }
    const out = (data.content || []).filter((c) => c.type === "text").map((c) => c.text).join("").trim();
    if (!out) return res.status(502).json({ error: "Could not translate right now. Please try again." });
    if (trCache.size > 500) trCache.clear();
    trCache.set(`${to}|${text}`, out);
    res.json({ text: out, to });
  } catch (err) {
    console.error("[chat translate] error:", err.message);
    res.status(500).json({ error: "Could not translate right now." });
  }
}

module.exports.translate = translate;
