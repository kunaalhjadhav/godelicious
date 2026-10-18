const prisma = require("../config/db");
const { attachRatings } = require("../services/ratings.service");
const { removeMenuItem } = require("./menu.controller");

// A meal box is a normal MenuItem (isMealBox = true) plus the list of dishes inside it.
// Because of that, carts, stock, coupons, GST, favourites and orders all work on boxes with
// no special cases - the only extra rule is the minimum number of meals per order.

const BOX_CATEGORY = "Meal Boxes";

const INCLUDE = {
  category: true,
  brand: true,
  mealBoxItems: { include: { item: true }, orderBy: { sortOrder: "asc" } },
};

async function settingsRow() {
  return prisma.appSettings.upsert({ where: { id: "singleton" }, update: {}, create: { id: "singleton" } });
}

async function boxCategoryId() {
  const found = await prisma.category.findUnique({ where: { name: BOX_CATEGORY } });
  if (found) return found.id;
  const max = await prisma.category.aggregate({ _max: { sortOrder: true } });
  const created = await prisma.category.create({ data: { name: BOX_CATEGORY, sortOrder: (max._max.sortOrder || 0) + 1 } });
  return created.id;
}

// Only real dishes can go inside a box (no boxes inside boxes), in the order the admin picked them.
async function cleanLines(rawItems) {
  const lines = Array.isArray(rawItems) ? rawItems : [];
  const ids = [...new Set(lines.map((l) => l.menuItemId).filter(Boolean))];
  if (ids.length === 0) throw new Error("Pick at least one dish for this meal box.");
  const found = await prisma.menuItem.findMany({ where: { id: { in: ids }, isMealBox: false, isArchived: false }, select: { id: true } });
  const ok = new Set(found.map((f) => f.id));
  const out = [];
  for (const l of lines) {
    if (!ok.has(l.menuItemId) || out.some((o) => o.itemId === l.menuItemId)) continue;
    out.push({ itemId: l.menuItemId, note: l.note ? String(l.note).trim().slice(0, 60) : null, sortOrder: out.length });
  }
  if (out.length === 0) throw new Error("Those dishes could not be found. Pick them again.");
  return out;
}

// GET /api/meal-boxes (public) - boxes customers can order right now
async function listPublic(req, res) {
  const [boxes, settings] = await Promise.all([
    prisma.menuItem.findMany({
      where: { isMealBox: true, isArchived: false, approvalStatus: "APPROVED", isAvailable: true },
      include: INCLUDE, orderBy: { createdAt: "desc" },
    }),
    settingsRow(),
  ]);
  res.json({ boxes: await attachRatings(boxes), minQty: settings.mealBoxMinQty, gstPercent: settings.gstPercent });
}

// GET /api/meal-boxes/admin/all (ADMIN) - includes hidden boxes
async function listAdmin(req, res) {
  const boxes = await prisma.menuItem.findMany({
    where: { isMealBox: true, isArchived: false }, include: INCLUDE, orderBy: { createdAt: "desc" },
  });
  res.json({ boxes });
}

// POST /api/meal-boxes (ADMIN)
// body: { name, description, imageUrl, price, isVeg, stockQty, isAvailable, items: [{ menuItemId, note }] }
async function create(req, res) {
  try {
    const { name, description, imageUrl, price, isVeg, stockQty, isAvailable, servesPerUnit } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ error: "Give the meal box a name." });
    if (price === undefined || price === "" || Number(price) <= 0) return res.status(400).json({ error: "Enter the price of one meal box." });
    const lines = await cleanLines(req.body.items);
    const box = await prisma.menuItem.create({
      data: {
        name: String(name).trim(), description: description || null, imageUrl: imageUrl || null,
        price: Number(price), isVeg: isVeg !== undefined ? Boolean(isVeg) : true,
        stockQty: stockQty !== undefined && stockQty !== "" ? Math.max(0, Math.floor(Number(stockQty))) : 0,
        isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
        servesPerUnit: servesPerUnit ? Math.max(1, Math.floor(Number(servesPerUnit))) : 1,
        isMealBox: true, categoryId: await boxCategoryId(),
        mealBoxItems: { create: lines },
      },
      include: INCLUDE,
    });
    res.status(201).json({ box });
  } catch (err) {
    console.error("create meal box error:", err);
    res.status(400).json({ error: err.message || "Could not create the meal box." });
  }
}

// PUT /api/meal-boxes/:id (ADMIN)
async function update(req, res) {
  try {
    const existing = await prisma.menuItem.findFirst({ where: { id: req.params.id, isMealBox: true } });
    if (!existing) return res.status(404).json({ error: "Meal box not found." });
    const { name, description, imageUrl, price, isVeg, stockQty, isAvailable, servesPerUnit } = req.body;
    const data = {
      ...(name !== undefined && { name: String(name).trim() }),
      ...(description !== undefined && { description: description || null }),
      ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
      ...(price !== undefined && price !== "" && { price: Number(price) }),
      ...(isVeg !== undefined && { isVeg: Boolean(isVeg) }),
      ...(stockQty !== undefined && stockQty !== "" && { stockQty: Math.max(0, Math.floor(Number(stockQty))) }),
      ...(isAvailable !== undefined && { isAvailable: Boolean(isAvailable) }),
      ...(servesPerUnit !== undefined && { servesPerUnit: Math.max(1, Math.floor(Number(servesPerUnit)) || 1) }),
    };
    if (data.name === "") return res.status(400).json({ error: "Give the meal box a name." });
    if (data.price !== undefined && !(data.price > 0)) return res.status(400).json({ error: "Enter the price of one meal box." });

    const box = await prisma.$transaction(async (tx) => {
      if (req.body.items !== undefined) {
        const lines = await cleanLines(req.body.items);
        await tx.mealBoxItem.deleteMany({ where: { boxId: existing.id } });
        data.mealBoxItems = { create: lines };
      }
      return tx.menuItem.update({ where: { id: existing.id }, data, include: INCLUDE });
    });
    res.json({ box });
  } catch (err) {
    console.error("update meal box error:", err);
    res.status(400).json({ error: err.message || "Could not update the meal box." });
  }
}

// DELETE /api/meal-boxes/:id (ADMIN)
async function remove(req, res) {
  const existing = await prisma.menuItem.findFirst({ where: { id: req.params.id, isMealBox: true } });
  if (!existing) return res.status(404).json({ error: "Meal box not found." });
  res.json(await removeMenuItem(existing.id));
}

module.exports = { listPublic, listAdmin, create, update, remove };
