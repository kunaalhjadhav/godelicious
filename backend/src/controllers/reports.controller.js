const prisma = require("../config/db");

function dateFilter(from, to) {
  const filter = {};
  if (from) filter.gte = new Date(from);
  if (to) filter.lte = new Date(to);
  return Object.keys(filter).length ? filter : undefined;
}

// GET /api/reports/sales (ADMIN) - optional ?from=&to= (ISO dates)
async function salesReport(req, res) {
  const { from, to } = req.query;
  const createdAt = dateFilter(from, to);

  const orders = await prisma.order.findMany({
    where: { status: { not: "CANCELLED" }, ...(createdAt && { createdAt }) },
    include: { items: { include: { menuItem: { select: { name: true, category: { select: { name: true } } } } } } },
    orderBy: { createdAt: "desc" },
  });

  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalDiscount = orders.reduce((sum, o) => sum + o.discountAmount, 0);
  const orderCount = orders.length;
  const avgOrderValue = orderCount ? totalRevenue / orderCount : 0;

  // Per-item sales breakdown, for "what's selling" insight
  const itemSales = {};
  for (const order of orders) {
    for (const item of order.items) {
      const key = item.menuItem.name;
      if (!itemSales[key]) itemSales[key] = { name: key, quantity: 0, revenue: 0 };
      itemSales[key].quantity += item.quantity;
      itemSales[key].revenue += item.price * item.quantity;
    }
  }
  const topItems = Object.values(itemSales).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  // Per-day breakdown for a simple trend line
  const byDay = {};
  for (const order of orders) {
    const day = order.createdAt.toISOString().slice(0, 10);
    byDay[day] = (byDay[day] || 0) + order.totalAmount;
  }
  const dailyRevenue = Object.entries(byDay).map(([date, revenue]) => ({ date, revenue })).sort((a, b) => a.date.localeCompare(b.date));

  res.json({
    summary: { totalRevenue, totalDiscount, orderCount, avgOrderValue },
    topItems,
    dailyRevenue,
    orders,
  });
}

// GET /api/reports/sales/export (ADMIN) - CSV download, one row per order
async function exportSalesCsv(req, res) {
  const { from, to } = req.query;
  const createdAt = dateFilter(from, to);

  const orders = await prisma.order.findMany({
    where: { status: { not: "CANCELLED" }, ...(createdAt && { createdAt }) },
    include: { user: { select: { name: true, email: true } }, items: true },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "Order ID", "Date", "Customer", "Email", "Status", "Payment Method", "Payment Status",
    "Items", "Subtotal Before Discount", "Discount", "Total", "Coupon",
  ];
  const rows = orders.map((o) => {
    const subtotalBefore = o.totalAmount + o.discountAmount;
    return [
      o.id,
      o.createdAt.toISOString(),
      o.user.name,
      o.user.email,
      o.status,
      o.paymentMethod,
      o.paymentStatus,
      o.items.reduce((sum, i) => sum + i.quantity, 0),
      subtotalBefore.toFixed(2),
      o.discountAmount.toFixed(2),
      o.totalAmount.toFixed(2),
      o.couponCode || "",
    ];
  });

  // Minimal CSV escaping: wrap any field containing a comma/quote/newline in
  // quotes and double up internal quotes — sufficient for this data shape
  // (names, emails, IDs) without pulling in a CSV library.
  function csvEscape(value) {
    const str = String(value);
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  }

  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="godelicious-sales-${Date.now()}.csv"`);
  res.send(csv);
}

module.exports = { salesReport, exportSalesCsv };
