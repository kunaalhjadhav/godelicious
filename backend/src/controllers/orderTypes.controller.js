const prisma = require("../config/db");

// GET /api/order-types (public) - active only, for the home page
async function listActiveOrderTypes(req, res) {
  const orderTypes = await prisma.orderType.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  res.json({ orderTypes });
}

// GET /api/order-types/all (ADMIN)
async function listAllOrderTypes(req, res) {
  const orderTypes = await prisma.orderType.findMany({ orderBy: { sortOrder: "asc" } });
  res.json({ orderTypes });
}

// POST /api/order-types (ADMIN)
async function createOrderType(req, res) {
  const { name, imageUrl, description, sortOrder } = req.body;
  if (!name) return res.status(400).json({ error: "name is required." });

  const orderType = await prisma.orderType.create({
    data: { name, imageUrl, description, sortOrder: sortOrder ? Number(sortOrder) : 0 },
  });
  res.status(201).json({ orderType });
}

// PATCH /api/order-types/:id (ADMIN)
async function updateOrderType(req, res) {
  const { name, imageUrl, description, sortOrder, isActive } = req.body;
  const orderType = await prisma.orderType.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(description !== undefined && { description }),
      ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
      ...(isActive !== undefined && { isActive: Boolean(isActive) }),
    },
  });
  res.json({ orderType });
}

// DELETE /api/order-types/:id (ADMIN)
async function deleteOrderType(req, res) {
  await prisma.orderType.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}

module.exports = { listActiveOrderTypes, listAllOrderTypes, createOrderType, updateOrderType, deleteOrderType };
