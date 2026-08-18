const express = require("express");
const router = express.Router();
const payments = require("../controllers/payments.controller");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth);
router.post("/razorpay/create-order", payments.createRazorpayOrder);
router.post("/razorpay/verify", payments.verifyRazorpayPayment);

module.exports = router;
