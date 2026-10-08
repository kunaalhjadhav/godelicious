const express = require("express");
const router = express.Router();
const fav = require("../controllers/favorites.controller");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth);
router.get("/", fav.list);
router.get("/ids", fav.ids);
router.post("/", fav.add);
router.patch("/:menuItemId/notify", fav.setNotify);
router.delete("/:menuItemId", fav.remove);

module.exports = router;
