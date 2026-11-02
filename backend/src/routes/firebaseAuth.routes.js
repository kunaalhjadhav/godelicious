const express = require("express");
const router = express.Router();
const fb = require("../controllers/firebaseAuth.controller");

router.get("/status", fb.status);
router.post("/", fb.login);
router.post("/handoff", fb.handoffPut);
router.get("/handoff/:sid", fb.handoffGet);

module.exports = router;
