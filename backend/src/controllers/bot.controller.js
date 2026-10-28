// WhatsApp + Instagram reply assistant: Meta webhook, AI replies, and the admin inbox.
//
// Env vars (Render > backend > Environment):
//   BOT_VERIFY_TOKEN   any secret word you choose; paste the same word into Meta's webhook setup
//   META_APP_SECRET    your Meta app's secret (App settings > Basic); used to check messages really come from Meta
//   WHATSAPP_TOKEN, WHATSAPP_PHONE_ID      WhatsApp Business Platform
//   INSTAGRAM_ACCESS_TOKEN                 Instagram messaging (optional)
//   ANTHROPIC_API_KEY                      the AI
// Switch the assistant on or off in Admin > Conversations (it starts OFF).
const crypto = require("crypto");
const prisma = require("../config/db");
const { makeReply, HANDOFF_REPLY } = require("../services/botBrain.service");
const messaging = require("../services/botMessaging.service");
const { sendWhatsApp } = require("../services/whatsapp.service");

const MAX_BOT_REPLIES_PER_HOUR = 15;

// ---------- Meta webhook ----------
function verifyWebhook(req, res) {
  const token = process.env.BOT_VERIFY_TOKEN;
  if (token && req.query["hub.mode"] === "subscribe" && req.query["hub.verify_token"] === token) {
    return res.status(200).send(String(req.query["hub.challenge"] || ""));
  }
  res.sendStatus(403);
}

function signatureOk(req) {
  const secret = process.env.META_APP_SECRET;
  if (!secret || !req.rawBody) return false;
  const given = String(req.headers["x-hub-signature-256"] || "");
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(req.rawBody).digest("hex");
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Turns Meta's webhook body into plain { channel, contactId, name, text, externalId, nonText } items.
function extractMessages(body) {
  const out = [];
  if (body?.object === "whatsapp_business_account") {
    for (const entry of body.entry || []) {
      for (const ch of entry.changes || []) {
        const v = ch.value || {};
        if (process.env.WHATSAPP_PHONE_ID && v.metadata?.phone_number_id && v.metadata.phone_number_id !== process.env.WHATSAPP_PHONE_ID) continue;
        const names = {};
        for (const c of v.contacts || []) names[c.wa_id] = c.profile?.name;
        for (const m of v.messages || []) {
          out.push({
            channel: "WHATSAPP", contactId: String(m.from), name: names[m.from] || null,
            text: m.type === "text" ? m.text?.body || "" : "", nonText: m.type !== "text", externalId: m.id,
          });
        }
      }
    }
  } else if (body?.object === "instagram") {
    for (const entry of body.entry || []) {
      for (const m of entry.messaging || []) {
        if (m.message?.is_echo || !m.message) continue;
        out.push({
          channel: "INSTAGRAM", contactId: String(m.sender?.id || ""), name: null,
          text: m.message.text || "", nonText: !m.message.text, externalId: m.message.mid,
        });
      }
    }
  }
  return out.filter((m) => m.contactId);
}

async function receiveWebhook(req, res) {
  if (!process.env.META_APP_SECRET) return res.status(503).json({ error: "Not configured." });
  if (!signatureOk(req)) return res.sendStatus(401);
  res.sendStatus(200); // Meta needs a fast answer; the work continues below
  for (const m of extractMessages(req.body)) {
    try {
      await handleIncoming(m);
    } catch (err) {
      console.error("[bot] handling message failed:", err.message);
    }
  }
}

async function handleIncoming(m) {
  if (m.externalId && (await prisma.botMessage.findUnique({ where: { externalId: m.externalId } }))) return; // retry from Meta

  const convo = await prisma.botConversation.upsert({
    where: { channel_contactId: { channel: m.channel, contactId: m.contactId } },
    create: { channel: m.channel, contactId: m.contactId, contactName: m.name },
    update: { lastMessageAt: new Date(), ...(m.name && { contactName: m.name }) },
  });
  const text = m.nonText ? "[The customer sent a photo, voice note or file]" : m.text.slice(0, 2000);
  await prisma.botMessage.create({ data: { conversationId: convo.id, sender: "CUSTOMER", text, externalId: m.externalId || null } });

  const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  if (!settings?.botEnabled || convo.status !== "BOT") {
    // Assistant is off, or a person has this chat: just keep the message for the inbox.
    if (convo.status === "CLOSED") await prisma.botConversation.update({ where: { id: convo.id }, data: { status: "NEEDS_HUMAN", needsReason: "New message after the chat was closed" } });
    return;
  }

  const sentLastHour = await prisma.botMessage.count({
    where: { conversationId: convo.id, sender: "BOT", createdAt: { gt: new Date(Date.now() - 3600 * 1000) } },
  });
  let result;
  if (m.nonText) result = { reply: HANDOFF_REPLY, handoff: true, reason: "Customer sent media" };
  else if (sentLastHour >= MAX_BOT_REPLIES_PER_HOUR) result = { reply: HANDOFF_REPLY, handoff: true, reason: "Too many automatic replies in one hour" };
  else {
    const recent = await prisma.botMessage.findMany({ where: { conversationId: convo.id }, orderBy: { createdAt: "desc" }, take: 12 });
    result = await makeReply({ channel: m.channel, contactId: m.contactId, history: recent.reverse().map((x) => ({ sender: x.sender, text: x.text })) });
  }

  try {
    const sentId = await messaging.sendText(m.channel, m.contactId, result.reply);
    await prisma.botMessage.create({ data: { conversationId: convo.id, sender: "BOT", text: result.reply, externalId: sentId || null } });
  } catch (err) {
    console.error("[bot] send failed:", err.message);
    result.handoff = true;
    result.reason = `Couldn't send the reply: ${err.message}`.slice(0, 200);
  }

  if (result.handoff) {
    await prisma.botConversation.update({ where: { id: convo.id }, data: { status: "NEEDS_HUMAN", needsReason: result.reason || "Needs a person" } });
    if (settings?.adminWhatsapp) {
      sendWhatsApp(settings.adminWhatsapp, `A ${m.channel.toLowerCase()} customer needs you: ${result.reason || "needs a person"}. Open Admin > Conversations.`).catch(() => {});
    }
  }
}

// ---------- Admin inbox ----------
async function status(req, res) {
  const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  res.json({
    botEnabled: Boolean(settings?.botEnabled),
    aiReady: Boolean(process.env.ANTHROPIC_API_KEY),
    whatsappReady: messaging.isConfigured.whatsapp(),
    instagramReady: messaging.isConfigured.instagram(),
    webhookReady: Boolean(process.env.BOT_VERIFY_TOKEN && process.env.META_APP_SECRET),
  });
}

async function setEnabled(req, res) {
  const enabled = Boolean(req.body.enabled);
  await prisma.appSettings.upsert({ where: { id: "singleton" }, create: { id: "singleton", botEnabled: enabled }, update: { botEnabled: enabled } });
  res.json({ botEnabled: enabled });
}

async function listConversations(req, res) {
  const allowed = ["BOT", "NEEDS_HUMAN", "HUMAN", "CLOSED"];
  const where = allowed.includes(req.query.status) ? { status: req.query.status } : {};
  const conversations = await prisma.botConversation.findMany({
    where, orderBy: { lastMessageAt: "desc" }, take: 100,
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  res.json({ conversations });
}

async function getConversation(req, res) {
  const conversation = await prisma.botConversation.findUnique({
    where: { id: req.params.id }, include: { messages: { orderBy: { createdAt: "asc" }, take: 200 } },
  });
  if (!conversation) return res.status(404).json({ error: "Conversation not found." });
  res.json({ conversation });
}

// POST /conversations/:id/reply { text }  - a person answers; the assistant stays quiet in this chat afterwards
async function humanReply(req, res) {
  const text = String(req.body.text || "").trim().slice(0, 1000);
  if (!text) return res.status(400).json({ error: "Type a message first." });
  const convo = await prisma.botConversation.findUnique({ where: { id: req.params.id } });
  if (!convo) return res.status(404).json({ error: "Conversation not found." });
  try {
    const sentId = await messaging.sendText(convo.channel, convo.contactId, text);
    await prisma.botMessage.create({ data: { conversationId: convo.id, sender: "HUMAN", text, externalId: sentId || null } });
    await prisma.botConversation.update({ where: { id: convo.id }, data: { status: "HUMAN", needsReason: null, lastMessageAt: new Date() } });
    res.json({ success: true });
  } catch (err) {
    res.status(502).json({ error: `Couldn't send: ${err.message}. WhatsApp only allows replies within 24 hours of the customer's last message.` });
  }
}

async function setStatus(req, res) {
  const { status: next } = req.body;
  if (!["BOT", "HUMAN", "CLOSED"].includes(next)) return res.status(400).json({ error: "Invalid status." });
  try {
    const c = await prisma.botConversation.update({ where: { id: req.params.id }, data: { status: next, needsReason: null } });
    res.json({ conversation: c });
  } catch (_) {
    res.status(404).json({ error: "Conversation not found." });
  }
}

module.exports = { verifyWebhook, receiveWebhook, extractMessages, handleIncoming, signatureOk, status, setEnabled, listConversations, getConversation, humanReply, setStatus };
