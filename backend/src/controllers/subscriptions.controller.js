const prisma = require("../config/db");
const {
  SLOTS, parseJson, cutoffFor, weeklyQuote, upcomingDates, generateDueOrders,
} = require("../services/subscription.service");
const { istYmd, addDaysYmd, dateFromYmd } = require("../utils/ist");

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function shape(sub, now = new Date()) {
  const days = parseJson(sub.days, []);
  return {
    id: sub.id, status: sub.status, boxesPerDay: sub.boxesPerDay, days, timeSlot: sub.timeSlot,
    address: sub.address, phone: sub.phone, startDate: sub.startDate, pausedUntil: sub.pausedUntil,
    discountPct: sub.discountPct, createdAt: sub.createdAt,
    menuItem: sub.menuItem ? {
      id: sub.menuItem.id, name: sub.menuItem.name, price: sub.menuItem.price, imageUrl: sub.menuItem.imageUrl, isVeg: sub.menuItem.isVeg,
    } : undefined,
    weekly: sub.menuItem ? weeklyQuote(sub.menuItem.price, sub.boxesPerDay, days.length, sub.discountPct) : undefined,
    upcoming: upcomingDates(sub, 6, now),
  };
}

// GET /api/subscriptions/plans - what can be subscribed to, and the saving
async function plans(req, res) {
  const [items, settings] = await Promise.all([
    prisma.menuItem.findMany({
      where: { plannerRole: "MAIN", approvalStatus: "APPROVED", isAvailable: true, soldByWeight: false },
      select: { id: true, name: true, description: true, price: true, imageUrl: true, isVeg: true },
      orderBy: { price: "asc" },
    }),
    prisma.appSettings.upsert({ where: { id: "singleton" }, update: {}, create: { id: "singleton" } }),
  ]);
  res.json({ items, discountPct: settings.subscriptionDiscountPct, slots: SLOTS, firstDelivery: addDaysYmd(istYmd(), 1) });
}

// POST /api/subscriptions
// body: { menuItemId, boxesPerDay, days:[1,2,3,4,5], timeSlot, address, phone, latitude?, longitude? }
async function create(req, res) {
  const { menuItemId, address, phone, latitude, longitude } = req.body;
  const boxesPerDay = Math.floor(Number(req.body.boxesPerDay));
  const days = [...new Set((req.body.days || []).map(Number))].filter((d) => d >= 0 && d <= 6).sort();
  const timeSlot = req.body.timeSlot;

  if (!menuItemId) return res.status(400).json({ error: "Choose a meal box." });
  if (!boxesPerDay || boxesPerDay < 1 || boxesPerDay > 500) return res.status(400).json({ error: "Boxes per day must be between 1 and 500." });
  if (days.length === 0) return res.status(400).json({ error: "Pick at least one delivery day." });
  if (!SLOTS.includes(timeSlot)) return res.status(400).json({ error: "Pick a delivery time." });
  if (!address || !phone) return res.status(400).json({ error: "Delivery address and phone are required." });

  const item = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
  if (!item || item.plannerRole !== "MAIN" || item.approvalStatus !== "APPROVED" || item.soldByWeight) {
    return res.status(400).json({ error: "That item cannot be subscribed to." });
  }
  const active = await prisma.subscription.count({ where: { userId: req.user.id, status: { in: ["ACTIVE", "PAUSED"] } } });
  if (active >= 3) return res.status(400).json({ error: "You can have up to 3 weekly plans." });

  const settings = await prisma.appSettings.upsert({ where: { id: "singleton" }, update: {}, create: { id: "singleton" } });
  const tomorrow = addDaysYmd(istYmd(), 1);
  const startYmd = YMD.test(req.body.startDate || "") && req.body.startDate >= tomorrow ? req.body.startDate : tomorrow;

  const sub = await prisma.subscription.create({
    data: {
      userId: req.user.id, menuItemId, boxesPerDay, days: JSON.stringify(days), timeSlot,
      address: String(address).trim(), phone: String(phone).trim(),
      latitude: latitude !== undefined && latitude !== null ? Number(latitude) : null,
      longitude: longitude !== undefined && longitude !== null ? Number(longitude) : null,
      startDate: dateFromYmd(startYmd), discountPct: settings.subscriptionDiscountPct,
    },
    include: { menuItem: true },
  });
  res.status(201).json({ subscription: shape(sub) });
}

// GET /api/subscriptions/my
async function mine(req, res) {
  const subs = await prisma.subscription.findMany({
    where: { userId: req.user.id, status: { not: "CANCELLED" } },
    include: { menuItem: true }, orderBy: { createdAt: "desc" },
  });
  res.json({ subscriptions: subs.map((s) => shape(s)) });
}

async function ownSub(req) {
  return prisma.subscription.findFirst({ where: { id: req.params.id, userId: req.user.id }, include: { menuItem: true } });
}

// PATCH /api/subscriptions/:id
// body: any of { status: "ACTIVE"|"PAUSED"|"CANCELLED", pausedUntil?: "YYYY-MM-DD", boxesPerDay, days, timeSlot, address, phone }
async function update(req, res) {
  const sub = await ownSub(req);
  if (!sub || sub.status === "CANCELLED") return res.status(404).json({ error: "Plan not found." });
  const data = {};
  const b = req.body;

  if (b.status !== undefined) {
    if (!["ACTIVE", "PAUSED", "CANCELLED"].includes(b.status)) return res.status(400).json({ error: "Invalid status." });
    data.status = b.status;
    data.pausedUntil = b.status === "PAUSED" && YMD.test(b.pausedUntil || "") ? dateFromYmd(b.pausedUntil) : null;
  }
  if (b.boxesPerDay !== undefined) {
    const n = Math.floor(Number(b.boxesPerDay));
    if (!n || n < 1 || n > 500) return res.status(400).json({ error: "Boxes per day must be between 1 and 500." });
    data.boxesPerDay = n;
  }
  if (b.days !== undefined) {
    const days = [...new Set((b.days || []).map(Number))].filter((d) => d >= 0 && d <= 6).sort();
    if (days.length === 0) return res.status(400).json({ error: "Pick at least one delivery day." });
    data.days = JSON.stringify(days);
  }
  if (b.timeSlot !== undefined) {
    if (!SLOTS.includes(b.timeSlot)) return res.status(400).json({ error: "Pick a delivery time." });
    data.timeSlot = b.timeSlot;
  }
  if (b.address !== undefined && String(b.address).trim()) data.address = String(b.address).trim();
  if (b.phone !== undefined && String(b.phone).trim()) data.phone = String(b.phone).trim();

  const updated = await prisma.subscription.update({ where: { id: sub.id }, data, include: { menuItem: true } });
  res.json({ subscription: shape(updated) });
}

// POST /api/subscriptions/:id/skip { date }   |   DELETE /api/subscriptions/:id/skip/:date
async function setSkip(req, res, skip) {
  const sub = await ownSub(req);
  if (!sub || sub.status === "CANCELLED") return res.status(404).json({ error: "Plan not found." });
  const ymd = skip ? req.body.date : req.params.date;
  if (!YMD.test(ymd || "")) return res.status(400).json({ error: "date must look like 2026-10-14." });
  if (new Date() >= cutoffFor(ymd)) {
    return res.status(400).json({ error: "Too late to change this day. Changes close at 6 PM the day before." });
  }
  const skips = new Set(parseJson(sub.skipDates, []));
  if (skip) skips.add(ymd); else skips.delete(ymd);
  const updated = await prisma.subscription.update({
    where: { id: sub.id }, data: { skipDates: JSON.stringify([...skips].sort()) }, include: { menuItem: true },
  });
  res.json({ subscription: shape(updated) });
}
const skip = (req, res) => setSkip(req, res, true);
const unskip = (req, res) => setSkip(req, res, false);

// ----- Admin -----

// GET /api/subscriptions/admin/all
async function adminAll(req, res) {
  const subs = await prisma.subscription.findMany({
    include: { menuItem: true, user: { select: { id: true, name: true, phone: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({
    subscriptions: subs.map((s) => ({ ...shape(s), user: s.user })),
  });
}

// PATCH /api/subscriptions/admin/:id { status }
async function adminSetStatus(req, res) {
  const { status } = req.body;
  if (!["ACTIVE", "PAUSED", "CANCELLED"].includes(status)) return res.status(400).json({ error: "Invalid status." });
  const sub = await prisma.subscription.update({
    where: { id: req.params.id }, data: { status, pausedUntil: null }, include: { menuItem: true },
  });
  res.json({ subscription: shape(sub) });
}

// POST /api/subscriptions/admin/run - create due orders right now instead of waiting for the timer
async function adminRun(req, res) {
  const created = await generateDueOrders();
  res.json({ created });
}

module.exports = { plans, create, mine, update, skip, unskip, adminAll, adminSetStatus, adminRun };
