const prisma = require("../config/db");

// GET /api/brands (ADMIN)
async function listBrands(req, res) {
  const brands = await prisma.brand.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ brands });
}

// GET /api/brands/public (public) - active brands, for filtering the customer menu by brand
async function listActiveBrands(req, res) {
  const brands = await prisma.brand.findMany({
    where: { isActive: true },
    select: { id: true, name: true, logoUrl: true },
    orderBy: { name: "asc" },
  });
  res.json({ brands });
}

// POST /api/brands (ADMIN)
async function createBrand(req, res) {
  const { name, logoUrl, contactEmail, contactPhone, commissionPercent } = req.body;
  if (!name) return res.status(400).json({ error: "name is required." });

  const brand = await prisma.brand.create({
    data: {
      name, logoUrl, contactEmail, contactPhone,
      commissionPercent: commissionPercent !== undefined ? Number(commissionPercent) : 15,
    },
  });
  res.status(201).json({ brand });
}

// PATCH /api/brands/:id (ADMIN)
async function updateBrand(req, res) {
  const { name, logoUrl, contactEmail, contactPhone, commissionPercent, isActive } = req.body;
  const brand = await prisma.brand.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(logoUrl !== undefined && { logoUrl }),
      ...(contactEmail !== undefined && { contactEmail }),
      ...(contactPhone !== undefined && { contactPhone }),
      ...(commissionPercent !== undefined && { commissionPercent: Number(commissionPercent) }),
      ...(isActive !== undefined && { isActive: Boolean(isActive) }),
    },
  });
  res.json({ brand });
}

// DELETE /api/brands/:id (ADMIN)
async function deleteBrand(req, res) {
  await prisma.brand.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}

// GET /api/brands/:id/sales (ADMIN) - orders containing this brand's items, with totals
// Optional ?from=&to= (ISO dates) to scope the range.
async function brandSales(req, res) {
  const { from, to } = req.query;
  const brand = await prisma.brand.findUnique({ where: { id: req.params.id } });
  if (!brand) return res.status(404).json({ error: "Brand not found." });

  const dateFilter = {};
  if (from) dateFilter.gte = new Date(from);
  if (to) dateFilter.lte = new Date(to);

  const orderItems = await prisma.orderItem.findMany({
    where: {
      menuItem: { brandId: req.params.id },
      order: {
        status: { not: "CANCELLED" },
        ...(from || to ? { createdAt: dateFilter } : {}),
      },
    },
    include: {
      menuItem: { select: { name: true } },
      order: { select: { id: true, status: true, createdAt: true, paymentStatus: true } },
    },
    orderBy: { order: { createdAt: "desc" } },
  });

  const totalSales = orderItems.reduce((sum, oi) => sum + oi.price * oi.quantity, 0);
  const commissionAmount = totalSales * (brand.commissionPercent / 100);
  const payoutAmount = totalSales - commissionAmount;

  res.json({
    brand,
    orderItems,
    summary: { totalSales, commissionAmount, payoutAmount, itemCount: orderItems.length },
  });
}

// POST /api/brands/:id/settlements (ADMIN) - generate a settlement record for a period
// body: { periodStart, periodEnd }
async function createSettlement(req, res) {
  const { periodStart, periodEnd } = req.body;
  if (!periodStart || !periodEnd) {
    return res.status(400).json({ error: "periodStart and periodEnd are required." });
  }

  const brand = await prisma.brand.findUnique({ where: { id: req.params.id } });
  if (!brand) return res.status(404).json({ error: "Brand not found." });

  const orderItems = await prisma.orderItem.findMany({
    where: {
      menuItem: { brandId: req.params.id },
      order: {
        status: { not: "CANCELLED" },
        createdAt: { gte: new Date(periodStart), lte: new Date(periodEnd) },
      },
    },
  });

  const totalSales = orderItems.reduce((sum, oi) => sum + oi.price * oi.quantity, 0);
  const commissionAmount = totalSales * (brand.commissionPercent / 100);
  const payoutAmount = totalSales - commissionAmount;

  const settlement = await prisma.brandSettlement.create({
    data: {
      brandId: req.params.id,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      totalSales, commissionAmount, payoutAmount,
    },
  });
  res.status(201).json({ settlement });
}

// GET /api/brands/:id/settlements (ADMIN)
async function listSettlements(req, res) {
  const settlements = await prisma.brandSettlement.findMany({
    where: { brandId: req.params.id },
    orderBy: { createdAt: "desc" },
  });
  res.json({ settlements });
}

// PATCH /api/brands/settlements/:settlementId (ADMIN) - mark paid
async function markSettlementPaid(req, res) {
  const settlement = await prisma.brandSettlement.update({
    where: { id: req.params.settlementId },
    data: { status: "PAID", paidAt: new Date() },
  });
  res.json({ settlement });
}

module.exports = {
  listBrands, listActiveBrands, createBrand, updateBrand, deleteBrand,
  brandSales, createSettlement, listSettlements, markSettlementPaid,
};
