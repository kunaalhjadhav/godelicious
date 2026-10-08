const prisma = require("../config/db");

// Reviews belong to orders, not items. An item's rating is the average of the
// reviews on delivered orders that contained it.
async function ratingMap(itemIds) {
  if (!itemIds.length) return {};
  const reviews = await prisma.review.findMany({
    where: { order: { items: { some: { menuItemId: { in: itemIds } } } } },
    select: { rating: true, order: { select: { items: { select: { menuItemId: true } } } } },
  });
  const sums = {};
  for (const r of reviews) {
    const seen = new Set(r.order.items.map((i) => i.menuItemId));
    for (const id of seen) {
      if (!sums[id]) sums[id] = { total: 0, count: 0 };
      sums[id].total += r.rating;
      sums[id].count += 1;
    }
  }
  return sums;
}

// Adds rating (average, 1 decimal, or null) and ratingCount to each item.
async function attachRatings(items) {
  const map = await ratingMap(items.map((i) => i.id));
  return items.map((i) => {
    const s = map[i.id];
    return { ...i, rating: s ? Math.round((s.total / s.count) * 10) / 10 : null, ratingCount: s ? s.count : 0 };
  });
}

module.exports = { attachRatings };
