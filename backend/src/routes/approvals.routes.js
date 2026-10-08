const express = require("express");
const router = express.Router();
const approvals = require("../controllers/approvals.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.use(requireAuth, requireRole("ADMIN", "STAFF"));
router.get("/", approvals.listApprovals);
router.patch("/:id", approvals.decide);

module.exports = router;
