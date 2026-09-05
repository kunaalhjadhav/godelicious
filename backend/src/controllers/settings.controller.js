const prisma = require("../config/db");

// GET /api/settings (public — checkout needs to read min order / COD availability)
async function getSettings(req, res) {
  const settings = await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
  res.json({ settings });
}

// PATCH /api/settings (ADMIN)
async function updateSettings(req, res) {
  const { minOrderAmount, codEnabled, staffPricePerPerson } = req.body;
  const settings = await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: {
      ...(minOrderAmount !== undefined && { minOrderAmount: Number(minOrderAmount) }),
      ...(codEnabled !== undefined && { codEnabled: Boolean(codEnabled) }),
      ...(staffPricePerPerson !== undefined && { staffPricePerPerson: Number(staffPricePerPerson) }),
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
