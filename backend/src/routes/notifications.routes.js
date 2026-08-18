const express = require("express");
const router = express.Router();
const notifications = require("../controllers/notifications.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.use(requireAuth);

router.get("/my", notifications.myNotifications);
router.post("/:id/read", notifications.markRead);

router.get("/", requireRole("ADMIN"), notifications.listNotifications);
router.post("/", requireRole("ADMIN"), notifications.createNotification);

module.exports = router;
