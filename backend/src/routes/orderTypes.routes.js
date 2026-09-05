const express = require("express");
const router = express.Router();
const orderTypes = require("../controllers/orderTypes.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.get("/", orderTypes.listActiveOrderTypes); // public
router.get("/all", requireAuth, requireRole("ADMIN"), orderTypes.listAllOrderTypes);
router.post("/", requireAuth, requireRole("ADMIN"), orderTypes.createOrderType);
router.patch("/:id", requireAuth, requireRole("ADMIN"), orderTypes.updateOrderType);
router.delete("/:id", requireAuth, requireRole("ADMIN"), orderTypes.deleteOrderType);

module.exports = router;
