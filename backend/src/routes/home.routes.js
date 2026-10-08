const express = require("express");
const router = express.Router();
const home = require("../controllers/home.controller");
const { optionalAuth } = require("../middleware/auth");

router.get("/", optionalAuth, home.homeFeed);

module.exports = router;
