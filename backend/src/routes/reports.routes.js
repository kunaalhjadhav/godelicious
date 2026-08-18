const express = require("express");
const router = express.Router();
const reports = require("../controllers/reports.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.use(requireAuth, requireRole("ADMIN"));
router.get("/sales", reports.salesReport);
router.get("/sales/export", reports.exportSalesCsv);

module.exports = router;
