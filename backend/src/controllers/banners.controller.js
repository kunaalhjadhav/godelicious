const prisma = require("../config/db");

// GET /api/banners (public) - only active ones, in order
async function listActiveBanners(req, res) {
  const banners = await prisma.banner.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  res.json({ banners });
}

// GET /api/banners/all (ADMIN) - everything, including inactive
async function listAllBanners(req, res) {
  const banners = await prisma.banner.findMany({ orderBy: { sortOrder: "asc" } });
  res.json({ banners });
}

// POST /api/banners (ADMIN)
async function createBanner(req, res) {
  const { mediaType, mediaUrl, title, linkUrl, sortOrder } = req.body;
  if (!mediaType || !mediaUrl) {
    return res.status(400).json({ error: "mediaType and mediaUrl are required." });
  }
  if (!["IMAGE", "VIDEO"].includes(mediaType)) {
    return res.status(400).json({ error: "mediaType must be IMAGE or VIDEO." });
  }

  const banner = await prisma.banner.create({
    data: { mediaType, mediaUrl, title, linkUrl, sortOrder: sortOrder ? Number(sortOrder) : 0 },
  });
  res.status(201).json({ banner });
}

// PATCH /api/banners/:id (ADMIN)
async function updateBanner(req, res) {
  const { mediaType, mediaUrl, title, linkUrl, sortOrder, isActive } = req.body;
  const banner = await prisma.banner.update({
    where: { id: req.params.id },
    data: {
      ...(mediaType !== undefined && { mediaType }),
      ...(mediaUrl !== undefined && { mediaUrl }),
      ...(title !== undefined && { title }),
      ...(linkUrl !== undefined && { linkUrl }),
      ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
      ...(isActive !== undefined && { isActive: Boolean(isActive) }),
    },
  });
  res.json({ banner });
}

// DELETE /api/banners/:id (ADMIN)
async function deleteBanner(req, res) {
  await prisma.banner.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}

module.exports = { listActiveBanners, listAllBanners, createBanner, updateBanner, deleteBanner };
