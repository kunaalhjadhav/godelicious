const express = require("express");
const router = express.Router();
const { register, login, me, deleteMe } = require("../controllers/auth.controller");
const { requestOtp, verifyOtp } = require("../controllers/otp.controller");
const { requireAuth } = require("../middleware/auth");

router.post("/register", register);
router.post("/login", login);
router.get("/me", requireAuth, me);
router.delete("/me", requireAuth, deleteMe);

router.post("/otp/request", requestOtp);
router.post("/otp/verify", verifyOtp);

module.exports = router;
