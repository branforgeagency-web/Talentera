const multer = require("multer");
const path = require("path");
const fs = require("fs");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/**
 * Replaces Firebase Cloud Storage (bucket talentera-d0f3f.firebasestorage.app).
 * Files are stored locally under /uploads and served statically by server.js.
 * In production, swap this storage engine for an S3/GCS multer-storage
 * adapter without touching route logic.
 */
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const candidateDir = path.join(UPLOAD_DIR, req.candidateId || "anon");
    if (!fs.existsSync(candidateDir)) fs.mkdirSync(candidateDir, { recursive: true });
    cb(null, candidateDir);
  },
  filename: (_req, file, cb) => {
    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: Number(process.env.MAX_UPLOAD_SIZE) || 10 * 1024 * 1024 },
});

module.exports = upload;
