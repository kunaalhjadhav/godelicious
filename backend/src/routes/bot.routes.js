const express = require("express");
const router = express.Router();
const bot = require("../controllers/bot.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

// Meta calls these two (no login); every message is checked against META_APP_SECRET.
router.get("/webhook", bot.verifyWebhook);
router.post("/webhook", bot.receiveWebhook);

// Admin inbox
router.use(requireAuth, requireRole("ADMIN"));
router.get("/status", bot.status);
router.patch("/enabled", bot.setEnabled);
router.get("/conversations", bot.listConversations);
router.get("/conversations/:id", bot.getConversation);
router.post("/conversations/:id/reply", bot.humanReply);
router.patch("/conversations/:id", bot.setStatus);

module.exports = router;
