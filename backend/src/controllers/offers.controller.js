const prisma = require("../config/db");

// GET /api/offers (public) - approved offers only, optionally ?brandId=
async function listApprovedOffers(req, res) {
  const { brandId } = req.query;
  const offers = await prisma.offer.findMany({
    where: { status: "APPROVED", ...(brandId && { brandId }) },
    include: { brand: { select: { name: true, logoUrl: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ offers });
}

// GET /api/offers/all (ADMIN) - every offer, optionally ?status=
async function listAllOffers(req, res) {
  const { status } = req.query;
  const offers = await prisma.offer.findMany({
    where: status ? { status } : undefined,
    include: { brand: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ offers });
}

// PATCH /api/offers/:id (ADMIN) - approve or reject
async function reviewOffer(req, res) {
  const { status, adminNote } = req.body;
  if (!["APPROVED", "REJECTED"].includes(status)) {
    return res.status(400).json({ error: "status must be APPROVED or REJECTED." });
  }
  const offer = await prisma.offer.update({
    where: { id: req.params.id },
    data: { status, adminNote },
  });
  res.json({ offer });
}

module.exports = { listApprovedOffers, listAllOffers, reviewOffer };
