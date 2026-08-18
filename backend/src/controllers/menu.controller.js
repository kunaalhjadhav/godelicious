const prisma = require("../config/db");

// ----- Categories -----

// GET /api/categories (public)
async function listCategories(req, res) {
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
  res.json({ categories });
}

// POST /api/categories (ADMIN)
async function createCategory(req, res) {
  const { name, sortOrder } = req.body;
  if (!name) return res.status(400).json({ error: "name is required." });
  const category = await prisma.category.create({ data: { name, sortOrder: sortOrder || 0 } });
  res.status(201).json({ category });
}

// DELETE /api/categories/:id (ADMIN)
async function deleteCategory(req, res) {
  await prisma.category.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}

// ----- Menu Items -----

// GET /api/menu (public) - supports ?categoryId= and ?available=true
async function listMenuItems(req, res) {
  const { categoryId, available, brandId } = req.query;
  const where = {};
  if (categoryId) where.categoryId = categoryId;
  if (available === "true") where.isAvailable = true;
  if (brandId) where.brandId = brandId === "house" ? null : brandId;

  const items = await prisma.menuItem.findMany({
    where,
    include: { category: true, comboGroups: { include: { options: true } }, brand: true },
    orderBy: { name: "asc" },
  });
  res.json({ items });
}

// GET /api/menu/:id (public)
async function getMenuItem(req, res) {
  const item = await prisma.menuItem.findUnique({
    where: { id: req.params.id },
    include: { category: true, comboGroups: { include: { options: true } } },
  });
  if (!item) return res.status(404).json({ error: "Menu item not found." });
  res.json({ item });
}

// POST /api/menu (ADMIN)
async function createMenuItem(req, res) {
  try {
    const { name, description, price, imageUrl, isVeg, categoryId, stockQty, isCombo, brandId } = req.body;
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
    const { name, description, price, imageUrl, isVeg, isAvailable, categoryId, isCombo } = req.body;
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
      },
    });
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
  listCategories,
  createCategory,
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
