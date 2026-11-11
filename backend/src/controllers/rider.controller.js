// Delivery partner (rider) app API. Riders sign in with role DELIVERY_PARTNER.
const bcrypt = require("bcryptjs");
const prisma = require("../config/db");
const { signToken } = require("../utils/jwt");
const { changeStatus, newOtp } = require("../services/orderActions.service");
const notify = require("../services/notify.service");

const ACTIVE = ["PENDING", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY"];

async function myPartner(req) {
  return prisma.deliveryPartner.findUnique({ where: { userId: req.user.id } });
}

// What a rider may see about an order: never the delivery OTP.
function riderView(o, pay) {
  return {
    id: o.id, code: String(o.id).slice(0, 8).toUpperCase(), status: o.status, assignStatus: o.assignStatus,
    customerName: o.user?.name || "Customer", contactPhone: o.contactPhone,
    deliveryAddress: o.deliveryAddress, latitude: o.latitude, longitude: o.longitude,
    eventDate: o.eventDate, eventTime: o.eventTime, notes: o.notes,
    totalAmount: o.totalAmount, paymentMethod: o.paymentMethod, paymentStatus: o.paymentStatus,
    cashToCollect: o.paymentMethod === "COD" && o.paymentStatus !== "PAID"
      ? Math.max(0, o.totalAmount - (o.advancePaid ? o.advanceAmount || 0 : 0)) : 0,
    items: (o.items || []).map((i) => ({ name: i.menuItem?.name, quantity: i.quantity, soldByWeight: i.menuItem?.soldByWeight })),
    pickedUpAt: o.pickedUpAt, deliveredAt: o.deliveredAt, cashCollected: o.cashCollected, earning: pay,
  };
}
const orderInclude = { items: { include: { menuItem: { select: { name: true, soldByWeight: true } } } }, user: { select: { name: true } } };
async function payPerOrder() {
  const s = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  return s?.riderPayPerOrder ?? 40;
}

// POST /api/rider/register
async function register(req, res) {
  try {
    const { name, phone, email, password, vehicleType, vehicleNumber, photoUrl, licenceUrl, rcUrl, idProofUrl } = req.body || {};
    const mail = String(email || "").trim().toLowerCase();
    const ph = String(phone || "").replace(/\D/g, "").slice(-10);
    if (!name || !mail || !password || ph.length !== 10) {
      return res.status(400).json({ error: "Name, a 10-digit mobile number, email and password are required." });
    }
    if (String(password).length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });
    if (await prisma.user.findFirst({ where: { email: { equals: mail, mode: "insensitive" } } })) {
      return res.status(409).json({ error: "This email is already registered. Please sign in." });
    }
    const passwordHash = await bcrypt.hash(String(password), 10);
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { name, email: mail, phone: ph, passwordHash, role: "DELIVERY_PARTNER" } });
      const partner = await tx.deliveryPartner.create({
        data: { name, phone: ph, userId: user.id, status: "PENDING", vehicleType, vehicleNumber, photoUrl, licenceUrl, rcUrl, idProofUrl },
      });
      return { user, partner };
    });
    notify.notifyNewRider(result.partner.id).catch(() => {});
    res.status(201).json({ token: signToken(result.user), user: { id: result.user.id, name, email: mail, role: "DELIVERY_PARTNER" }, partner: result.partner });
  } catch (err) {
    console.error("rider register error:", err);
    res.status(500).json({ error: "Could not register. Please try again." });
  }
}

// GET /api/rider/me
async function me(req, res) {
  const p = await myPartner(req);
  if (!p) return res.status(404).json({ error: "Rider profile not found." });
  const pay = await payPerOrder();
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const today = await prisma.order.findMany({ where: { deliveryPartnerId: p.id, status: "DELIVERED", deliveredAt: { gte: start } }, select: { cashCollected: true } });
  res.json({
    partner: p,
    today: { deliveries: today.length, earnings: today.length * pay, cash: today.reduce((s, o) => s + (o.cashCollected || 0), 0) },
    payPerOrder: pay,
  });
}

// PATCH /api/rider/me  (profile and documents)
async function updateMe(req, res) {
  const p = await myPartner(req);
  if (!p) return res.status(404).json({ error: "Rider profile not found." });
  const fields = ["name", "vehicleType", "vehicleNumber", "photoUrl", "licenceUrl", "rcUrl", "idProofUrl"];
  const data = {};
  for (const f of fields) if (req.body[f] !== undefined) data[f] = req.body[f] || null;
  if (data.name === null) delete data.name;
  const partner = await prisma.deliveryPartner.update({ where: { id: p.id }, data });
  res.json({ partner });
}

// POST /api/rider/online { online }
async function setOnline(req, res) {
  const p = await myPartner(req);
  if (!p) return res.status(404).json({ error: "Rider profile not found." });
  if (req.body.online && p.status !== "APPROVED") {
    return res.status(403).json({ error: p.status === "PENDING" ? "Your account is waiting for approval." : "Your account is suspended. Please contact Godelicious." });
  }
  const partner = await prisma.deliveryPartner.update({ where: { id: p.id }, data: { isOnline: Boolean(req.body.online), lastSeenAt: new Date() } });
  res.json({ partner });
}

// POST /api/rider/location { lat, lng }
async function location(req, res) {
  const lat = Number(req.body?.lat), lng = Number(req.body?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return res.status(400).json({ error: "Invalid location." });
  }
  const p = await myPartner(req);
  if (!p) return res.status(404).json({ error: "Rider profile not found." });
  await prisma.deliveryPartner.update({ where: { id: p.id }, data: { lastLat: lat, lastLng: lng, lastSeenAt: new Date() } });
  res.json({ ok: true });
}

// GET /api/rider/orders  -> offers, active, recent
async function orders(req, res) {
  const p = await myPartner(req);
  if (!p) return res.status(404).json({ error: "Rider profile not found." });
  const pay = await payPerOrder();
  const mine = await prisma.order.findMany({
    where: { deliveryPartnerId: p.id, OR: [{ status: { in: ACTIVE } }, { deliveredAt: { gte: new Date(Date.now() - 2 * 86400000) } }] },
    include: orderInclude, orderBy: { eventDate: "asc" },
  });
  res.json({
    offers: mine.filter((o) => o.assignStatus === "OFFERED" && ACTIVE.includes(o.status)).map((o) => riderView(o, pay)),
    active: mine.filter((o) => o.assignStatus === "ACCEPTED" && ACTIVE.includes(o.status)).map((o) => riderView(o, pay)),
    recent: mine.filter((o) => o.status === "DELIVERED").map((o) => riderView(o, pay)),
  });
}

async function ownOrder(req, res) {
  const p = await myPartner(req);
  if (!p) { res.status(404).json({ error: "Rider profile not found." }); return {}; }
  const o = await prisma.order.findUnique({ where: { id: req.params.id }, include: orderInclude });
  if (!o || o.deliveryPartnerId !== p.id) { res.status(404).json({ error: "Order not found." }); return {}; }
  return { p, o };
}

// POST /api/rider/orders/:id/accept
async function accept(req, res) {
  const { p, o } = await ownOrder(req, res); if (!o) return;
  if (o.assignStatus !== "OFFERED") return res.status(400).json({ error: "This order is no longer waiting for you." });
  await prisma.order.update({ where: { id: o.id }, data: { assignStatus: "ACCEPTED", riderAcceptedAt: new Date() } });
  notify.notifyRiderDecision(o.id, p.name, true).catch(() => {});
  res.json({ ok: true });
}

// POST /api/rider/orders/:id/reject { reason }
async function reject(req, res) {
  const { p, o } = await ownOrder(req, res); if (!o) return;
  if (o.assignStatus !== "OFFERED") return res.status(400).json({ error: "This order is no longer waiting for you." });
  await prisma.order.update({ where: { id: o.id }, data: { assignStatus: "REJECTED", deliveryPartnerId: null } });
  notify.notifyRiderDecision(o.id, p.name, false, String(req.body?.reason || "").slice(0, 200)).catch(() => {});
  res.json({ ok: true });
}

// POST /api/rider/orders/:id/pickup  -> out for delivery, customer gets the delivery code
async function pickup(req, res) {
  const { o } = await ownOrder(req, res); if (!o) return;
  if (o.assignStatus !== "ACCEPTED") return res.status(400).json({ error: "Accept the order first." });
  if (o.status === "OUT_FOR_DELIVERY") return res.json({ ok: true });
  if (!["CONFIRMED", "PREPARING", "PENDING"].includes(o.status)) return res.status(400).json({ error: "This order can't be picked up now." });
  await prisma.order.update({ where: { id: o.id }, data: { pickedUpAt: new Date(), deliveryOtp: o.deliveryOtp || newOtp() } });
  const r = await changeStatus(o.id, "OUT_FOR_DELIVERY", req.user.id);
  if (!r.ok) return res.status(400).json({ error: r.error });
  notify.notifyDeliveryCode(o.id).catch(() => {});
  res.json({ ok: true });
}

// POST /api/rider/orders/:id/deliver { otp, cashCollected }
async function deliver(req, res) {
  const { o } = await ownOrder(req, res); if (!o) return;
  if (o.status !== "OUT_FOR_DELIVERY") return res.status(400).json({ error: "Mark the order as picked up first." });
  if (o.deliveryOtp && String(req.body?.otp || "").trim() !== o.deliveryOtp) {
    return res.status(400).json({ error: "That delivery code is not right. Ask the customer for the 4-digit code." });
  }
  const due = o.paymentMethod === "COD" && o.paymentStatus !== "PAID"
    ? Math.max(0, o.totalAmount - (o.advancePaid ? o.advanceAmount || 0 : 0)) : 0;
  const cash = Math.max(0, Number(req.body?.cashCollected) || 0);
  if (due > 0 && cash + 1 < due) {
    return res.status(400).json({ error: `Collect Rs ${Math.round(due)} in cash before completing this delivery.` });
  }
  await prisma.order.update({
    where: { id: o.id },
    data: {
      deliveredAt: new Date(), cashCollected: cash,
      ...(due > 0 && { paymentStatus: "PAID", codConfirmedAt: new Date(), codConfirmedBy: req.user.id }),
    },
  });
  const r = await changeStatus(o.id, "DELIVERED", req.user.id);
  if (!r.ok) return res.status(400).json({ error: r.error });
  res.json({ ok: true });
}

// GET /api/rider/earnings?days=7
async function earnings(req, res) {
  const p = await myPartner(req);
  if (!p) return res.status(404).json({ error: "Rider profile not found." });
  const days = Math.min(90, Math.max(1, Number(req.query.days) || 7));
  const from = new Date(Date.now() - days * 86400000);
  const pay = await payPerOrder();
  const done = await prisma.order.findMany({
    where: { deliveryPartnerId: p.id, status: "DELIVERED", deliveredAt: { gte: from } },
    select: { id: true, deliveredAt: true, cashCollected: true, totalAmount: true, deliveryAddress: true },
    orderBy: { deliveredAt: "desc" },
  });
  res.json({
    days, payPerOrder: pay,
    deliveries: done.length, earnings: done.length * pay,
    cashCollected: done.reduce((s, o) => s + (o.cashCollected || 0), 0),
    orders: done.map((o) => ({ ...o, code: String(o.id).slice(0, 8).toUpperCase(), earning: pay })),
  });
}

module.exports = { register, me, updateMe, setOnline, location, orders, accept, reject, pickup, deliver, earnings };
