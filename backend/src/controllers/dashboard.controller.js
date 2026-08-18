const prisma = require("../config/db");

// GET /api/dashboard/stats (ADMIN/STAFF)
async function stats(req, res) {
  const [pendingOrders, todayOrders, lowStockItems, pendingEnquiries, totalRevenueResult] =
    await Promise.all([
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.order.count({
        where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      }),
      prisma.menuItem.findMany({
        where: { stockQty: { lt: 10 } },
        select: { id: true, name: true, stockQty: true },
      }),
      prisma.venueEnquiry.count({ where: { status: "PENDING" } }),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { status: { not: "CANCELLED" } },
      }),
    ]);

  res.json({
    pendingOrders,
    todayOrders,
    lowStockItems,
    pendingEnquiries,
    totalRevenue: totalRevenueResult._sum.totalAmount || 0,
  });
}

module.exports = { stats };
