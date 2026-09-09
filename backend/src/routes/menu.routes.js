const express = require("express");
const router = express.Router();
const menu = require("../controllers/menu.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

// Public - anyone (including the customer app, no auth) can browse the menu
router.get("/categories", menu.listCategories);
router.get("/", menu.listMenuItems);
router.get("/:id", menu.getMenuItem);

// Admin-only management
router.post("/categories", requireAuth, requireRole("ADMIN"), menu.createCategory);
router.patch("/categories/:id", requireAuth, requireRole("ADMIN"), menu.updateCategory);
router.delete("/categories/:id", requireAuth, requireRole("ADMIN"), menu.deleteCategory);

router.post("/", requireAuth, requireRole("ADMIN"), menu.createMenuItem);
router.put("/:id", requireAuth, requireRole("ADMIN"), menu.updateMenuItem);
router.delete("/:id", requireAuth, requireRole("ADMIN"), menu.deleteMenuItem);

router.post("/:id/combo-groups", requireAuth, requireRole("ADMIN"), menu.addComboGroup);
router.delete("/combo-groups/:groupId", requireAuth, requireRole("ADMIN"), menu.deleteComboGroup);
router.post("/bulk", requireAuth, requireRole("ADMIN"), menu.bulkCreateMenuItems);

module.exports = router;
