const express = require("express");
const router = express.Router();
const r = require("../controllers/rider.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.post("/register", r.register);
const rider = [requireAuth, requireRole("DELIVERY_PARTNER")];
router.get("/me", ...rider, r.me);
router.patch("/me", ...rider, r.updateMe);
router.post("/online", ...rider, r.setOnline);
router.post("/location", ...rider, r.location);
router.get("/orders", ...rider, r.orders);
router.post("/orders/:id/accept", ...rider, r.accept);
router.post("/orders/:id/reject", ...rider, r.reject);
router.post("/orders/:id/pickup", ...rider, r.pickup);
router.post("/orders/:id/deliver", ...rider, r.deliver);
router.get("/earnings", ...rider, r.earnings);

module.exports = router;
