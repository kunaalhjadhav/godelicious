const express = require("express");
const router = express.Router();
const places = require("../controllers/places.controller");

// Public on purpose: used while the customer is typing an address (even before sign-in).
router.get("/autocomplete", places.autocomplete);
router.get("/details", places.details);
router.get("/reverse", places.reverse);

module.exports = router;
