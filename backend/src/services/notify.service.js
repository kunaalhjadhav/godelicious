// Central place for "tell the right people" logic. Every function is
// fire-and-forget safe: it never throws, so a failed push or WhatsApp can
// never break an order, booking or approval.
const prisma = require("../config/db");
const { sendPushToUser } = require("./push.service");
const { sendWhatsApp, sendWhatsAppTemplate } = require("./whatsapp.service");

const rupees = (n) => `Rs ${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
const shortId = (id) => String(id).slice(0, 8).toUpperCase();

async function pushMany(userIds, payload) {
  await Promise.allSettled(userIds.map((id) => sendPushToUser(id, payload)));
}

async function staffUserIds() {
  const users = await prisma.user.findMany({ where: { role: { in: ["ADMIN", "STAFF"] } }, select: { id: true } });
  return users.map((u) => u.id);
}

async function adminWhatsappNumber() {
  const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  if (settings && settings.whatsappAlerts === false) return null;
  return settings?.adminWhatsapp || process.env.ADMIN_WHATSAPP || null;
}

// ---- Customer WhatsApp messages ----
// With WHATSAPP_CUSTOMER_TEMPLATE set (an approved Utility template whose body is
//   "Hi {{1}}, your Godelicious order {{2}} is {{3}}. {{4}}"
// messages reach every customer. Without it, plain text is used, which WhatsApp only
// delivers to customers who messaged the business number in the last 24 hours.
async function customerAlertsOn() {
  const s = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  return !(s && s.customerWhatsappAlerts === false);
}
async function customerWhatsApp(order, status, detail) {
  try {
    const phone = order.contactPhone || order.user?.phone;
    if (!phone || !(await customerAlertsOn())) return;
    const first = String(order.user?.name || "there").split(" ")[0];
    const ref = `#${shortId(order.id)}`;
    const tpl = process.env.WHATSAPP_CUSTOMER_TEMPLATE;
    if (tpl) {
      await sendWhatsAppTemplate(phone, tpl, [first, ref, status, detail || "Thank you for ordering with us."]);
    } else {
      await sendWhatsApp(phone, `Hi ${first}, your Godelicious order ${ref} is ${status}. ${detail || ""}`.trim());
    }
  } catch (err) {
    console.error("customerWhatsApp failed:", err.message);
  }
}
const CUSTOMER_STATUS = {
  PENDING: "received", CONFIRMED: "confirmed", PREPARING: "being prepared",
  OUT_FOR_DELIVERY: "out for delivery", DELIVERED: "delivered", CANCELLED: "cancelled",
};

function qtyLabel(oi) {
  return oi.menuItem.soldByWeight ? `${oi.quantity}g` : `x${oi.quantity}`;
}

function itemsText(items) {
  return items.map((oi) => `${oi.menuItem.name} ${qtyLabel(oi)}`).join(", ");
}

// ---- New order: admin + each brand partner involved ----
async function notifyNewOrder(orderId) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { name: true, phone: true } },
        orderType: true,
        items: { include: { menuItem: { include: { brand: true } } } },
      },
    });
    if (!order) return;

    const when = order.eventDate
      ? `${new Date(order.eventDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })} ${order.eventTime || ""}`.trim()
      : "not set";
    const pay = order.paymentMethod === "COD" ? "Cash on delivery" : `Online (${order.paymentStatus})`;
    const mapLink = order.latitude && order.longitude ? `\nMap: https://maps.google.com/?q=${order.latitude},${order.longitude}` : "";

    const adminText =
      `NEW ORDER #${shortId(order.id)}\n` +
      `${order.user?.name || "Customer"} - ${order.contactPhone}\n` +
      `${itemsText(order.items)}\n` +
      `Total ${rupees(order.totalAmount)} - ${pay}\n` +
      `Deliver: ${when}\n` +
      `Address: ${order.deliveryAddress}${mapLink}`;

    // Admin / staff
    const ids = await staffUserIds();
    await pushMany(ids, {
      title: `New order #${shortId(order.id)} - ${rupees(order.totalAmount)}`,
      body: `${order.user?.name || "Customer"}: ${itemsText(order.items)}`.slice(0, 180),
      data: { type: "new_order", orderId: order.id, url: "/orders" },
    });
    const adminPhone = await adminWhatsappNumber();
    if (adminPhone) await sendWhatsApp(adminPhone, adminText);

    // Customer: order received
    const needsAdvance = order.paymentMethod === "COD" && order.advanceAmount > 0 && !order.advancePaid;
    await customerWhatsApp(order, "received",
      `Delivery: ${when}. Total ${rupees(order.totalAmount)}. ` +
      (needsAdvance ? `Please pay the advance of ${rupees(order.advanceAmount)} in the app to confirm it.`
        : order.paymentMethod === "COD" ? "Pay in cash on delivery." : "We will confirm once payment is received."));

    // Brand partners: only their own line items
    const byBrand = new Map();
    for (const oi of order.items) {
      const b = oi.menuItem.brand;
      if (!b) continue;
      if (!byBrand.has(b.id)) byBrand.set(b.id, { brand: b, items: [] });
      byBrand.get(b.id).items.push(oi);
    }
    for (const { brand, items } of byBrand.values()) {
      const brandTotal = items.reduce((s, oi) => s + oi.price * oi.quantity, 0);
      const users = await prisma.user.findMany({ where: { brandId: brand.id }, select: { id: true } });
      await pushMany(users.map((u) => u.id), {
        title: `New order for ${brand.name}`,
        body: `${itemsText(items)} - ${rupees(brandTotal)}`.slice(0, 180),
        data: { type: "new_order", orderId: order.id, url: "/partner/orders" },
      });
      if (brand.contactPhone) {
        await sendWhatsApp(
          brand.contactPhone,
          `NEW ORDER for ${brand.name} (#${shortId(order.id)})\n${itemsText(items)}\nYour items: ${rupees(brandTotal)}\nDeliver: ${when}`
        );
      }
    }
  } catch (err) {
    console.error("notifyNewOrder failed:", err.message);
  }
}

async function notifyPaymentReceived(orderId) {
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { user: { select: { name: true } } } });
    if (!order) return;
    const isAdvance = order.paymentMethod === "COD" && order.advancePaid;
    const paid = isAdvance ? order.advanceAmount : order.totalAmount;
    await pushMany(await staffUserIds(), {
      title: isAdvance ? "COD advance received" : "Payment received",
      body: `Order #${shortId(order.id)} - ${rupees(paid)}`,
      data: { type: "payment", orderId: order.id, url: "/orders" },
    });
    const phone = await adminWhatsappNumber();
    if (phone) {
      await sendWhatsApp(phone, isAdvance
        ? `COD ADVANCE RECEIVED #${shortId(order.id)}\n${order.user?.name || "Customer"} - ${order.contactPhone}\nAdvance ${rupees(paid)} paid online\nCollect ${rupees(order.totalAmount - paid)} in cash on delivery`
        : `PAYMENT RECEIVED #${shortId(order.id)}\n${order.user?.name || "Customer"} - ${order.contactPhone}\n${rupees(paid)} paid online`);
    }
    await customerWhatsApp(order, "paid", isAdvance
      ? `We received your advance of ${rupees(paid)}. Please pay ${rupees(order.totalAmount - paid)} in cash on delivery.`
      : `We received ${rupees(paid)} online. Thank you!`);
  } catch (err) {
    console.error("notifyPaymentReceived failed:", err.message);
  }
}

// ---- Order status changed (by staff or the system): copy to the company WhatsApp ----
const STATUS_LABEL = {
  PENDING: "Pending", CONFIRMED: "Confirmed", PREPARING: "Preparing",
  OUT_FOR_DELIVERY: "Out for delivery", DELIVERED: "Delivered", CANCELLED: "Cancelled",
};
async function notifyOrderUpdate(orderId, status, note) {
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { user: { select: { name: true, phone: true } } } });
    if (!order) return;

    // Customer
    const due = order.paymentMethod === "COD" && order.paymentStatus !== "PAID"
      ? order.totalAmount - (order.advancePaid ? order.advanceAmount || 0 : 0) : 0;
    const detail = note && /cash payment collected/i.test(note)
      ? `We received your cash payment. Thank you!`
      : {
          CONFIRMED: "Our kitchen has it scheduled for your delivery time.",
          PREPARING: "Our kitchen is preparing your food now.",
          OUT_FOR_DELIVERY: `It will reach you soon.${due > 0 ? ` Please keep ${rupees(due)} ready in cash.` : ""}`,
          DELIVERED: "Enjoy your meal! You can rate it in the Godelicious app.",
          CANCELLED: "If you paid online, the refund follows our Cancellation & Refund Policy. Questions? Reply in the app chat.",
        }[status] || "";
    await customerWhatsApp(order, note && /cash payment collected/i.test(note) ? "fully paid" : (CUSTOMER_STATUS[status] || String(status).toLowerCase()), detail);

    // Company number
    const phone = await adminWhatsappNumber();
    if (!phone) return;
    const cashDue = order.paymentMethod === "COD" && order.paymentStatus !== "PAID"
      ? `\nCash to collect: ${rupees(order.totalAmount - (order.advancePaid ? order.advanceAmount || 0 : 0))}` : "";
    await sendWhatsApp(phone,
      `ORDER UPDATE #${shortId(order.id)}: ${STATUS_LABEL[status] || status}\n` +
      `${order.user?.name || "Customer"} - ${order.contactPhone}\n` +
      `Total ${rupees(order.totalAmount)}${cashDue}${note ? `\n${note}` : ""}`);
  } catch (err) {
    console.error("notifyOrderUpdate failed:", err.message);
  }
}

// ---- Brand menu approvals ----
async function notifyAdminsApprovalNeeded(brandName, what) {
  try {
    await pushMany(await staffUserIds(), {
      title: "Approval needed",
      body: `${brandName}: ${what}`,
      data: { type: "approval", url: "/approvals" },
    });
    const phone = await adminWhatsappNumber();
    if (phone) await sendWhatsApp(phone, `APPROVAL NEEDED\n${brandName}: ${what}\nOpen the admin dashboard > Approvals.`);
  } catch (err) {
    console.error("notifyAdminsApprovalNeeded failed:", err.message);
  }
}

async function notifyBrandDecision(brandId, title, body) {
  try {
    const users = await prisma.user.findMany({ where: { brandId }, select: { id: true } });
    await pushMany(users.map((u) => u.id), { title, body, data: { type: "approval_result", url: "/partner/menu" } });
  } catch (err) {
    console.error("notifyBrandDecision failed:", err.message);
  }
}

// ---- Venue bookings ----
async function notifyVenueRequest(bookingId) {
  try {
    const b = await prisma.venueBooking.findUnique({
      where: { id: bookingId },
      include: { venue: { include: { owner: true } }, customer: { select: { name: true } } },
    });
    if (!b) return;
    const d = new Date(b.eventDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
    const text = `NEW VENUE REQUEST\n${b.venue.name}\n${b.customer.name} - ${b.eventType}\n${d}, ${b.guestCount} guests\nPhone: ${b.contactPhone}`;
    await sendPushToUser(b.venue.ownerId, {
      title: "New venue request",
      body: `${b.customer.name}: ${b.eventType} on ${d} (${b.guestCount} guests)`,
      data: { type: "venue_request", bookingId: b.id, url: "/venue/calendar" },
    });
    const phone = b.venue.contactPhone || b.venue.owner.phone;
    if (phone) await sendWhatsApp(phone, text);
    await pushMany(await staffUserIds(), { title: "New venue request", body: `${b.venue.name} - ${b.eventType} on ${d}`, data: { type: "venue_request", url: "/venues" } });
  } catch (err) {
    console.error("notifyVenueRequest failed:", err.message);
  }
}

async function notifyVenueDecision(bookingId) {
  try {
    const b = await prisma.venueBooking.findUnique({ where: { id: bookingId }, include: { venue: true } });
    if (!b) return;
    const d = new Date(b.eventDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
    const accepted = b.status === "ACCEPTED";
    const body = accepted
      ? `${b.venue.name} accepted your ${b.eventType} on ${d}.${b.quotedAmount ? ` Quote: ${rupees(b.quotedAmount)}.` : ""}`
      : `${b.venue.name} could not take your ${b.eventType} on ${d}.${b.ownerNote ? ` ${b.ownerNote}` : ""}`;
    await sendPushToUser(b.customerId, { title: accepted ? "Venue request accepted" : "Venue request declined", body, data: { type: "venue_decision", bookingId: b.id } });
    await sendWhatsApp(b.contactPhone, body);
  } catch (err) {
    console.error("notifyVenueDecision failed:", err.message);
  }
}

async function notifyNewVenuePartner(venueName) {
  try {
    await pushMany(await staffUserIds(), { title: "New venue partner", body: `${venueName} registered and awaits approval`, data: { type: "approval", url: "/venues" } });
  } catch (err) {
    console.error("notifyNewVenuePartner failed:", err.message);
  }
}

module.exports = {
  notifyNewOrder, notifyPaymentReceived, notifyOrderUpdate,
  notifyAdminsApprovalNeeded, notifyBrandDecision,
  notifyVenueRequest, notifyVenueDecision, notifyNewVenuePartner,
};
