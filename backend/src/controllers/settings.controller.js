const prisma = require("../config/db");

// GET /api/settings (public — checkout needs to read min order / COD availability)
async function getSettings(req, res) {
  const settings = await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
  // The alert number is private - only admins/staff get to see it
  if (!(req.user && ["ADMIN", "STAFF"].includes(req.user.role))) {
    const { adminWhatsapp, ...publicSettings } = settings;
    return res.json({ settings: publicSettings });
  }
  res.json({ settings });
}

// PATCH /api/settings (ADMIN)
async function updateSettings(req, res) {
  const {
    minOrderAmount, codEnabled, staffPricePerPerson, adminWhatsapp, whatsappAlerts,
    deliveryFee, freeDeliveryAbove, subscriptionDiscountPct, referralBonusPoints,
  } = req.body;
  const settings = await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: {
      ...(minOrderAmount !== undefined && { minOrderAmount: Number(minOrderAmount) }),
      ...(codEnabled !== undefined && { codEnabled: Boolean(codEnabled) }),
      ...(staffPricePerPerson !== undefined && { staffPricePerPerson: Number(staffPricePerPerson) }),
      ...(adminWhatsapp !== undefined && { adminWhatsapp: String(adminWhatsapp).replace(/[^\d]/g, "") || null }),
      ...(whatsappAlerts !== undefined && { whatsappAlerts: Boolean(whatsappAlerts) }),
      ...(deliveryFee !== undefined && { deliveryFee: Math.max(0, Number(deliveryFee) || 0) }),
      ...(freeDeliveryAbove !== undefined && { freeDeliveryAbove: Math.max(0, Number(freeDeliveryAbove) || 0) }),
      ...(subscriptionDiscountPct !== undefined && { subscriptionDiscountPct: Math.min(50, Math.max(0, Number(subscriptionDiscountPct) || 0)) }),
      ...(referralBonusPoints !== undefined && { referralBonusPoints: Math.max(0, Math.floor(Number(referralBonusPoints) || 0)) }),
    },
    create: {
      id: "singleton",
      minOrderAmount: minOrderAmount !== undefined ? Number(minOrderAmount) : 0,
      codEnabled: codEnabled !== undefined ? Boolean(codEnabled) : true,
      staffPricePerPerson: staffPricePerPerson !== undefined ? Number(staffPricePerPerson) : 0,
    },
  });
  res.json({ settings });
}

module.exports = { getSettings, updateSettings };
