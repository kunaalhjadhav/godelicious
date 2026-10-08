const express = require("express");
const router = express.Router();
const a = require("../controllers/addresses.controller");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth);
router.get("/", a.list);
router.post("/", a.create);
router.patch("/:id", a.update);
router.delete("/:id", a.remove);

module.exports = router;
