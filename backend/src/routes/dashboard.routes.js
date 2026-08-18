const express = require("express");
const router = express.Router();
const { stats } = require("../controllers/dashboard.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.get("/stats", requireAuth, requireRole("ADMIN", "STAFF"), stats);

module.exports = router;
