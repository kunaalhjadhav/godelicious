const express = require("express");
const router = express.Router();
const planner = require("../controllers/planner.controller");

router.post("/suggest", planner.suggest); // public - works before login too

module.exports = router;
