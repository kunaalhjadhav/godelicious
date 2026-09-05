const prisma = require("../config/db");

// GET /api/addons (public) - active only, for the booking form
async function listActiveAddons(req, res) {
  const addons = await prisma.addon.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  res.json({ addons });
}

// GET /api/addons/all (ADMIN)
async function listAllAddons(req, res) {
  const addons = await prisma.addon.findMany({ orderBy: { name: "asc" } });
  res.json({ addons });
}

// POST /api/addons (ADMIN)
async function createAddon(req, res) {
  const { name, price } = req.body;
  if (!name || price === undefined) return res.status(400).json({ error: "name and price are required." });

  const addon = await prisma.addon.create({ data: { name, price: Number(price) } });
  res.status(201).json({ addon });
}

// PATCH /api/addons/:id (ADMIN)
async function updateAddon(req, res) {
  const { name, price, isActive } = req.body;
  const addon = await prisma.addon.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(price !== undefined && { price: Number(price) }),
      ...(isActive !== undefined && { isActive: Boolean(isActive) }),
    },
  });
  res.json({ addon });
}

// DELETE /api/addons/:id (ADMIN)
async function deleteAddon(req, res) {
  await prisma.addon.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}

module.exports = { listActiveAddons, listAllAddons, createAddon, updateAddon, deleteAddon };
