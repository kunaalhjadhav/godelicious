const express = require("express");
const router = express.Router();
const addons = require("../controllers/addons.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.get("/", addons.listActiveAddons); // public
router.get("/all", requireAuth, requireRole("ADMIN"), addons.listAllAddons);
router.post("/", requireAuth, requireRole("ADMIN"), addons.createAddon);
router.patch("/:id", requireAuth, requireRole("ADMIN"), addons.updateAddon);
router.delete("/:id", requireAuth, requireRole("ADMIN"), addons.deleteAddon);

module.exports = router;
