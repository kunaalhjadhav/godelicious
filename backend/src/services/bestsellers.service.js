const prisma = require("../config/db");
const { attachRatings } = require("./ratings.service");

// Most-ordered approved items that can be bought right now. A brand-new shop
// with no orders yet gets its newest available items instead.
async function getBestsellers(limit = 6, exclude = []) {
  const grouped = await prisma.orderItem.groupBy({
    by: ["menuItemId"],
    where: { order: { status: { not: "CANCELLED" } }, ...(exclude.length && { menuItemId: { notIn: exclude } }) },
    _count: { menuItemId: true },
    orderBy: { _count: { menuItemId: "desc" } },
    take: limit * 3,
  });
  const ids = grouped.map((g) => g.menuItemId);
  const buyable = { approvalStatus: "APPROVED", isAvailable: true, stockQty: { gt: 0 } };
  let items = ids.length
    ? await prisma.menuItem.findMany({ where: { id: { in: ids }, ...buyable }, include: { category: true, brand: true } })
    : [];
  items.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
  items = items.slice(0, limit);
  if (items.length === 0) {
    items = await prisma.menuItem.findMany({
      where: { ...buyable, ...(exclude.length && { id: { notIn: exclude } }) },
      include: { category: true, brand: true },
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  }
  return attachRatings(items);
}

// Orders per item, used to rank which product the planner should suggest.
async function salesRank() {
  const grouped = await prisma.orderItem.groupBy({
    by: ["menuItemId"], _count: { menuItemId: true },
    where: { order: { status: { not: "CANCELLED" } } },
  });
  return Object.fromEntries(grouped.map((g) => [g.menuItemId, g._count.menuItemId]));
}

module.exports = { getBestsellers, salesRank };
