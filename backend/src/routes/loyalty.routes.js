const express = require("express");
const router = express.Router();
const loyalty = require("../controllers/loyalty.controller");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth);
router.get("/me", loyalty.me);
router.post("/apply-referral", loyalty.applyReferral);

module.exports = router;
