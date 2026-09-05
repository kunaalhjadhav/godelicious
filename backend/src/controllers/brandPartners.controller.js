const bcrypt = require("bcryptjs");
const prisma = require("../config/db");
const { signToken } = require("../utils/jwt");

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

  const [menuItemCount, pendingOrdersCount, totalSalesResult] = await Promise.all([
    prisma.menuItem.count({ where: { brandId } }),
    prisma.order.count({
      where: { status: { in: ["PENDING", "CONFIRMED", "PREPARING"] }, items: { some: { menuItem: { brandId } } } },
    }),
    prisma.orderItem.aggregate({
      _sum: { price: true },
      where: { menuItem: { brandId }, order: { status: { not: "CANCELLED" } } },
    }),
  ]);

  res.json({
    brand,
    menuItemCount,
    pendingOrdersCount,
    totalSales: totalSalesResult._sum.price || 0,
  });
}

// GET /api/brand-partners/me/orders — orders containing at least one of this brand's items
async function myOrders(req, res) {
  const brandId = myBrandId(req);
  const orders = await prisma.order.findMany({
    where: { items: { some: { menuItem: { brandId } } } },
    include: {
      items: { include: { menuItem: true } },
      user: { select: { name: true, phone: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Only surface this brand's own line items per order — a customer's cart
  // can mix items from multiple brands/the house menu in one order, and a
  // brand partner should only see their own portion, not everyone else's.
  const scoped = orders.map((o) => ({
    ...o,
    items: o.items.filter((i) => i.menuItem.brandId === brandId),
  }));

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
  const { name, description, price, imageUrl, isVeg, categoryId, stockQty, isCombo } = req.body;
  if (!name || price === undefined || !categoryId) {
    return res.status(400).json({ error: "name, price and categoryId are required." });
  }

  const item = await prisma.menuItem.create({
    data: {
      name, description, price: Number(price), imageUrl,
      isVeg: isVeg !== undefined ? Boolean(isVeg) : true,
      categoryId,
      stockQty: stockQty !== undefined ? Number(stockQty) : 0,
      isCombo: isCombo !== undefined ? Boolean(isCombo) : false,
      brandId: myBrandId(req),
    },
  });
  res.status(201).json({ item });
}

async function assertOwnsMenuItem(req) {
  const item = await prisma.menuItem.findUnique({ where: { id: req.params.id } });
  if (!item) throw Object.assign(new Error("Menu item not found."), { status: 404 });
  if (item.brandId !== myBrandId(req)) throw Object.assign(new Error("Not your menu item."), { status: 403 });
  return item;
}

async function updateMyMenuItem(req, res) {
  try {
    await assertOwnsMenuItem(req);
    const { name, description, price, imageUrl, isVeg, isAvailable, categoryId, stockQty, isCombo } = req.body;
    const item = await prisma.menuItem.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: Number(price) }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(isVeg !== undefined && { isVeg: Boolean(isVeg) }),
        ...(isAvailable !== undefined && { isAvailable: Boolean(isAvailable) }),
        ...(categoryId !== undefined && { categoryId }),
        ...(stockQty !== undefined && { stockQty: Number(stockQty) }),
        ...(isCombo !== undefined && { isCombo: Boolean(isCombo) }),
      },
    });
    res.json({ item });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not update menu item." });
  }
}

async function deleteMyMenuItem(req, res) {
  try {
    await assertOwnsMenuItem(req);
    await prisma.menuItem.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not delete menu item." });
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
  listMyMenu, createMyMenuItem, updateMyMenuItem, deleteMyMenuItem,
  listMyLocations, createMyLocation, deleteMyLocation,
  listMyOffers, createMyOffer,
  myEarnings,
};
