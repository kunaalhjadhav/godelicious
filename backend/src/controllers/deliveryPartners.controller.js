const bcrypt = require("bcryptjs");
const prisma = require("../config/db");
const { assignOrder } = require("../services/orderActions.service");

const ACTIVE = ["PENDING", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY"];
const userSel = { select: { id: true, email: true } };

// GET /api/delivery-partners (ADMIN/STAFF) - approved and active, online first, for the assign dropdown
async function listActivePartners(req, res) {
  const partners = await prisma.deliveryPartner.findMany({
    where: { isActive: true, status: "APPROVED" },
    orderBy: [{ isOnline: "desc" }, { name: "asc" }],
    include: { _count: { select: { orders: { where: { status: { in: ACTIVE } } } } } },
  });
  res.json({ partners: partners.map(({ _count, ...p }) => ({ ...p, activeOrders: _count.orders, hasApp: Boolean(p.userId) })) });
}

// GET /api/delivery-partners/all (ADMIN)
async function listAllPartners(req, res) {
  const partners = await prisma.deliveryPartner.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: { user: userSel, _count: { select: { orders: { where: { status: { in: ACTIVE } } } } } },
  });
  const done = await prisma.order.groupBy({ by: ["deliveryPartnerId"], where: { status: "DELIVERED", deliveryPartnerId: { not: null } }, _count: { _all: true } });
  const doneMap = Object.fromEntries(done.map((d) => [d.deliveryPartnerId, d._count._all]));
  res.json({
    partners: partners.map(({ _count, ...p }) => ({ ...p, loginEmail: p.user?.email || null, activeOrders: _count.orders, delivered: doneMap[p.id] || 0 })),
  });
}

// POST /api/delivery-partners (ADMIN) { name, phone, email?, password?, vehicleType?, vehicleNumber? }
// With email + password the rider also gets an app login; approved straight away.
async function createPartner(req, res) {
  const { name, phone, email, password, vehicleType, vehicleNumber } = req.body;
  if (!name || !phone) return res.status(400).json({ error: "Name and phone are required." });
  try {
    let userId = null;
    if (email || password) {
      const mail = String(email || "").trim().toLowerCase();
      if (!mail || String(password || "").length < 6) return res.status(400).json({ error: "For an app login, give an email and a password of at least 6 characters." });
      if (await prisma.user.findFirst({ where: { email: { equals: mail, mode: "insensitive" } } })) {
        return res.status(409).json({ error: "This email is already used by another account." });
      }
      const u = await prisma.user.create({
        data: { name, email: mail, phone: String(phone).replace(/\D/g, "").slice(-10), passwordHash: await bcrypt.hash(String(password), 10), role: "DELIVERY_PARTNER" },
      });
      userId = u.id;
    }
    const partner = await prisma.deliveryPartner.create({ data: { name, phone, userId, status: "APPROVED", vehicleType, vehicleNumber } });
    res.status(201).json({ partner });
  } catch (err) {
    console.error("createPartner error:", err);
    res.status(500).json({ error: "Could not add the delivery partner." });
  }
}

// PATCH /api/delivery-partners/:id (ADMIN) { name, phone, isActive, status, vehicleType, vehicleNumber, password }
async function updatePartner(req, res) {
  const { name, phone, isActive, status, vehicleType, vehicleNumber, password, email } = req.body;
  const before = await prisma.deliveryPartner.findUnique({ where: { id: req.params.id } });
  if (!before) return res.status(404).json({ error: "Delivery partner not found." });
  if (status && !["PENDING", "APPROVED", "SUSPENDED"].includes(status)) return res.status(400).json({ error: "Invalid status." });
  const partner = await prisma.deliveryPartner.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(phone !== undefined && { phone }),
      ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      ...(status !== undefined && { status, ...(status !== "APPROVED" && { isOnline: false }) }),
      ...(vehicleType !== undefined && { vehicleType }),
      ...(vehicleNumber !== undefined && { vehicleNumber }),
    },
  });
  if (password && !before.userId) {
    // Give an existing (WhatsApp-only) rider a login for the rider app.
    const mail = String(email || "").trim().toLowerCase();
    if (!mail || String(password).length < 6) return res.status(400).json({ error: "Give an email and a password of at least 6 characters." });
    if (await prisma.user.findFirst({ where: { email: { equals: mail, mode: "insensitive" } } })) {
      return res.status(409).json({ error: "This email is already used by another account." });
    }
    const u = await prisma.user.create({
      data: { name: partner.name, email: mail, phone: String(partner.phone).replace(/\D/g, "").slice(-10), passwordHash: await bcrypt.hash(String(password), 10), role: "DELIVERY_PARTNER" },
    });
    await prisma.deliveryPartner.update({ where: { id: partner.id }, data: { userId: u.id } });
  } else if (password && before.userId) {
    if (String(password).length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });
    await prisma.user.update({ where: { id: before.userId }, data: { passwordHash: await bcrypt.hash(String(password), 10) } });
  }
  if (status && status !== before.status) {
    require("../services/notify.service").notifyRiderStatus(partner.id).catch(() => {});
  }
  res.json({ partner });
}

// DELETE /api/delivery-partners/:id (ADMIN)
async function deletePartner(req, res) {
  const busy = await prisma.order.count({ where: { deliveryPartnerId: req.params.id, status: { in: ACTIVE } } });
  if (busy) return res.status(409).json({ error: `This partner has ${busy} active order(s). Re-assign them first, or switch the partner off instead.` });
  await prisma.order.updateMany({ where: { deliveryPartnerId: req.params.id }, data: { deliveryPartnerId: null } });
  await prisma.deliveryPartner.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}

// POST /api/delivery-partners/assign/:orderId (ADMIN/STAFF) { partnerId }
async function assign(req, res) {
  try {
    const order = await assignOrder(req.params.orderId, req.body.partnerId);
    res.json({ order });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// POST /api/delivery-partners/unassign/:orderId (ADMIN/STAFF)
async function unassign(req, res) {
  const order = await prisma.order.update({
    where: { id: req.params.orderId },
    data: { deliveryPartnerId: null, assignStatus: null, riderAcceptedAt: null },
  });
  res.json({ order });
}

// GET /api/delivery-partners/live (ADMIN/STAFF) - riders and active orders for the live map
async function live(req, res) {
  const riders = await prisma.deliveryPartner.findMany({
    where: { status: "APPROVED", isActive: true },
    select: { id: true, name: true, phone: true, vehicleType: true, vehicleNumber: true, isOnline: true, lastLat: true, lastLng: true, lastSeenAt: true },
  });
  const orders = await prisma.order.findMany({
    where: { status: { in: ACTIVE } },
    select: {
      id: true, status: true, assignStatus: true, deliveryPartnerId: true, latitude: true, longitude: true,
      deliveryAddress: true, eventDate: true, eventTime: true, totalAmount: true, user: { select: { name: true } },
    },
    orderBy: { eventDate: "asc" },
  });
  res.json({ riders, orders });
}

module.exports = { listActivePartners, listAllPartners, createPartner, updatePartner, deletePartner, assign, unassign, live };
