const express = require("express");
const router = express.Router();
const coupons = require("../controllers/coupons.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.post("/validate", requireAuth, coupons.validateCoupon);

router.use(requireAuth, requireRole("ADMIN"));
router.get("/", coupons.listCoupons);
router.post("/", coupons.createCoupon);
router.patch("/:id", coupons.updateCoupon);
router.delete("/:id", coupons.deleteCoupon);

module.exports = router;
