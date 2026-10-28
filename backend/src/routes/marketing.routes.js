const express = require("express");
const router = express.Router();
const marketing = require("../controllers/marketing.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.use(requireAuth, requireRole("ADMIN"));
router.get("/drafts", marketing.listDrafts);
router.post("/generate", marketing.generate);
router.patch("/drafts/:id", marketing.updateDraft);
router.delete("/drafts/:id", marketing.deleteDraft);
router.get("/sources", marketing.sources);
router.post("/summary", marketing.summary);

module.exports = router;
