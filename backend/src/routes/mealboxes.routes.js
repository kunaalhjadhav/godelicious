const express = require("express");
const router = express.Router();
const boxes = require("../controllers/mealboxes.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.get("/", boxes.listPublic); // customers: the list of meal boxes
router.get("/admin/all", requireAuth, requireRole("ADMIN"), boxes.listAdmin);
router.post("/", requireAuth, requireRole("ADMIN"), boxes.create);
router.put("/:id", requireAuth, requireRole("ADMIN"), boxes.update);
router.delete("/:id", requireAuth, requireRole("ADMIN"), boxes.remove);

module.exports = router;
