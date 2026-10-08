const prisma = require("../config/db");
const { attachRatings } = require("../services/ratings.service");

// GET /api/favorites
async function list(req, res) {
  const favs = await prisma.favorite.findMany({
    where: { userId: req.user.id, menuItem: { approvalStatus: "APPROVED" } },
    include: { menuItem: { include: { category: true, brand: true } } },
    orderBy: { createdAt: "desc" },
  });
  const items = await attachRatings(favs.map((f) => f.menuItem));
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  res.json({
    favorites: favs.map((f) => ({
      id: f.id,
      menuItemId: f.menuItemId,
      notifyWhenBack: f.notifyWhenBack,
      createdAt: f.createdAt,
      menuItem: byId[f.menuItemId],
    })),
  });
}

// GET /api/favorites/ids - just the ids, so every item card can show a filled heart
async function ids(req, res) {
  const favs = await prisma.favorite.findMany({ where: { userId: req.user.id }, select: { menuItemId: true } });
  res.json({ ids: favs.map((f) => f.menuItemId) });
}

// POST /api/favorites { menuItemId }
async function add(req, res) {
  const { menuItemId } = req.body;
  if (!menuItemId) return res.status(400).json({ error: "menuItemId is required." });
  const item = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
  if (!item) return res.status(404).json({ error: "Item not found." });
  const favorite = await prisma.favorite.upsert({
    where: { userId_menuItemId: { userId: req.user.id, menuItemId } },
    update: {},
    create: { userId: req.user.id, menuItemId },
  });
  res.status(201).json({ favorite });
}

// DELETE /api/favorites/:menuItemId
async function remove(req, res) {
  await prisma.favorite.deleteMany({ where: { userId: req.user.id, menuItemId: req.params.menuItemId } });
  res.json({ success: true });
}

// PATCH /api/favorites/:menuItemId/notify { notify }
async function setNotify(req, res) {
  const notify = Boolean(req.body.notify);
  const result = await prisma.favorite.updateMany({
    where: { userId: req.user.id, menuItemId: req.params.menuItemId },
    data: { notifyWhenBack: notify },
  });
  if (result.count === 0) return res.status(404).json({ error: "Not in your favourites." });
  res.json({ success: true, notifyWhenBack: notify });
}

module.exports = { list, ids, add, remove, setNotify };
