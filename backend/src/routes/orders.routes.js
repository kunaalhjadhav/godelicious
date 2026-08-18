const express = require("express");
const router = express.Router();
const orders = require("../controllers/orders.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.use(requireAuth); // every order route requires login

router.post("/", orders.createOrder);
router.get("/my", orders.myOrders);
router.get("/", requireRole("ADMIN", "STAFF"), orders.listOrders);
router.get("/:id", orders.getOrder);
router.patch("/:id/status", requireRole("ADMIN", "STAFF"), orders.updateOrderStatus);
router.patch("/:id/confirm-cod", requireRole("ADMIN", "STAFF"), orders.confirmCod);

module.exports = router;
