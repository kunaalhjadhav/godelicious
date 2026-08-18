const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Local disk storage for the MVP — files land in backend/uploads/ and are served
// statically at /uploads/<filename> (see index.js). This is fine for local dev and
// small deployments, but Railway/Render's filesystem is EPHEMERAL: uploaded files
// are wiped on every redeploy. For real production, swap this for a cloud storage
// SDK (Cloudinary, S3, Supabase Storage) — only this file and the upload route need
// to change; the rest of the app just consumes whatever URL comes back.
const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

function fileFilter(req, file, cb) {
  const allowed = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".mov", ".webm"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowed.includes(ext)) {
    return cb(new Error("Only image (jpg, png, webp, gif) or video (mp4, mov, webm) files are allowed."));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB — enough for a short banner video
});

module.exports = { upload, UPLOAD_DIR };
