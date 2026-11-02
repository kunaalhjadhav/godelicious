const express = require("express");
const router = express.Router();
const wa = require("../controllers/waAuth.controller");

router.get("/status", wa.status);
router.post("/request", wa.request);
router.post("/verify", wa.verify);

module.exports = router;
