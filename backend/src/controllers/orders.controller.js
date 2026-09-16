const prisma = require("../config/db");
const { sendPushToUser } = require("../services/push.service");

const VALID_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
];

// POST /api/orders (CUSTOMER)
const MIN_LEAD_HOURS = 15;

// Combines the date-only eventDate with a "H:MM AM/PM" eventTime string into
// one real Date/time — needed since they arrive as two separate fields.
function parseEventDateTime(eventDateStr, eventTimeStr) {
  const date = new Date(eventDateStr);
  const match = eventTimeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return date;
  let [, h, m, period] = match;
  h = parseInt(h, 10);
  m = parseInt(m, 10);
  if (period.toUpperCase() === "PM" && h !== 12) h += 12;
  if (period.toUpperCase() === "AM" && h === 12) h = 0;
  date.setHours(h, m, 0, 0);
  return date;
}

// body: { items?: [{ menuItemId, quantity, selectedOptions? }], deliveryAddress, contactPhone,
//         notes, couponCode?, eventDate, eventTime, guestCount?, latitude?, longitude?,
//         orderTypeId?, needsStaff?, staffCount?, addons?: [{ addonId, quantity }] }
// `items` is optional: a booking (Meal Box / Delivery Box / Catering Order) can be placed
// with just an orderType + staff/addons and no à la carte menu items. eventDate/eventTime
// are required on every order — see the 15-hour lead time check below.
async function createOrder(req, res) {
  const {
    items, deliveryAddress, contactPhone, notes,
    couponCode, eventDate, eventTime, guestCount, latitude, longitude,
    paymentMethod, orderTypeId, needsStaff, staffCount, addons,
  } = req.body;

  const itemLines = Array.isArray(items) ? items : [];
  const addonLines = Array.isArray(addons) ? addons : [];

  if (itemLines.length === 0 && addonLines.length === 0 && !needsStaff && !orderTypeId) {
    return res.status(400).json({ error: "An order needs at least a package, menu items, staff, or add-ons." });
  }
  if (!deliveryAddress || !contactPhone) {
    return res.status(400).json({ error: "deliveryAddress and contactPhone are required." });
  }
  if (!eventDate || !eventTime) {
    return res.status(400).json({ error: "Please select a delivery date and time." });
  }

  const deliveryDateTime = parseEventDateTime(eventDate, eventTime);
  const minAllowed = new Date(Date.now() + MIN_LEAD_HOURS * 60 * 60 * 1000);
  if (deliveryDateTime < minAllowed) {
    return res.status(400).json({
      error: `Orders must be placed at least ${MIN_LEAD_HOURS} hours before the selected delivery time. Please choose a later slot.`,
    });
  }

  const method = paymentMethod === "COD" ? "COD" : "ONLINE";

  try {
    const settings = await prisma.appSettings.upsert({
      where: { id: "singleton" }, update: {}, create: { id: "singleton" },
    });
    if (method === "COD" && !settings.codEnabled) {
      return res.status(400).json({ error: "Cash on delivery isn't available right now — please pay online." });
    }

    const order = await prisma.$transaction(async (tx) => {
      let subtotal = 0;
      const orderItemsData = [];

      for (const line of itemLines) {
        const menuItem = await tx.menuItem.findUnique({ where: { id: line.menuItemId } });
        if (!menuItem) {
          throw new Error(`Menu item ${line.menuItemId} not found.`);
        }
        if (!menuItem.isAvailable) {
          throw new Error(`${menuItem.name} is currently unavailable.`);
        }
        if (menuItem.stockQty < line.quantity) {
          const unit = menuItem.soldByWeight ? "g" : "";
          throw new Error(`Not enough stock for ${menuItem.name}. Available: ${menuItem.stockQty}${unit}.`);
        }

        // Weight-sold items are priced per kg — quantity is grams, so the
        // effective unit price (matching how quantity is expressed) is per gram.
        // Combo items: add up any priceDelta for the customer's selected options.
        let unitPrice = menuItem.soldByWeight ? menuItem.price / 1000 : menuItem.price;
        if (line.selectedOptions?.length) {
          for (const sel of line.selectedOptions) {
            const option = await tx.comboOption.findUnique({ where: { id: sel.optionId } });
            if (option) unitPrice += option.priceDelta;
          }
        }

        const lineValue = unitPrice * line.quantity;
        // No per-item minimum here — the order-wide minOrderAmount check further
        // down applies to the whole cart's total, so a weight item can be
        // combined with other items (or other weight items) to reach it together,
        // rather than needing to hit the minimum entirely on its own.

        subtotal += lineValue;
        orderItemsData.push({
          menuItemId: menuItem.id,
          quantity: line.quantity,
          price: unitPrice,
          selectedOptions: line.selectedOptions ? JSON.stringify(line.selectedOptions) : null,
        });

        await tx.menuItem.update({
          where: { id: menuItem.id },
          data: { stockQty: { decrement: line.quantity } },
        });
        await tx.inventoryLog.create({
          data: { menuItemId: menuItem.id, changeQty: -line.quantity, reason: "order" },
        });
      }

      // Validate the order type, if given
      let validOrderTypeId = null;
      if (orderTypeId) {
        const orderType = await tx.orderType.findUnique({ where: { id: orderTypeId } });
        if (!orderType) throw new Error("Selected package not found.");
        validOrderTypeId = orderType.id;
      }

      // Staff cost
      const wantsStaff = Boolean(needsStaff);
      const numStaff = wantsStaff ? Math.max(0, Number(staffCount) || 0) : 0;
      if (wantsStaff && numStaff === 0) {
        throw new Error("Please specify how many staff you need.");
      }
      const staffCost = numStaff * settings.staffPricePerPerson;
      subtotal += staffCost;

      // Add-ons — validate each and snapshot its price
      const orderAddonsData = [];
      let addonsCost = 0;
      for (const line of addonLines) {
        const addon = await tx.addon.findUnique({ where: { id: line.addonId } });
        if (!addon) throw new Error(`Add-on ${line.addonId} not found.`);
        if (!addon.isActive) throw new Error(`${addon.name} is no longer available.`);
        const qty = Math.max(1, Number(line.quantity) || 1);
        addonsCost += addon.price * qty;
        orderAddonsData.push({ addonId: addon.id, quantity: qty, price: addon.price });
      }
      subtotal += addonsCost;

      // Apply coupon, if provided
      let discountAmount = 0;
      let appliedCouponCode = null;
      if (couponCode) {
        const coupon = await tx.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
        if (!coupon) throw new Error("Coupon code not found.");
        if (!coupon.isActive) throw new Error("This coupon is no longer active.");
        if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new Error("This coupon has expired.");
        if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
          throw new Error("This coupon has reached its usage limit.");
        }
        if (subtotal < coupon.minOrderAmount) {
          throw new Error(`This coupon requires a minimum order of ₹${coupon.minOrderAmount}.`);
        }

        discountAmount = coupon.discountType === "PERCENT"
          ? subtotal * (coupon.discountValue / 100)
          : coupon.discountValue;
        discountAmount = Math.min(discountAmount, subtotal); // never discount below 0

        await tx.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
        appliedCouponCode = coupon.code;
      }

      const finalTotal = subtotal - discountAmount;
      if (finalTotal < settings.minOrderAmount) {
        throw new Error(`Minimum order amount is ₹${settings.minOrderAmount}. Your order total is ₹${finalTotal.toFixed(0)}.`);
      }

      return tx.order.create({
        data: {
          userId: req.user.id,
          totalAmount: finalTotal,
          discountAmount,
          couponCode: appliedCouponCode,
          deliveryAddress,
          contactPhone,
          notes,
          eventDate: eventDate ? new Date(eventDate) : null,
          eventTime: eventTime || null,
          guestCount: guestCount ? Number(guestCount) : null,
          latitude: latitude !== undefined ? Number(latitude) : null,
          longitude: longitude !== undefined ? Number(longitude) : null,
          paymentMethod: method,
          orderTypeId: validOrderTypeId,
          needsStaff: wantsStaff,
          staffCount: wantsStaff ? numStaff : null,
          staffCost,
          addonsCost,
          items: { create: orderItemsData },
          addons: { create: orderAddonsData },
        },
        include: {
          items: { include: { menuItem: true } },
          addons: { include: { addon: true } },
          orderType: true,
          deliveryPartner: true,
        },
      });
    }, { timeout: 20000, maxWait: 10000 }); // default 5s timeout is too tight for this many
    // sequential checks (stock, combos, coupon, order type, addons) over a pooled connection

    res.status(201).json({ order });
  } catch (err) {
    console.error("createOrder error:", err.message);
    res.status(400).json({ error: err.message || "Could not place order." });
  }
}

// GET /api/orders/my (CUSTOMER) - the logged-in user's own orders
async function myOrders(req, res) {
  const orders = await prisma.order.findMany({
    where: { userId: req.user.id },
    include: {
      items: { include: { menuItem: true } },
      addons: { include: { addon: true } },
      orderType: true,
          deliveryPartner: true,
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ orders });
}

// GET /api/orders/:id - owner, or ADMIN/STAFF
async function getOrder(req, res) {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: {
      items: { include: { menuItem: true } },
      addons: { include: { addon: true } },
      orderType: true,
          deliveryPartner: true,
      user: { select: { id: true, name: true, email: true, phone: true } },
      review: true,
    },
  });
  if (!order) return res.status(404).json({ error: "Order not found." });

  const isOwner = order.userId === req.user.id;
  const isStaffOrAdmin = ["ADMIN", "STAFF"].includes(req.user.role);
  if (!isOwner && !isStaffOrAdmin) {
    return res.status(403).json({ error: "Not authorized to view this order." });
  }

  res.json({ order });
}

// GET /api/orders (ADMIN/STAFF) - all orders, optional ?status= filter
async function listOrders(req, res) {
  const { status } = req.query;
  const orders = await prisma.order.findMany({
    where: status ? { status } : undefined,
    include: {
      items: { include: { menuItem: true } },
      addons: { include: { addon: true } },
      orderType: true,
          deliveryPartner: true,
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ orders });
}

// PATCH /api/orders/:id/status (ADMIN/STAFF)
// body: { status }
async function updateOrderStatus(req, res) {
  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(", ")}` });
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      const existing = await tx.order.findUnique({ where: { id: req.params.id }, include: { items: true } });
      if (!existing) throw new Error("Order not found.");

      // If cancelling an order that hadn't already been cancelled, restock items
      if (status === "CANCELLED" && existing.status !== "CANCELLED") {
        for (const item of existing.items) {
          await tx.menuItem.update({
            where: { id: item.menuItemId },
            data: { stockQty: { increment: item.quantity } },
          });
          await tx.inventoryLog.create({
            data: {
              menuItemId: item.menuItemId,
              changeQty: item.quantity,
              reason: "order_cancelled",
              staffId: req.user.id,
            },
          });
        }
      }

      return tx.order.update({
        where: { id: req.params.id },
        data: { status },
        include: { items: { include: { menuItem: true } } },
      });
    }, { timeout: 15000, maxWait: 10000 });

    sendPushToUser(order.userId, {
      title: "Order update",
      body: `Your order is now ${status.replace(/_/g, " ").toLowerCase()}.`,
      data: { type: "order_status", orderId: order.id },
    }).catch((err) => console.error("Push send failed (order status):", err.message));

    res.json({ order });
  } catch (err) {
    console.error("updateOrderStatus error:", err.message);
    res.status(400).json({ error: err.message || "Could not update order status." });
  }
}

// PATCH /api/orders/:id/confirm-cod (ADMIN/STAFF) - mark a COD order's cash as collected
async function confirmCod(req, res) {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order) return res.status(404).json({ error: "Order not found." });
  if (order.paymentMethod !== "COD") {
    return res.status(400).json({ error: "This order isn't a cash-on-delivery order." });
  }
  if (order.paymentStatus === "PAID") {
    return res.status(400).json({ error: "This order is already marked as paid." });
  }

  const updated = await prisma.order.update({
    where: { id: req.params.id },
    data: { paymentStatus: "PAID", codConfirmedAt: new Date(), codConfirmedBy: req.user.id },
  });
  res.json({ order: updated });
}

// PATCH /api/orders/:id/forward (ADMIN/STAFF)
// Records which delivery partner an order was forwarded to. The actual
// WhatsApp message is built and opened client-side (wa.me link) — this
// endpoint just tracks that the forward happened, for the admin's own records.
// body: { deliveryPartnerId }
async function forwardToPartner(req, res) {
  const { deliveryPartnerId } = req.body;
  if (!deliveryPartnerId) return res.status(400).json({ error: "deliveryPartnerId is required." });

  const partner = await prisma.deliveryPartner.findUnique({ where: { id: deliveryPartnerId } });
  if (!partner) return res.status(404).json({ error: "Delivery partner not found." });

  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { deliveryPartnerId, forwardedAt: new Date() },
    include: { deliveryPartner: true },
  });
  res.json({ order });
}

module.exports = { createOrder, myOrders, getOrder, listOrders, updateOrderStatus, confirmCod, forwardToPartner };
