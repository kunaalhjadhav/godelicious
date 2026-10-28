// AI marketing assistant (Phase 1): drafts a week of posts, Reel scripts and Google Business
// updates from the LIVE menu, offers and delivery rules, then keeps them as drafts for the owner
// to edit, approve and post by hand. Nothing is published or sent automatically.
//
// Needs ANTHROPIC_API_KEY on the backend (Render > Environment). Optional:
//   MARKETING_MODEL   (default claude-sonnet-5-5)
//   PUBLIC_WEB_URL    (default https://godelicious.in)
//   FSSAI_NUMBER      (printed at the end of every draft when set)
const prisma = require("../config/db");

const CHANNELS = ["INSTAGRAM", "FACEBOOK", "GOOGLE", "YOUTUBE", "WHATSAPP"];
const KINDS = ["POST", "REEL", "GOOGLE_POST", "SHORT", "BROADCAST"];
const STATUSES = ["DRAFT", "APPROVED", "POSTED"];
const LANGS = ["en", "kn", "both"];
const WEB = () => (process.env.PUBLIC_WEB_URL || "https://godelicious.in").replace(/\/+$/, "");

// Small in-memory limit so a stuck button can't run up API costs.
const recent = [];
function overLimit() {
  const now = Date.now();
  while (recent.length && now - recent[0] > 60 * 60 * 1000) recent.shift();
  if (recent.length >= 12) return true;
  recent.push(now);
  return false;
}

async function gatherFacts() {
  const [items, settings, coupons] = await Promise.all([
    prisma.menuItem.findMany({
      where: { isAvailable: true, isArchived: false, approvalStatus: "APPROVED" },
      include: { category: true, mealBoxItems: { include: { item: true } } },
      orderBy: { name: "asc" },
      take: 60,
    }),
    prisma.appSettings.findUnique({ where: { id: "singleton" } }),
    prisma.coupon.findMany({ where: { isActive: true, isPublic: true }, take: 5 }),
  ]);
  const dishes = items.map((i) => ({
    name: i.name,
    category: i.category?.name,
    priceRupees: i.price,
    soldPerKg: !!i.soldByWeight,
    veg: !!i.isVeg,
    isMealBox: !!i.isMealBox,
    contains: i.isMealBox ? i.mealBoxItems.map((m) => m.item?.name).filter(Boolean) : undefined,
    description: i.description || undefined,
  }));
  return {
    brand: "Godelicious by DS Enterprises, Mysuru",
    website: WEB(),
    deliveryArea: settings?.serviceAreaOn === false ? "not limited" : `within ${settings?.serviceRadiusKm ?? 20} km of Vijayanagar 4th Stage, Mysuru`,
    minimumOrderRupees: settings?.minOrderAmount ?? null,
    mealBoxMinimumMeals: settings?.mealBoxMinQty ?? 10,
    couponMinimumRupees: settings?.couponMinOrder ?? 1000,
    gstPercentAddedOnTop: settings?.gstPercent ?? 5,
    deliveryFeeRupees: settings?.deliveryFee ?? null,
    freeDeliveryAboveRupees: settings?.freeDeliveryAbove ?? null,
    publicCoupons: coupons.map((c) => ({
      code: c.code, title: c.title,
      discount: c.discountType === "PERCENT" ? `${c.discountValue}% off` : `₹${c.discountValue} off`,
      minimumOrderRupees: c.minOrderAmount,
    })),
    dishes,
  };
}

function buildPrompt({ facts, channels, count, language, focus, today }) {
  const langRule = language === "kn"
    ? "Write every post in simple, natural Kannada (Kannada script)."
    : language === "both"
    ? "Write each post in English first, then the same message in simple Kannada (Kannada script), separated by a blank line."
    : "Write in simple, warm English that a Mysuru customer would use.";
  const fssai = process.env.FSSAI_NUMBER ? `End every body with the line: FSSAI Lic. No. ${process.env.FSSAI_NUMBER}` : "";
  const system = [
    "You write social media and Google Business content for a small food business in Mysuru, India.",
    "Use ONLY the facts in the FACTS json. Never invent prices, discounts, dishes, ratings, awards, health or purity claims, or delivery areas. If a fact is missing, leave it out.",
    "State clearly that GST is added on top when you mention a price. Only mention a coupon that is listed in FACTS.",
    "Every post ends with one clear action (order on the website, or message on WhatsApp) and the website address.",
    "Keep captions short and concrete. Reel and Short scripts are 3 to 5 numbered shots with what is shown and what is said, under 30 seconds.",
    "Google Business posts are under 100 words and plain, with no hashtags.",
    "Respond with JSON only and nothing else, in exactly this shape: {\"posts\":[{\"channel\":\"INSTAGRAM|FACEBOOK|GOOGLE|YOUTUBE|WHATSAPP\",\"kind\":\"POST|REEL|GOOGLE_POST|SHORT|BROADCAST\",\"title\":\"short label\",\"body\":\"the text to post or the script\",\"hashtags\":[\"#tag\"],\"visualIdea\":\"what photo or video to use\"}]}",
  ].join("\n");
  const user = [
    `Today is ${today}. Only mention a festival or season if it is within the next 3 weeks and you are sure of it.`,
    `Write exactly ${count} items for these channels: ${channels.join(", ")}. Spread them across the channels and across different dishes, meal boxes and audiences (offices, families, parties).`,
    langRule,
    fssai,
    focus ? `Owner's focus for this batch: ${focus}` : "",
    "FACTS:",
    JSON.stringify(facts),
  ].filter(Boolean).join("\n");
  return { system, user };
}

function parsePosts(text) {
  const a = text.indexOf("{");
  const b = text.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("The assistant did not return usable content. Please try again.");
  const data = JSON.parse(text.slice(a, b + 1));
  if (!Array.isArray(data.posts)) throw new Error("The assistant did not return any posts. Please try again.");
  return data.posts;
}

async function callClaude(system, user, maxTokens = 4000, messages) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    const e = new Error("The AI assistant isn't set up yet. Add ANTHROPIC_API_KEY in the backend settings on Render.");
    e.status = 503;
    throw e;
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.MARKETING_MODEL || "claude-sonnet-5-5",
      max_tokens: maxTokens,
      system,
      messages: messages || [{ role: "user", content: user }],
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[marketing] Anthropic API error:", res.status, data?.error?.message);
    const e = new Error(res.status === 401 ? "The AI key was rejected. Check ANTHROPIC_API_KEY on Render." : "The AI service didn't answer. Please try again in a minute.");
    e.status = 502;
    throw e;
  }
  return (data.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
}

const clip = (v, n) => (v == null ? null : String(v).trim().slice(0, n) || null);

// POST /api/marketing/generate  { channels?, count?, language?, focus? }   (ADMIN)
async function generate(req, res) {
  try {
    if (overLimit()) return res.status(429).json({ error: "That's a lot of requests in one hour. Please wait a little and try again." });
    const channels = (Array.isArray(req.body.channels) ? req.body.channels : ["INSTAGRAM", "FACEBOOK", "GOOGLE", "YOUTUBE"])
      .map((c) => String(c).toUpperCase()).filter((c) => CHANNELS.includes(c));
    if (!channels.length) return res.status(400).json({ error: "Choose at least one channel." });
    const count = Math.max(1, Math.min(10, parseInt(req.body.count, 10) || 7));
    const language = LANGS.includes(req.body.language) ? req.body.language : "en";
    const focus = clip(req.body.focus, 300);

    const facts = await gatherFacts();
    if (!facts.dishes.length) return res.status(400).json({ error: "Add some menu items first, so the assistant has real dishes to write about." });
    const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
    const { system, user } = buildPrompt({ facts, channels, count, language, focus, today });

    const text = await callClaude(system, user);
    let posts;
    try {
      posts = parsePosts(text);
    } catch (_) {
      return res.status(502).json({ error: "The assistant's answer couldn't be read. Please press Generate again." });
    }
    const batchId = `b${Date.now()}`;
    const rows = posts
      .map((p) => ({
        channel: CHANNELS.includes(String(p.channel).toUpperCase()) ? String(p.channel).toUpperCase() : channels[0],
        kind: KINDS.includes(String(p.kind).toUpperCase()) ? String(p.kind).toUpperCase() : "POST",
        language,
        title: clip(p.title, 120),
        body: clip(p.body, 4000),
        hashtags: Array.isArray(p.hashtags) ? clip(p.hashtags.map((h) => String(h).trim()).filter(Boolean).join(" "), 500) : clip(p.hashtags, 500),
        visualIdea: clip(p.visualIdea, 500),
        batchId,
      }))
      .filter((r) => r.body)
      .slice(0, count);
    if (!rows.length) return res.status(502).json({ error: "The assistant returned nothing usable. Please try again." });

    await prisma.marketingDraft.createMany({ data: rows });
    const drafts = await prisma.marketingDraft.findMany({ where: { batchId }, orderBy: { createdAt: "asc" } });
    res.status(201).json({ drafts });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error("[marketing] generate failed:", err);
    res.status(500).json({ error: "Couldn't create the drafts. Please try again." });
  }
}

// GET /api/marketing/drafts?status=   (ADMIN)
async function listDrafts(req, res) {
  const where = STATUSES.includes(req.query.status) ? { status: req.query.status } : {};
  const drafts = await prisma.marketingDraft.findMany({ where, orderBy: { createdAt: "desc" }, take: 300 });
  res.json({ drafts, aiReady: Boolean(process.env.ANTHROPIC_API_KEY) });
}

// PATCH /api/marketing/drafts/:id  { title?, body?, hashtags?, visualIdea?, status? }   (ADMIN)
async function updateDraft(req, res) {
  const { title, body, hashtags, visualIdea, status } = req.body;
  if (status !== undefined && !STATUSES.includes(status)) return res.status(400).json({ error: "Invalid status." });
  if (body !== undefined && !String(body).trim()) return res.status(400).json({ error: "The text can't be empty." });
  try {
    const draft = await prisma.marketingDraft.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title: clip(title, 120) }),
        ...(body !== undefined && { body: clip(body, 4000) }),
        ...(hashtags !== undefined && { hashtags: clip(hashtags, 500) }),
        ...(visualIdea !== undefined && { visualIdea: clip(visualIdea, 500) }),
        ...(status !== undefined && { status }),
      },
    });
    res.json({ draft });
  } catch (_) {
    res.status(404).json({ error: "Draft not found." });
  }
}

// DELETE /api/marketing/drafts/:id   (ADMIN)
async function deleteDraft(req, res) {
  try {
    await prisma.marketingDraft.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (_) {
    res.status(404).json({ error: "Draft not found." });
  }
}

// ---------- Phase 3: where do orders come from? ----------
const SOURCE_LABELS = { app: "Mobile app", direct: "Direct / unknown" };

async function sourceRows(days) {
  const since = new Date(Date.now() - days * 86400000);
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: since }, status: { not: "CANCELLED" } },
    select: { source: true, totalAmount: true, userId: true },
  });
  const map = {};
  for (const o of orders) {
    const key = o.source || "direct";
    const r = (map[key] ||= { source: key, label: SOURCE_LABELS[key] || key, orders: 0, revenueRupees: 0 });
    r.orders += 1;
    r.revenueRupees += o.totalAmount || 0;
  }
  const rows = Object.values(map).map((r) => ({ ...r, revenueRupees: Math.round(r.revenueRupees) })).sort((a, b) => b.orders - a.orders);
  return { rows, totalOrders: orders.length, totalRevenueRupees: rows.reduce((a, r) => a + r.revenueRupees, 0) };
}

// GET /api/marketing/sources?days=30   (ADMIN)
async function sources(req, res) {
  const days = Math.min(365, Math.max(1, parseInt(req.query.days, 10) || 30));
  res.json({ days, ...(await sourceRows(days)) });
}

// POST /api/marketing/summary { days }   (ADMIN) - plain-language weekly summary and suggestions; changes nothing
async function summary(req, res) {
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: "The AI isn't connected yet. Add ANTHROPIC_API_KEY on Render." });
  const days = Math.min(90, Math.max(3, parseInt(req.body?.days, 10) || 7));
  try {
    const now = await sourceRows(days);
    const prevSince = new Date(Date.now() - 2 * days * 86400000);
    const prevOrders = await prisma.order.count({ where: { createdAt: { gte: prevSince, lt: new Date(Date.now() - days * 86400000) }, status: { not: "CANCELLED" } } });
    const drafts = await prisma.marketingDraft.groupBy({ by: ["status"], _count: true });
    const system = [
      "You advise the owner of Godelicious, a small food business in Mysuru, who is not technical. Write a short weekly marketing summary in plain English.",
      "Use ONLY the numbers in DATA. Do not invent figures. Structure: 1) what happened in two sentences, 2) which channels brought orders, 3) three concrete things to do next week (free or low cost first).",
      "You only suggest; never say you changed anything or spent money. If there is little data, say so and suggest how to get tagged links (for example ?ref=instagram in the bio link). Under 200 words, no markdown symbols.",
      "DATA:",
      JSON.stringify({ periodDays: days, thisPeriod: now, ordersInPreviousPeriod: prevOrders, marketingDrafts: drafts.map((d) => ({ status: d.status, count: d._count })) }),
    ].join("\n");
    const text = await callClaude(system, "Write the summary.", 700);
    res.json({ days, summary: text.trim(), data: now });
  } catch (err) {
    console.error("[marketing] summary failed:", err.message);
    res.status(502).json({ error: "Couldn't write the summary right now. Please try again." });
  }
}

module.exports = { sources, summary, generate, listDrafts, updateDraft, deleteDraft, parsePosts, buildPrompt, gatherFacts, callClaude };
