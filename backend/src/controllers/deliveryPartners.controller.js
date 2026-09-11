const prisma = require("../config/db");

// GET /api/delivery-partners (ADMIN/STAFF) - active only, for the forward-order dropdown
async function listActivePartners(req, res) {
  const partners = await prisma.deliveryPartner.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  res.json({ partners });
}

// GET /api/delivery-partners/all (ADMIN)
async function listAllPartners(req, res) {
  const partners = await prisma.deliveryPartner.findMany({ orderBy: { name: "asc" } });
  res.json({ partners });
}

// POST /api/delivery-partners (ADMIN)
async function createPartner(req, res) {
  const { name, phone } = req.body;
  if (!name || !phone) return res.status(400).json({ error: "name and phone are required." });

  const partner = await prisma.deliveryPartner.create({ data: { name, phone } });
  res.status(201).json({ partner });
}

// PATCH /api/delivery-partners/:id (ADMIN)
async function updatePartner(req, res) {
  const { name, phone, isActive } = req.body;
  const partner = await prisma.deliveryPartner.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(phone !== undefined && { phone }),
      ...(isActive !== undefined && { isActive: Boolean(isActive) }),
    },
  });
  res.json({ partner });
}

// DELETE /api/delivery-partners/:id (ADMIN)
async function deletePartner(req, res) {
  await prisma.deliveryPartner.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}

module.exports = { listActivePartners, listAllPartners, createPartner, updatePartner, deletePartner };
