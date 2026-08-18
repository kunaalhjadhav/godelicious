const prisma = require("../config/db");

const VALID_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
];

// POST /api/orders (CUSTOMER)
// body: { items: [{ menuItemId, quantity, selectedOptions? }], deliveryAddress, contactPhone,
//         notes, couponCode?, eventDate?, guestCount?, latitude?, longitude? }
async function createOrder(req, res) {
  const {
    items, deliveryAddress, contactPhone, notes,
    couponCode, eventDate, guestCount, latitude, longitude,
    paymentMethod,
  } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "items must be a non-empty array." });
  }
  if (!deliveryAddress || !contactPhone) {
    return res.status(400).json({ error: "deliveryAddress and contactPhone are required." });
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

      for (const line of items) {
        const menuItem = await tx.menuItem.findUnique({ where: { id: line.menuItemId } });
        if (!menuItem) {
          throw new Error(`Menu item ${line.menuItemId} not found.`);
        }
        if (!menuItem.isAvailable) {
          throw new Error(`${menuItem.name} is currently unavailable.`);
        }
        if (menuItem.stockQty < line.quantity) {
          throw new Error(`Not enough stock for ${menuItem.name}. Available: ${menuItem.stockQty}.`);
        }

        // Combo items: add up any priceDelta for the customer's selected options
        let unitPrice = menuItem.price;
        if (line.selectedOptions?.length) {
          for (const sel of line.selectedOptions) {
            const option = await tx.comboOption.findUnique({ where: { id: sel.optionId } });
            if (option) unitPrice += option.priceDelta;
          }
        }

        subtotal += unitPrice * line.quantity;
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
          guestCount: guestCount ? Number(guestCount) : null,
          latitude: latitude !== undefined ? Number(latitude) : null,
          longitude: longitude !== undefined ? Number(longitude) : null,
          paymentMethod: method,
          items: { create: orderItemsData },
        },
        include: { items: { include: { menuItem: true } } },
      });
    });

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
    include: { items: { include: { menuItem: true } } },
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
    });

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

module.exports = { createOrder, myOrders, getOrder, listOrders, updateOrderStatus, confirmCod };
