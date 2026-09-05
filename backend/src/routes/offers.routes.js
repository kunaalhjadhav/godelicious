const express = require("express");
const router = express.Router();
const offers = require("../controllers/offers.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.get("/", offers.listApprovedOffers); // public
router.get("/all", requireAuth, requireRole("ADMIN"), offers.listAllOffers);
router.patch("/:id", requireAuth, requireRole("ADMIN"), offers.reviewOffer);

module.exports = router;
