const multer = require("multer");
const path = require("path");

const USE_CLOUDINARY = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
);

if (!USE_CLOUDINARY) {
  console.warn(
    "[uploads] CLOUDINARY_* env vars not set - uploads are stored in the database instead " +
    "(images up to 12MB; videos need Cloudinary or a pasted link). Set Cloudinary credentials " +
    "for faster image delivery - see PRODUCTION_READY_GUIDE.md section 1."
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

const limits = { fileSize: 25 * 1024 * 1024 }; // 25MB - enough for a short banner video

// Files are always held in memory first. uploads.routes.js then sends them to Cloudinary
// (when configured) or saves them in the database, so nothing depends on the server's disk -
// Railway wipes that disk on every deploy, which is why older uploads used to disappear.
const upload = multer({ storage: multer.memoryStorage(), fileFilter, limits });

module.exports = { upload, UPLOAD_DIR: null, USE_CLOUDINARY };
