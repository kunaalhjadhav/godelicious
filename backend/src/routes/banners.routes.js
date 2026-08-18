const express = require("express");
const router = express.Router();
const banners = require("../controllers/banners.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.get("/", banners.listActiveBanners); // public — home screen carousel
router.get("/all", requireAuth, requireRole("ADMIN"), banners.listAllBanners);
router.post("/", requireAuth, requireRole("ADMIN"), banners.createBanner);
router.patch("/:id", requireAuth, requireRole("ADMIN"), banners.updateBanner);
router.delete("/:id", requireAuth, requireRole("ADMIN"), banners.deleteBanner);

module.exports = router;
