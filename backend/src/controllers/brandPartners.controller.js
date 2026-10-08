const { checkBackInStock } = require("../services/backInStock.service");
const bcrypt = require("bcryptjs");
const prisma = require("../config/db");
const { signToken } = require("../utils/jwt");
const { notifyAdminsApprovalNeeded } = require("../services/notify.service");

// POST /api/brand-partners/register (public)
// Simple one-step self-registration: creates a Brand (unapproved) and a
// BRAND_PARTNER login in one go. They can sign in immediately and see their
// dashboard, but menu/offers stay hidden from customers until an admin
// approves the brand (Brand.isApproved).
async function register(req, res) {
  try {
    const { brandName, name, email, password, phone } = req.body;
    if (!brandName || !name || !email || !password) {
      return res.status(400).json({ error: "brandName, name, email and password are required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "An account with this email already exists." });

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const brand = await tx.brand.create({
        data: { name: brandName, contactEmail: email, contactPhone: phone, isApproved: false },
      });
      const user = await tx.user.create({
        data: { name, email, phone, passwordHash, role: "BRAND_PARTNER", brandId: brand.id },
      });
      return { brand, user };
    });

    const token = signToken(result.user);
    res.status(201).json({
      token,
      user: { id: result.user.id, name: result.user.name, email: result.user.email, role: result.user.role, brandId: result.brand.id },
      brand: result.brand,
    });
  } catch (err) {
    console.error("brand partner register error:", err);
    res.status(500).json({ error: "Could not register brand partner." });
  }
}

// Every route below assumes requireRole("BRAND_PARTNER") already ran,
// so req.user.brandId is present (set at login/registration time).
function myBrandId(req) {
  return req.user.brandId;
}

// GET /api/brand-partners/me/dashboard
async function dashboard(req, res) {
  const brandId = myBrandId(req);
  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!brand) return res.status(404).json({ error: "Brand not found." });

  const [menuItemCount, pendingOrdersCount, totalSalesResult, awaitingApproval, lowStock] = await Promise.all([
    prisma.menuItem.count({ where: { brandId } }),
    prisma.order.count({
      where: { status: { in: ["PENDING", "CONFIRMED", "PREPARING"] }, items: { some: { menuItem: { brandId } } } },
    }),
    prisma.orderItem.aggregate({
      _sum: { price: true },
      where: { menuItem: { brandId }, order: { status: { not: "CANCELLED" } } },
    }),
    prisma.menuItem.count({
      where: { brandId, OR: [{ approvalStatus: "PENDING" }, { pendingChanges: { not: null } }, { deleteRequested: true }] },
    }),
    prisma.menuItem.count({ where: { brandId, approvalStatus: "APPROVED", stockQty: { lte: 5 } } }),
  ]);

  res.json({
    brand,
    menuItemCount,
    awaitingApproval,
    lowStock,
    pendingOrdersCount,
    totalSales: totalSalesResult._sum.price || 0,
  });
}

// GET /api/brand-partners/me/orders — orders containing at least one of this brand's items
// ?view=active (default: not yet delivered/cancelled) | history (delivered/cancelled) | all
// ?from=&to= (ISO dates) filter by delivery/created date for history
async function myOrders(req, res) {
  const brandId = myBrandId(req);
  const { view = "active", from, to } = req.query;
  const statusFilter =
    view === "history" ? { in: ["DELIVERED", "CANCELLED"] }
    : view === "all" ? undefined
    : { in: ["PENDING", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY"] };
  const dateFilter = {};
  if (from) dateFilter.gte = new Date(from);
  if (to) { const t = new Date(to); t.setHours(23, 59, 59, 999); dateFilter.lte = t; }

  const orders = await prisma.order.findMany({
    where: {
      items: { some: { menuItem: { brandId } } },
      ...(statusFilter && { status: statusFilter }),
      ...(from || to ? { createdAt: dateFilter } : {}),
    },
    include: {
      items: { include: { menuItem: true } },
      user: { select: { name: true, phone: true } },
    },
    orderBy: view === "active" ? { eventDate: "asc" } : { createdAt: "desc" },
    take: 500,
  });

  // Only surface this brand's own line items per order — a customer's cart
  // can mix items from multiple brands/the house menu in one order, and a
  // brand partner should only see their own portion, not everyone else's.
  const scoped = orders.map((o) => {
    const items = o.items.filter((i) => i.menuItem.brandId === brandId);
    return {
      id: o.id, status: o.status, createdAt: o.createdAt, eventDate: o.eventDate, eventTime: o.eventTime,
      paymentMethod: o.paymentMethod, paymentStatus: o.paymentStatus, deliveryAddress: o.deliveryAddress,
      notes: o.notes, guestCount: o.guestCount, user: o.user, contactPhone: o.contactPhone,
      items,
      brandTotal: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    };
  });

  res.json({ orders: scoped });
}

// ----- Menu (scoped to own brand) -----

async function listMyMenu(req, res) {
  const items = await prisma.menuItem.findMany({
    where: { brandId: myBrandId(req) },
    include: { category: true, comboGroups: { include: { options: true } } },
    orderBy: { name: "asc" },
  });
  res.json({ items });
}

async function createMyMenuItem(req, res) {
  const { name, description, price, imageUrl, isVeg, categoryId, stockQty, isCombo, soldByWeight, minOrderGrams } = req.body;
  if (!name || price === undefined || !categoryId) {
    return res.status(400).json({ error: "name, price and categoryId are required." });
  }

  // New items start PENDING: invisible to customers until an admin approves.
  const item = await prisma.menuItem.create({
    data: {
      name, description, price: Number(price), imageUrl,
      isVeg: isVeg !== undefined ? Boolean(isVeg) : true,
      categoryId,
      stockQty: stockQty !== undefined ? Number(stockQty) : 0,
      isCombo: isCombo !== undefined ? Boolean(isCombo) : false,
      soldByWeight: Boolean(soldByWeight),
      ...(minOrderGrams !== undefined && { minOrderGrams: Number(minOrderGrams) }),
      brandId: myBrandId(req),
      approvalStatus: "PENDING",
    },
  });
  const brand = await prisma.brand.findUnique({ where: { id: myBrandId(req) } });
  notifyAdminsApprovalNeeded(brand?.name || "A brand partner", `new item "${name}"`);
  res.status(201).json({ item });
}

async function assertOwnsMenuItem(req) {
  const item = await prisma.menuItem.findUnique({ where: { id: req.params.id } });
  if (!item) throw Object.assign(new Error("Menu item not found."), { status: 404 });
  if (item.brandId !== myBrandId(req)) throw Object.assign(new Error("Not your menu item."), { status: 403 });
  return item;
}

// Fields a partner can change instantly (operational) vs. ones that change
// what customers see/pay and therefore need admin approval.
const CONTENT_FIELDS = ["name", "description", "price", "imageUrl", "isVeg", "categoryId", "isCombo", "soldByWeight", "minOrderGrams"];
const NUMBER_FIELDS = ["price", "minOrderGrams"];
const BOOL_FIELDS = ["isVeg", "isCombo", "soldByWeight"];

async function updateMyMenuItem(req, res) {
  try {
    const existing = await assertOwnsMenuItem(req);
    const body = req.body;

    // Operational fields apply immediately.
    const immediate = {};
    if (body.isAvailable !== undefined) immediate.isAvailable = Boolean(body.isAvailable);
    if (body.stockQty !== undefined) immediate.stockQty = Math.max(0, Number(body.stockQty));
    if (body.lowStockAt !== undefined) immediate.lowStockAt = Math.max(0, Number(body.lowStockAt));

    // Content fields: collect what actually changed.
    const proposed = {};
    for (const f of CONTENT_FIELDS) {
      if (body[f] === undefined) continue;
      let v = body[f];
      if (NUMBER_FIELDS.includes(f)) v = Number(v);
      if (BOOL_FIELDS.includes(f)) v = Boolean(v);
      if (v !== existing[f]) proposed[f] = v;
    }

    let message = null;
    let data = { ...immediate };
    if (Object.keys(proposed).length > 0) {
      if (existing.approvalStatus === "APPROVED") {
        // Live item: keep serving the current version, queue the edit for review.
        const merged = { ...(existing.pendingChanges ? JSON.parse(existing.pendingChanges) : {}), ...proposed };
        data.pendingChanges = JSON.stringify(merged);
        message = "Your changes were sent to admin for approval. The current version stays live until then.";
      } else {
        // Never been live (pending/rejected): edit in place and resubmit.
        data = { ...data, ...proposed, approvalStatus: "PENDING", approvalNote: null };
        message = "Item updated and resubmitted for approval.";
      }
    }

    const item = Object.keys(data).length
      ? await prisma.menuItem.update({ where: { id: existing.id }, data })
      : existing;

    if (message) {
      const brand = await prisma.brand.findUnique({ where: { id: myBrandId(req) } });
      notifyAdminsApprovalNeeded(brand?.name || "A brand partner", `edit to "${existing.name}"`);
    }
    checkBackInStock(item.id);
    res.json({ item, message });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not update menu item." });
  }
}

// DELETE /me/menu/:id — items that were never approved are removed straight
// away; live items need admin approval to be taken down.
async function deleteMyMenuItem(req, res) {
  try {
    const existing = await assertOwnsMenuItem(req);
    const hasOrders = await prisma.orderItem.count({ where: { menuItemId: existing.id } });

    if (existing.approvalStatus !== "APPROVED" && hasOrders === 0) {
      await prisma.menuItem.delete({ where: { id: existing.id } });
      return res.json({ success: true, removed: true });
    }

    await prisma.menuItem.update({ where: { id: existing.id }, data: { deleteRequested: true } });
    const brand = await prisma.brand.findUnique({ where: { id: myBrandId(req) } });
    notifyAdminsApprovalNeeded(brand?.name || "A brand partner", `removal of "${existing.name}"`);
    res.json({ success: true, removed: false, message: "Removal request sent to admin. The item stays live until approved." });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not delete menu item." });
  }
}

// POST /me/menu/:id/cancel-request — withdraw a pending edit or removal request
async function cancelMyRequest(req, res) {
  try {
    const existing = await assertOwnsMenuItem(req);
    const item = await prisma.menuItem.update({
      where: { id: existing.id },
      data: { pendingChanges: null, deleteRequested: false },
    });
    res.json({ item });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

// ----- Inventory (stock changes are instant, no approval) -----

// GET /me/inventory — stock levels + recent movements for the brand's own items
async function myInventory(req, res) {
  const brandId = myBrandId(req);
  const items = await prisma.menuItem.findMany({
    where: { brandId },
    select: {
      id: true, name: true, stockQty: true, isAvailable: true, soldByWeight: true,
      lowStockAt: true, approvalStatus: true, imageUrl: true,
      category: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });
  const logs = await prisma.inventoryLog.findMany({
    where: { menuItem: { brandId } },
    include: { menuItem: { select: { name: true } }, staff: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json({ items, logs });
}

// PATCH /me/inventory/:id  body: { changeQty, reason }
async function adjustMyStock(req, res) {
  const changeQty = Number(req.body.changeQty);
  const reason = req.body.reason;
  if (!Number.isFinite(changeQty) || changeQty === 0) {
    return res.status(400).json({ error: "changeQty must be a non-zero number." });
  }
  if (!reason) return res.status(400).json({ error: "reason is required (restock, wastage, adjustment)." });

  try {
    const item = await prisma.$transaction(async (tx) => {
      const existing = await tx.menuItem.findUnique({ where: { id: req.params.id } });
      if (!existing || existing.brandId !== myBrandId(req)) throw Object.assign(new Error("Not your menu item."), { status: 403 });
      const newQty = existing.stockQty + changeQty;
      if (newQty < 0) throw Object.assign(new Error("Resulting stock cannot be negative."), { status: 400 });
      const updated = await tx.menuItem.update({ where: { id: existing.id }, data: { stockQty: newQty } });
      await tx.inventoryLog.create({ data: { menuItemId: existing.id, changeQty, reason, staffId: req.user.id } });
      return updated;
    });
    checkBackInStock(item.id);
    res.json({ item });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not adjust stock." });
  }
}

// ----- Locations -----

async function listMyLocations(req, res) {
  const locations = await prisma.brandLocation.findMany({
    where: { brandId: myBrandId(req) },
    orderBy: { createdAt: "desc" },
  });
  res.json({ locations });
}

async function createMyLocation(req, res) {
  const { name, address, latitude, longitude } = req.body;
  if (!name || !address) return res.status(400).json({ error: "name and address are required." });

  const location = await prisma.brandLocation.create({
    data: {
      brandId: myBrandId(req), name, address,
      latitude: latitude !== undefined ? Number(latitude) : null,
      longitude: longitude !== undefined ? Number(longitude) : null,
    },
  });
  res.status(201).json({ location });
}

async function deleteMyLocation(req, res) {
  const location = await prisma.brandLocation.findUnique({ where: { id: req.params.id } });
  if (!location || location.brandId !== myBrandId(req)) {
    return res.status(404).json({ error: "Location not found." });
  }
  await prisma.brandLocation.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}

// ----- Offers (require admin approval) -----

async function listMyOffers(req, res) {
  const offers = await prisma.offer.findMany({
    where: { brandId: myBrandId(req) },
    orderBy: { createdAt: "desc" },
  });
  res.json({ offers });
}

async function createMyOffer(req, res) {
  const { title, description, discountPercent } = req.body;
  if (!title || discountPercent === undefined) {
    return res.status(400).json({ error: "title and discountPercent are required." });
  }
  const offer = await prisma.offer.create({
    data: { brandId: myBrandId(req), title, description, discountPercent: Number(discountPercent) },
  });
  res.status(201).json({ offer });
}

// ----- Earnings / reports -----

async function myEarnings(req, res) {
  const brandId = myBrandId(req);
  const { from, to } = req.query;
  const brand = await prisma.brand.findUnique({ where: { id: brandId } });

  const dateFilter = {};
  if (from) dateFilter.gte = new Date(from);
  if (to) dateFilter.lte = new Date(to);

  const orderItems = await prisma.orderItem.findMany({
    where: {
      menuItem: { brandId },
      order: { status: { not: "CANCELLED" }, ...(from || to ? { createdAt: dateFilter } : {}) },
    },
    include: {
      menuItem: { select: { name: true } },
      order: { select: { id: true, status: true, createdAt: true, paymentStatus: true } },
    },
    orderBy: { order: { createdAt: "desc" } },
  });

  const totalSales = orderItems.reduce((sum, oi) => sum + oi.price * oi.quantity, 0);
  const commissionAmount = totalSales * (brand.commissionPercent / 100);
  const payoutAmount = totalSales - commissionAmount;

  const settlements = await prisma.brandSettlement.findMany({ where: { brandId }, orderBy: { createdAt: "desc" } });

  res.json({
    brand,
    orderItems,
    summary: { totalSales, commissionAmount, payoutAmount, itemCount: orderItems.length },
    settlements,
  });
}

module.exports = {
  register, dashboard, myOrders,
  listMyMenu, createMyMenuItem, updateMyMenuItem, deleteMyMenuItem, cancelMyRequest,
  myInventory, adjustMyStock,
  listMyLocations, createMyLocation, deleteMyLocation,
  listMyOffers, createMyOffer,
  myEarnings,
};
