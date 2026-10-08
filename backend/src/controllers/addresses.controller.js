const prisma = require("../config/db");

// GET /api/addresses
async function list(req, res) {
  const addresses = await prisma.savedAddress.findMany({
    where: { userId: req.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  res.json({ addresses });
}

function clean(body) {
  const out = {};
  if (body.label !== undefined) out.label = String(body.label).trim().slice(0, 30) || "Home";
  if (body.address !== undefined) out.address = String(body.address).trim();
  if (body.phone !== undefined) out.phone = body.phone ? String(body.phone).trim() : null;
  if (body.latitude !== undefined) out.latitude = body.latitude === null ? null : Number(body.latitude);
  if (body.longitude !== undefined) out.longitude = body.longitude === null ? null : Number(body.longitude);
  return out;
}

// POST /api/addresses { label, address, phone?, latitude?, longitude?, isDefault? }
async function create(req, res) {
  const data = clean(req.body);
  if (!data.address) return res.status(400).json({ error: "address is required." });
  const count = await prisma.savedAddress.count({ where: { userId: req.user.id } });
  if (count >= 10) return res.status(400).json({ error: "You can save up to 10 addresses." });
  const makeDefault = Boolean(req.body.isDefault) || count === 0;
  const address = await prisma.$transaction(async (tx) => {
    if (makeDefault) await tx.savedAddress.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } });
    return tx.savedAddress.create({ data: { label: "Home", ...data, userId: req.user.id, isDefault: makeDefault } });
  });
  res.status(201).json({ address });
}

// PATCH /api/addresses/:id
async function update(req, res) {
  const existing = await prisma.savedAddress.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!existing) return res.status(404).json({ error: "Address not found." });
  const data = clean(req.body);
  if (data.address === "") return res.status(400).json({ error: "address cannot be empty." });
  const address = await prisma.$transaction(async (tx) => {
    if (req.body.isDefault === true) await tx.savedAddress.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } });
    return tx.savedAddress.update({
      where: { id: existing.id },
      data: { ...data, ...(req.body.isDefault === true && { isDefault: true }) },
    });
  });
  res.json({ address });
}

// DELETE /api/addresses/:id
async function remove(req, res) {
  const existing = await prisma.savedAddress.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!existing) return res.status(404).json({ error: "Address not found." });
  await prisma.savedAddress.delete({ where: { id: existing.id } });
  if (existing.isDefault) {
    const next = await prisma.savedAddress.findFirst({ where: { userId: req.user.id }, orderBy: { createdAt: "asc" } });
    if (next) await prisma.savedAddress.update({ where: { id: next.id }, data: { isDefault: true } });
  }
  res.json({ success: true });
}

module.exports = { list, create, update, remove };
