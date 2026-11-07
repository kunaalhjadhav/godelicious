const prisma = require("../config/db");
const { codConfig } = require("../utils/codRules");

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
    return res.json({ settings: { ...publicSettings, codRules: codConfig() } });
  }
  res.json({ settings: { ...settings, codRules: codConfig() } });
}

// PATCH /api/settings (ADMIN)
async function updateSettings(req, res) {
  const {
    minOrderAmount, codEnabled, staffPricePerPerson, adminWhatsapp, whatsappAlerts, customerWhatsappAlerts,
    deliveryFee, freeDeliveryAbove, subscriptionDiscountPct, referralBonusPoints,
    gstPercent, couponMinOrder, mealBoxMinQty, serviceAreaOn, serviceLat, serviceLng, serviceRadiusKm,
  } = req.body;
  const settings = await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: {
      ...(minOrderAmount !== undefined && { minOrderAmount: Number(minOrderAmount) }),
      ...(codEnabled !== undefined && { codEnabled: Boolean(codEnabled) }),
      ...(staffPricePerPerson !== undefined && { staffPricePerPerson: Number(staffPricePerPerson) }),
      ...(adminWhatsapp !== undefined && { adminWhatsapp: String(adminWhatsapp).replace(/[^\d]/g, "") || null }),
      ...(whatsappAlerts !== undefined && { whatsappAlerts: Boolean(whatsappAlerts) }),
      ...(customerWhatsappAlerts !== undefined && { customerWhatsappAlerts: Boolean(customerWhatsappAlerts) }),
      ...(deliveryFee !== undefined && { deliveryFee: Math.max(0, Number(deliveryFee) || 0) }),
      ...(freeDeliveryAbove !== undefined && { freeDeliveryAbove: Math.max(0, Number(freeDeliveryAbove) || 0) }),
      ...(subscriptionDiscountPct !== undefined && { subscriptionDiscountPct: Math.min(50, Math.max(0, Number(subscriptionDiscountPct) || 0)) }),
      ...(referralBonusPoints !== undefined && { referralBonusPoints: Math.max(0, Math.floor(Number(referralBonusPoints) || 0)) }),
      ...(gstPercent !== undefined && { gstPercent: Math.min(28, Math.max(0, Number(gstPercent) || 0)) }),
      ...(couponMinOrder !== undefined && { couponMinOrder: Math.max(0, Number(couponMinOrder) || 0) }),
      ...(mealBoxMinQty !== undefined && { mealBoxMinQty: Math.max(1, Math.floor(Number(mealBoxMinQty) || 1)) }),
      ...(serviceAreaOn !== undefined && { serviceAreaOn: Boolean(serviceAreaOn) }),
      ...(Number.isFinite(Number(serviceLat)) && serviceLat !== undefined && serviceLat !== "" && { serviceLat: Number(serviceLat) }),
      ...(Number.isFinite(Number(serviceLng)) && serviceLng !== undefined && serviceLng !== "" && { serviceLng: Number(serviceLng) }),
      ...(serviceRadiusKm !== undefined && { serviceRadiusKm: Math.max(1, Number(serviceRadiusKm) || 20) }),
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

// POST /api/settings/test-whatsapp (ADMIN) - sends a test alert to the company WhatsApp number
// and reports exactly why it failed, so the setup can be checked from the dashboard.
async function testWhatsapp(req, res) {
  const { sendWhatsApp, isConfigured } = require("../services/whatsapp.service");
  const s = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  const phone = s?.adminWhatsapp || process.env.ADMIN_WHATSAPP;
  if (!isConfigured()) {
    return res.json({ sent: false, reason: "WhatsApp isn't connected yet. Add WHATSAPP_TOKEN and WHATSAPP_PHONE_ID on Render (backend)." });
  }
  if (!phone) return res.json({ sent: false, reason: "No company WhatsApp number saved. Enter it above and save first." });
  if (s && s.whatsappAlerts === false) return res.json({ sent: false, reason: "WhatsApp alerts are switched off above." });
  const r = await sendWhatsApp(phone, `TEST ALERT from Godelicious admin\nNew orders and order updates will arrive on this number.`);
  if (!r.sent && /24|re-engage|outside|window|131047/i.test(r.reason || "")) {
    r.reason += " - Tip: set WHATSAPP_TEMPLATE_NAME on Render to an approved template, or send any message from this number to your business WhatsApp first.";
  }
  res.json({ ...r, to: phone, usingTemplate: Boolean(process.env.WHATSAPP_TEMPLATE_NAME) });
}

module.exports = { getSettings, updateSettings, serviceCheck, testWhatsapp };

// POST /api/settings/service-check  { latitude, longitude }  (public) - can we deliver here?
async function serviceCheck(req, res) {
  const settings = await prisma.appSettings.upsert({ where: { id: "singleton" }, update: {}, create: { id: "singleton" } });
  const { checkServiceArea } = require("../utils/serviceArea");
  const r = checkServiceArea(settings, req.body?.latitude, req.body?.longitude);
  res.json({ ok: r.ok, distanceKm: r.distanceKm, message: r.message || null });
}
