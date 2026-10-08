const express = require("express");
const router = express.Router();
const subs = require("../controllers/subscriptions.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.get("/plans", subs.plans); // public

router.use(requireAuth);

// Admin (declared before "/:id" routes)
router.get("/admin/all", requireRole("ADMIN", "STAFF"), subs.adminAll);
router.post("/admin/run", requireRole("ADMIN"), subs.adminRun);
router.patch("/admin/:id", requireRole("ADMIN"), subs.adminSetStatus);

router.get("/my", subs.mine);
router.post("/", requireRole("CUSTOMER"), subs.create);
router.patch("/:id", subs.update);
router.post("/:id/skip", subs.skip);
router.delete("/:id/skip/:date", subs.unskip);

module.exports = router;
