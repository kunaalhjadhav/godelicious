const express = require("express");
const router = express.Router();
const brands = require("../controllers/brands.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.get("/public", brands.listActiveBrands);

router.use(requireAuth, requireRole("ADMIN"));
router.get("/", brands.listBrands);
router.post("/", brands.createBrand);
router.patch("/:id", brands.updateBrand);
router.delete("/:id", brands.deleteBrand);
router.get("/:id/sales", brands.brandSales);
router.post("/:id/settlements", brands.createSettlement);
router.get("/:id/settlements", brands.listSettlements);
router.patch("/settlements/:settlementId", brands.markSettlementPaid);

module.exports = router;
