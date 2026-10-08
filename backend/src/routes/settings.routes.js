const express = require("express");
const router = express.Router();
const settings = require("../controllers/settings.controller");
const { requireAuth, requireRole, optionalAuth } = require("../middleware/auth");

router.get("/", optionalAuth, settings.getSettings);
router.patch("/", requireAuth, requireRole("ADMIN"), settings.updateSettings);

module.exports = router;
