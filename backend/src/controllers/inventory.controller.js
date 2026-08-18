const prisma = require("../config/db");

// GET /api/inventory (ADMIN/STAFF) - current stock levels for every menu item
async function listInventory(req, res) {
  const items = await prisma.menuItem.findMany({
    select: {
      id: true,
      name: true,
      stockQty: true,
      isAvailable: true,
      category: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });
  res.json({ items });
}

// GET /api/inventory/:menuItemId/logs (ADMIN/STAFF) - history of stock changes
async function itemLogs(req, res) {
  const logs = await prisma.inventoryLog.findMany({
    where: { menuItemId: req.params.menuItemId },
    include: { staff: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ logs });
}

// PATCH /api/inventory/:menuItemId (ADMIN/STAFF)
// body: { changeQty, reason } - changeQty can be positive (restock) or negative (wastage/adjustment)
async function adjustStock(req, res) {
  const { changeQty, reason } = req.body;

  if (typeof changeQty !== "number" || changeQty === 0) {
    return res.status(400).json({ error: "changeQty must be a non-zero number." });
  }
  if (!reason) {
    return res.status(400).json({ error: "reason is required (e.g. restock, wastage, adjustment)." });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.menuItem.findUnique({ where: { id: req.params.menuItemId } });
      if (!item) throw new Error("Menu item not found.");

      const newQty = item.stockQty + changeQty;
      if (newQty < 0) throw new Error("Resulting stock cannot be negative.");

      const updated = await tx.menuItem.update({
        where: { id: req.params.menuItemId },
        data: { stockQty: newQty },
      });

      await tx.inventoryLog.create({
        data: {
          menuItemId: req.params.menuItemId,
          changeQty,
          reason,
          staffId: req.user.id,
        },
      });

      return updated;
    });

    res.json({ item: result });
  } catch (err) {
    console.error("adjustStock error:", err.message);
    res.status(400).json({ error: err.message || "Could not adjust stock." });
  }
}

module.exports = { listInventory, itemLogs, adjustStock };
