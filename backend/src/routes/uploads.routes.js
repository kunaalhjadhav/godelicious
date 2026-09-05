const express = require("express");
const router = express.Router();
const { upload, USE_CLOUDINARY } = require("../config/upload");
const { requireAuth, requireRole } = require("../middleware/auth");

// POST /api/uploads (ADMIN or BRAND_PARTNER) - multipart/form-data, field name "image"
// Returns { url }. In production (Cloudinary configured) this is a permanent
// https:// URL. In local dev without Cloudinary set up, it's a relative
// "/uploads/<filename>" path served from local disk — see PRODUCTION_READY_GUIDE.md.
router.post(
  "/",
  requireAuth,
  requireRole("ADMIN", "BRAND_PARTNER"),
  upload.single("image"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided (field name must be 'image')." });
    }

    if (USE_CLOUDINARY) {
      try {
        const cloudinary = require("../config/cloudinary");
        const isVideo = req.file.mimetype.startsWith("video/");
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: "godelicious", resource_type: isVideo ? "video" : "image" },
            (err, res) => (err ? reject(err) : resolve(res))
          );
          uploadStream.end(req.file.buffer);
        });
        return res.status(201).json({ url: result.secure_url });
      } catch (err) {
        console.error("Cloudinary upload error:", err);
        return res.status(500).json({ error: "Image upload failed. Please try again." });
      }
    }

    // Local disk fallback
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  }
);

// Multer errors (file too large, wrong type) land here via Express's error handling
router.use((err, req, res, next) => {
  res.status(400).json({ error: err.message || "Upload failed." });
});

module.exports = router;
