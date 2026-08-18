const express = require("express");
const router = express.Router();
const reviews = require("../controllers/reviews.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.get("/summary", reviews.reviewSummary);
router.post("/", requireAuth, reviews.createReview);
router.get("/", requireAuth, requireRole("ADMIN"), reviews.listReviews);

module.exports = router;
