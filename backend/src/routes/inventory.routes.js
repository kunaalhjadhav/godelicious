const express = require("express");
const router = express.Router();
const inventory = require("../controllers/inventory.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.use(requireAuth, requireRole("ADMIN", "STAFF"));

router.get("/", inventory.listInventory);
router.get("/:menuItemId/logs", inventory.itemLogs);
router.patch("/:menuItemId", inventory.adjustStock);

module.exports = router;
