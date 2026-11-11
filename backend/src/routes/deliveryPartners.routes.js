const express = require("express");
const router = express.Router();
const partners = require("../controllers/deliveryPartners.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.get("/", requireAuth, requireRole("ADMIN", "STAFF"), partners.listActivePartners);
router.get("/all", requireAuth, requireRole("ADMIN"), partners.listAllPartners);
router.get("/live", requireAuth, requireRole("ADMIN", "STAFF"), partners.live);
router.post("/", requireAuth, requireRole("ADMIN"), partners.createPartner);
router.post("/assign/:orderId", requireAuth, requireRole("ADMIN", "STAFF"), partners.assign);
router.post("/unassign/:orderId", requireAuth, requireRole("ADMIN", "STAFF"), partners.unassign);
router.patch("/:id", requireAuth, requireRole("ADMIN"), partners.updatePartner);
router.delete("/:id", requireAuth, requireRole("ADMIN"), partners.deletePartner);

module.exports = router;
