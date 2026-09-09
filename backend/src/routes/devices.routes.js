const express = require("express");
const router = express.Router();
const devices = require("../controllers/devices.controller");
const { requireAuth } = require("../middleware/auth");

router.post("/register", requireAuth, devices.registerDevice);
router.delete("/register", requireAuth, devices.unregisterDevice);

module.exports = router;
