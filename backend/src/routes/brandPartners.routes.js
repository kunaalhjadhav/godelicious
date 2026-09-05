const express = require("express");
const router = express.Router();
const bp = require("../controllers/brandPartners.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.post("/register", bp.register); // public

router.use(requireAuth, requireRole("BRAND_PARTNER"));

router.get("/me/dashboard", bp.dashboard);
router.get("/me/orders", bp.myOrders);

router.get("/me/menu", bp.listMyMenu);
router.post("/me/menu", bp.createMyMenuItem);
router.put("/me/menu/:id", bp.updateMyMenuItem);
router.delete("/me/menu/:id", bp.deleteMyMenuItem);

router.get("/me/locations", bp.listMyLocations);
router.post("/me/locations", bp.createMyLocation);
router.delete("/me/locations/:id", bp.deleteMyLocation);

router.get("/me/offers", bp.listMyOffers);
router.post("/me/offers", bp.createMyOffer);

router.get("/me/earnings", bp.myEarnings);

module.exports = router;
