const multer = require("multer");
const path = require("path");
const fs = require("fs");

const USE_CLOUDINARY = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
);

if (!USE_CLOUDINARY) {
  console.warn(
    "[uploads] CLOUDINARY_* env vars not set — falling back to local disk storage. " +
    "This is fine for local development, but files WILL BE LOST on every deploy to " +
    "Railway/Render (ephemeral filesystem). Set Cloudinary credentials before going live — " +
    "see PRODUCTION_READY_GUIDE.md section 1."
  );
}

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".mov", ".webm"];

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error("Only image (jpg, png, webp, gif) or video (mp4, mov, webm) files are allowed."));
  }
  cb(null, true);
}

const limits = { fileSize: 25 * 1024 * 1024 }; // 25MB — enough for a short banner video

let upload;
let UPLOAD_DIR = null;

if (USE_CLOUDINARY) {
  // Buffer the file in memory; uploads.routes.js streams req.file.buffer to
  // Cloudinary and returns its permanent URL. Nothing touches local disk.
  upload = multer({ storage: multer.memoryStorage(), fileFilter, limits });
} else {
  // Local dev fallback — identical to the original MVP behavior.
  UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, unique);
    },
  });
  upload = multer({ storage, fileFilter, limits });
}

module.exports = { upload, UPLOAD_DIR, USE_CLOUDINARY };
