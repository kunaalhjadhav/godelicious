// Shared order actions used by the admin dashboard, the rider app and WhatsApp commands,
// so every path changes orders the same way (stock, loyalty, events, notifications).
const crypto = require("crypto");
const prisma = require("../config/db");

const shortId = (id) => String(id).slice(0, 8).toUpperCase();

// Runs the normal admin "change status" handler and returns its result.
async function changeStatus(orderId, status, actorUserId) {
  const { updateOrderStatus } = require("../controllers/orders.controller");
  let code = 200, body = null;
  const res = { status(c) { code = c; return res; }, json(b) { body = b; return res; } };
  await updateOrderStatus({ params: { id: orderId }, body: { status }, user: { id: actorUserId, role: "ADMIN" } }, res);
  return code === 200 ? { ok: true, order: body.order } : { ok: false, error: body?.error || "Could not update the order." };
}

// Finds an order from the 8-character code shown in messages (e.g. 1A2B3C4D).
async function findByCode(code) {
  const c = String(code || "").trim().toLowerCase();
  if (!/^[0-9a-f]{6,8}$/.test(c)) return null;
  const list = await prisma.order.findMany({ where: { id: { startsWith: c } }, take: 2, orderBy: { createdAt: "desc" } });
  return list.length === 1 ? list[0] : null;
}

// Offers an order to a delivery partner (rider app + WhatsApp), or re-assigns it.
async function assignOrder(orderId, partnerId) {
  const partner = await prisma.deliveryPartner.findUnique({ where: { id: partnerId } });
  if (!partner) throw new Error("Delivery partner not found.");
  if (partner.status !== "APPROVED" || !partner.isActive) throw new Error(`${partner.name} is not approved or is inactive.`);
  const existing = await prisma.order.findUnique({ where: { id: orderId } });
  if (!existing) throw new Error("Order not found.");
  if (["DELIVERED", "CANCELLED"].includes(existing.status)) throw new Error("This order is already closed.");
  const order = await prisma.order.update({
    where: { id: orderId },
    data: {
      deliveryPartnerId: partner.id,
      forwardedAt: new Date(),
      // A partner without the app is assigned directly; app users get an offer to accept.
      assignStatus: partner.userId ? "OFFERED" : "ACCEPTED",
      riderAcceptedAt: partner.userId ? null : new Date(),
      trackToken: existing.trackToken || crypto.randomBytes(12).toString("hex"),
    },
    include: { deliveryPartner: true, user: { select: { name: true } } },
  });
  require("./notify.service").notifyRiderAssigned(order.id).catch((e) => console.error("notifyRiderAssigned:", e.message));
  return order;
}

function newOtp() {
  return String(crypto.randomInt(1000, 10000));
}

module.exports = { changeStatus, findByCode, assignOrder, shortId, newOtp };
