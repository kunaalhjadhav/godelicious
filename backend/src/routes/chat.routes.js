const express = require("express");
const router = express.Router();
const chat = require("../controllers/chat.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.use(requireAuth);

// Customer's own thread
router.get("/my", chat.myMessages);
router.post("/my", chat.sendMyMessage);

// Admin/staff view of all threads
router.get("/threads", requireRole("ADMIN", "STAFF"), chat.listThreads);
router.get("/threads/:customerId", requireRole("ADMIN", "STAFF"), chat.getThread);
router.post("/threads/:customerId", requireRole("ADMIN", "STAFF"), chat.replyToThread);

module.exports = router;
