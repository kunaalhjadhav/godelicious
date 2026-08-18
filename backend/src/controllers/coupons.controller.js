const prisma = require("../config/db");

// GET /api/coupons (ADMIN)
async function listCoupons(req, res) {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ coupons });
}

// POST /api/coupons (ADMIN)
async function createCoupon(req, res) {
  try {
    const { code, discountType, discountValue, minOrderAmount, maxUses, expiresAt } = req.body;
    if (!code || !discountType || discountValue === undefined) {
      return res.status(400).json({ error: "code, discountType and discountValue are required." });
    }
    if (!["PERCENT", "FLAT"].includes(discountType)) {
      return res.status(400).json({ error: "discountType must be PERCENT or FLAT." });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase().trim(),
        discountType,
        discountValue: Number(discountValue),
        minOrderAmount: minOrderAmount ? Number(minOrderAmount) : 0,
        maxUses: maxUses ? Number(maxUses) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });
    res.status(201).json({ coupon });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "A coupon with this code already exists." });
    }
    console.error("createCoupon error:", err);
    res.status(500).json({ error: "Could not create coupon." });
  }
}

// PATCH /api/coupons/:id (ADMIN) - toggle active, edit
async function updateCoupon(req, res) {
  const { isActive, discountValue, minOrderAmount, maxUses, expiresAt } = req.body;
  const coupon = await prisma.coupon.update({
    where: { id: req.params.id },
    data: {
      ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      ...(discountValue !== undefined && { discountValue: Number(discountValue) }),
      ...(minOrderAmount !== undefined && { minOrderAmount: Number(minOrderAmount) }),
      ...(maxUses !== undefined && { maxUses: maxUses === null ? null : Number(maxUses) }),
      ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
    },
  });
  res.json({ coupon });
}

// DELETE /api/coupons/:id (ADMIN)
async function deleteCoupon(req, res) {
  await prisma.coupon.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}

// POST /api/coupons/validate (CUSTOMER) - preview a discount before placing the order
// body: { code, subtotal }
async function validateCoupon(req, res) {
  const { code, subtotal } = req.body;
  if (!code || subtotal === undefined) {
    return res.status(400).json({ error: "code and subtotal are required." });
  }

  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase().trim() } });
  if (!coupon) return res.status(404).json({ error: "Coupon code not found." });
  if (!coupon.isActive) return res.status(400).json({ error: "This coupon is no longer active." });
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return res.status(400).json({ error: "This coupon has expired." });
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return res.status(400).json({ error: "This coupon has reached its usage limit." });
  }
  if (Number(subtotal) < coupon.minOrderAmount) {
    return res.status(400).json({ error: `This coupon requires a minimum order of ₹${coupon.minOrderAmount}.` });
  }

  const discountAmount = coupon.discountType === "PERCENT"
    ? Number(subtotal) * (coupon.discountValue / 100)
    : coupon.discountValue;

  res.json({ valid: true, discountAmount: Math.min(discountAmount, Number(subtotal)), coupon });
}

module.exports = { listCoupons, createCoupon, updateCoupon, deleteCoupon, validateCoupon };
