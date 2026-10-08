const prisma = require("../config/db");
const { attachRatings } = require("../services/ratings.service");
const { getBestsellers } = require("../services/bestsellers.service");
const { checkBackInStock } = require("../services/backInStock.service");

// ----- Categories -----

// GET /api/categories (public)
async function listCategories(req, res) {
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
  res.json({ categories });
}

// POST /api/categories (ADMIN)
async function createCategory(req, res) {
  const { name, sortOrder, imageUrl } = req.body;
  if (!name) return res.status(400).json({ error: "name is required." });
  const category = await prisma.category.create({ data: { name, sortOrder: sortOrder || 0, imageUrl } });
  res.status(201).json({ category });
}

// PATCH /api/menu/categories/:id (ADMIN)
async function updateCategory(req, res) {
  const { name, sortOrder, imageUrl } = req.body;
  const category = await prisma.category.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
      ...(imageUrl !== undefined && { imageUrl }),
    },
  });
  res.json({ category });
}

// DELETE /api/categories/:id (ADMIN)
async function deleteCategory(req, res) {
  await prisma.category.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}

// ----- Menu Items -----

function isStaff(req) {
  return Boolean(req.user && ["ADMIN", "STAFF"].includes(req.user.role));
}

// GET /api/menu (public) - supports ?categoryId= and ?available=true
async function listMenuItems(req, res) {
  const { categoryId, available, brandId } = req.query;
  const where = {};
  if (categoryId) where.categoryId = categoryId;
  if (available === "true") where.isAvailable = true;
  if (brandId) where.brandId = brandId === "house" ? null : brandId;
  // Customers only see admin-approved items; staff see everything (incl. pending brand items)
  if (!isStaff(req)) where.approvalStatus = "APPROVED";

  const items = await prisma.menuItem.findMany({
    where,
    include: { category: true, comboGroups: { include: { options: true } }, brand: true },
    orderBy: { name: "asc" },
  });
  res.json({ items: await attachRatings(items) });
}

// GET /api/menu/:id (public)
async function getMenuItem(req, res) {
  const item = await prisma.menuItem.findUnique({
    where: { id: req.params.id },
    include: { category: true, comboGroups: { include: { options: true } }, brand: true },
  });
  if (!item || (item.approvalStatus !== "APPROVED" && !isStaff(req))) {
    return res.status(404).json({ error: "Menu item not found." });
  }
  const [withRating] = await attachRatings([item]);
  res.json({ item: withRating });
}

// GET /api/menu/:id/reviews (public) - reviews on delivered orders that included this item
async function itemReviews(req, res) {
  const reviews = await prisma.review.findMany({
    where: { order: { items: { some: { menuItemId: req.params.id } } } },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const [item] = await attachRatings([{ id: req.params.id }]);
  res.json({
    rating: item.rating,
    ratingCount: item.ratingCount,
    reviews: reviews.map((r) => {
      const parts = (r.user?.name || "Customer").trim().split(/\s+/);
      const shortName = parts.length > 1 ? `${parts[0]} ${parts[1].charAt(0)}.` : parts[0];
      return { id: r.id, name: shortName, rating: r.rating, comment: r.comment, createdAt: r.createdAt };
    }),
  });
}

// GET /api/menu/bestsellers (public) - most ordered approved, available items
async function bestsellers(req, res) {
  const limit = Math.min(12, Number(req.query.limit) || 6);
  const exclude = String(req.query.exclude || "").split(",").filter(Boolean);
  res.json({ items: await getBestsellers(limit, exclude) });
}

// POST /api/menu (ADMIN)
async function createMenuItem(req, res) {
  try {
    const { name, description, price, imageUrl, isVeg, categoryId, stockQty, isCombo, brandId, soldByWeight, minOrderGrams, servesPerUnit, plannerRole } = req.body;
    if (!name || price === undefined || !categoryId) {
      return res.status(400).json({ error: "name, price and categoryId are required." });
    }

    const item = await prisma.menuItem.create({
      data: {
        name,
        description,
        price: Number(price),
        imageUrl,
        isVeg: isVeg !== undefined ? Boolean(isVeg) : true,
        categoryId,
        stockQty: stockQty !== undefined ? Number(stockQty) : 0,
        isCombo: isCombo !== undefined ? Boolean(isCombo) : false,
        brandId: brandId || null,
        soldByWeight: soldByWeight !== undefined ? Boolean(soldByWeight) : false,
        minOrderGrams: minOrderGrams !== undefined ? Number(minOrderGrams) : 1000,
        servesPerUnit: servesPerUnit ? Math.max(1, Number(servesPerUnit)) : 1,
        plannerRole: ["MAIN", "SWEET", "DRINK"].includes(plannerRole) ? plannerRole : null,
      },
    });
    res.status(201).json({ item });
  } catch (err) {
    console.error("createMenuItem error:", err);
    res.status(500).json({ error: "Could not create menu item." });
  }
}

// PUT /api/menu/:id (ADMIN)
async function updateMenuItem(req, res) {
  try {
    const { name, description, price, imageUrl, isVeg, isAvailable, categoryId, isCombo, soldByWeight, minOrderGrams, servesPerUnit, plannerRole } = req.body;
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
        ...(isCombo !== undefined && { isCombo: Boolean(isCombo) }),
        ...(soldByWeight !== undefined && { soldByWeight: Boolean(soldByWeight) }),
        ...(minOrderGrams !== undefined && { minOrderGrams: Number(minOrderGrams) }),
        ...(servesPerUnit !== undefined && { servesPerUnit: Math.max(1, Number(servesPerUnit) || 1) }),
        ...(plannerRole !== undefined && { plannerRole: ["MAIN", "SWEET", "DRINK"].includes(plannerRole) ? plannerRole : null }),
      },
    });
    checkBackInStock(item.id);
    res.json({ item });
  } catch (err) {
    console.error("updateMenuItem error:", err);
    res.status(500).json({ error: "Could not update menu item." });
  }
}

// DELETE /api/menu/:id (ADMIN)
async function deleteMenuItem(req, res) {
  await prisma.menuItem.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}

// ----- Combo groups (for items where isCombo = true) -----

// POST /api/menu/:id/combo-groups (ADMIN)
// body: { name, options: [{ label, priceDelta }] }
async function addComboGroup(req, res) {
  const { name, options } = req.body;
  if (!name || !Array.isArray(options) || options.length === 0) {
    return res.status(400).json({ error: "name and a non-empty options array are required." });
  }

  const group = await prisma.comboGroup.create({
    data: {
      menuItemId: req.params.id,
      name,
      options: {
        create: options.map((o) => ({ label: o.label, priceDelta: Number(o.priceDelta || 0) })),
      },
    },
    include: { options: true },
  });
  res.status(201).json({ group });
}

// DELETE /api/menu/combo-groups/:groupId (ADMIN)
async function deleteComboGroup(req, res) {
  await prisma.comboGroup.delete({ where: { id: req.params.groupId } });
  res.json({ success: true });
}

// POST /api/menu/bulk (ADMIN)
// body: { items: [{ name, description, price, categoryName, stockQty, isVeg, brandId? }] }
// Used by the admin dashboard's CSV bulk-upload (parsed client-side, sent as JSON here).
// Categories are matched/created by name so the CSV doesn't need to know category IDs.
async function bulkCreateMenuItems(req, res) {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "items must be a non-empty array." });
  }

  const results = { created: 0, errors: [] };

  for (const [index, row] of items.entries()) {
    try {
      if (!row.name || row.price === undefined || !row.categoryName) {
        throw new Error("name, price and categoryName are required.");
      }
      const category = await prisma.category.upsert({
        where: { name: row.categoryName },
        update: {},
        create: { name: row.categoryName },
      });
      await prisma.menuItem.create({
        data: {
          name: row.name,
          description: row.description || null,
          price: Number(row.price),
          stockQty: row.stockQty !== undefined ? Number(row.stockQty) : 0,
          isVeg: row.isVeg !== undefined ? String(row.isVeg).toLowerCase() === "true" : true,
          categoryId: category.id,
          brandId: row.brandId || null,
        },
      });
      results.created++;
    } catch (err) {
      results.errors.push({ row: index + 1, name: row.name, error: err.message });
    }
  }

  res.status(201).json(results);
}

module.exports = {
  itemReviews,
  bestsellers,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listMenuItems,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  addComboGroup,
  deleteComboGroup,
  bulkCreateMenuItems,
};
