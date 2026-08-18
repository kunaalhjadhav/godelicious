const express = require("express");
const router = express.Router();
const venue = require("../controllers/venue.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.use(requireAuth);

router.post("/", venue.createEnquiry);
router.get("/my", venue.myEnquiries);
router.get("/", requireRole("ADMIN"), venue.listEnquiries);
router.patch("/:id", requireRole("ADMIN"), venue.reviewEnquiry);

module.exports = router;
