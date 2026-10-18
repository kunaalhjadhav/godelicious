const prisma = require("../config/db");

// Banners saved with a relative "/uploads/..." path (older uploads) are turned into full links
function absolute(req, url) {
  if (!url || /^https?:\/\//i.test(url)) return url;
  const proto = (req.headers["x-forwarded-proto"] || req.protocol || "https").split(",")[0].trim();
  return `${process.env.PUBLIC_API_URL ? process.env.PUBLIC_API_URL.replace(/\/+$/, "") : `${proto}://${req.get("host")}`}${url.startsWith("/") ? "" : "/"}${url}`;
}

// GET /api/banners (public) - only active ones, in order
async function listActiveBanners(req, res) {
  const banners = await prisma.banner.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  res.json({ banners: banners.map((b) => ({ ...b, mediaUrl: absolute(req, b.mediaUrl) })) });
}

// GET /api/banners/all (ADMIN) - everything, including inactive
async function listAllBanners(req, res) {
  const banners = await prisma.banner.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
  res.json({ banners: banners.map((b) => ({ ...b, mediaUrl: absolute(req, b.mediaUrl) })) });
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
