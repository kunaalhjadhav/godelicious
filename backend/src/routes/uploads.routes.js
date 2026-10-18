const express = require("express");
const path = require("path");
const router = express.Router();
const prisma = require("../config/db");
const { upload, USE_CLOUDINARY } = require("../config/upload");
const { requireAuth, requireRole } = require("../middleware/auth");

const DB_LIMIT = 12 * 1024 * 1024; // largest file we keep in the database (Cloudinary has no such limit)
const MIME = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif",
  ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm",
};

// The public address of this server, used to give uploaded files a full https:// link that
// works the same in the app, the website and the admin dashboard.
function publicBase(req) {
  if (process.env.PUBLIC_API_URL) return process.env.PUBLIC_API_URL.replace(/\/+$/, "");
  const proto = (req.headers["x-forwarded-proto"] || req.protocol || "https").split(",")[0].trim();
  return `${proto}://${req.get("host")}`;
}

// GET /api/uploads/file/:id (public) - serves a file that was saved in the database
router.get("/file/:id", async (req, res) => {
  try {
    const file = await prisma.uploadedFile.findUnique({ where: { id: req.params.id } });
    if (!file) return res.status(404).json({ error: "File not found." });
    const data = Buffer.from(file.data);
    res.set("Content-Type", file.mimeType);
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    res.set("Accept-Ranges", "bytes");

    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
    if (range) {
      const start = range[1] ? parseInt(range[1], 10) : 0;
      const end = range[2] ? Math.min(parseInt(range[2], 10), data.length - 1) : data.length - 1;
      if (start <= end && start < data.length) {
        res.status(206);
        res.set("Content-Range", `bytes ${start}-${end}/${data.length}`);
        res.set("Content-Length", String(end - start + 1));
        return res.end(data.subarray(start, end + 1));
      }
    }
    res.set("Content-Length", String(data.length));
    res.end(data);
  } catch (err) {
    res.status(404).json({ error: "File not found." });
  }
});

// POST /api/uploads (ADMIN or BRAND_PARTNER) - multipart/form-data, field name "image"
// Returns { url }: a permanent https:// link (Cloudinary when configured, otherwise this server).
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

    // No Cloudinary: keep the file in the database so it survives redeploys
    if (req.file.size > DB_LIMIT) {
      return res.status(400).json({
        error: "This file is too large to store without Cloudinary (limit 12MB). Use a smaller image, or set up Cloudinary / paste a video link.",
      });
    }
    try {
      const ext = path.extname(req.file.originalname || "").toLowerCase();
      const mimeType = MIME[ext] || req.file.mimetype || "application/octet-stream";
      const saved = await prisma.uploadedFile.create({
        data: { mimeType, size: req.file.size, data: req.file.buffer },
        select: { id: true },
      });
      res.status(201).json({ url: `${publicBase(req)}/api/uploads/file/${saved.id}` });
    } catch (err) {
      console.error("Upload save error:", err);
      res.status(500).json({ error: "Could not save the file. Please try again." });
    }
  }
);

// Multer errors (file too large, wrong type) land here via Express's error handling
router.use((err, req, res, next) => {
  res.status(400).json({ error: err.message || "Upload failed." });
});

module.exports = router;
