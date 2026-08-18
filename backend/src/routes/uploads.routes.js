const express = require("express");
const router = express.Router();
const { upload } = require("../config/upload");
const { requireAuth, requireRole } = require("../middleware/auth");

// POST /api/uploads (ADMIN) - multipart/form-data, field name "image"
// Returns { url: "/uploads/<filename>" } — combine with the backend's base URL
// on the client side to get a full, usable image URL.
router.post("/", requireAuth, requireRole("ADMIN"), upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image file provided (field name must be 'image')." });
  }
  res.status(201).json({ url: `/uploads/${req.file.filename}` });
});

// Multer errors (file too large, wrong type) land here via Express's error handling
router.use((err, req, res, next) => {
  res.status(400).json({ error: err.message || "Upload failed." });
});

module.exports = router;
