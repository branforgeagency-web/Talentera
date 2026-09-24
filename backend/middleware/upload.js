const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { isGcpConfigured, uploadBufferToGcp } = require("../config/gcpStorage");
const { isCloudinaryConfigured, uploadBufferToCloudinary } = require("../config/cloudinary");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Allowed MIME types per multer field name.
const ALLOWED_MIME_TYPES = {
  // Stage 5 interview / video-intro recordings
  video: [
    "video/webm",
    "video/mp4",
    "video/quicktime",
    "video/x-matroska",
    "video/x-msvideo",
    "audio/webm",
    "audio/mp4",
    "audio/mpeg",
    "audio/ogg",
    "audio/wav",
    "application/octet-stream",
    "text/plain",
  ],
  // Aadhaar e-KYC PDF or offline e-KYC .zip package
  ekycZip: [
    "application/pdf",
    "application/zip",
    "application/x-zip-compressed",
    "application/octet-stream",
  ],
  // Generic per-stage document upload (resumes, certificates, KYC docs, and - for Company
  // Onboarding Stage 5 - the custom interview-questions Excel/CSV upload)
  doc: [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/pjpeg",
    "image/png",
    "image/x-png",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/csv",
    "application/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/octet-stream",
  ],
  // Academy bulk student-roster upload, CSV
  file: [
    "text/csv",
    "application/vnd.ms-excel",
    "application/csv",
    "text/plain",
    "application/octet-stream",
  ],
};

function fileFilter(req, file, cb) {
  const allowed = ALLOWED_MIME_TYPES[file.fieldname];
  if (!allowed) {
    return cb(new Error(`Uploads are not accepted on field "${file.fieldname}".`));
  }

  // If uploading a video, normalize mimetype if browser sent text/plain or octet-stream for a dynamic Blob
  if (file.fieldname === "video") {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const validVideoExts = [".webm", ".mp4", ".mov", ".mkv", ".avi", ".ogg", ".wav"];
    if (validVideoExts.includes(ext) || file.mimetype === "text/plain" || file.mimetype === "application/octet-stream") {
      file.mimetype = ext === ".mp4" ? "video/mp4" : "video/webm";
      return cb(null, true);
    }
  }

  if (!allowed.includes(file.mimetype)) {
    return cb(new Error(`Unsupported file type "${file.mimetype}" for this upload. Allowed: ${allowed.join(", ")}`));
  }
  cb(null, true);
}

// Use memory storage so req.file.buffer is available for GCP, Cloudinary, or disk fallback
const memoryStorage = multer.memoryStorage();

function parseMaxUploadSize(val) {
  if (!val) return 100 * 1024 * 1024;
  if (typeof val === "string") {
    const clean = val.trim().toUpperCase();
    if (clean.endsWith("GB") || clean.endsWith("G")) {
      return Math.round(parseFloat(clean) * 1024 * 1024 * 1024);
    }
    if (clean.endsWith("MB") || clean.endsWith("M")) {
      return Math.round(parseFloat(clean) * 1024 * 1024);
    }
    if (clean.endsWith("KB") || clean.endsWith("K")) {
      return Math.round(parseFloat(clean) * 1024);
    }
  }
  const num = Number(val);
  if (isNaN(num) || num <= 0) return 100 * 1024 * 1024;
  // If provided as a small number like 20, 50, 100 assume user intended MB
  if (num < 1024) return num * 1024 * 1024;
  return num;
}

// Ensure video upload limit is at least 100 MB
const MAX_UPLOAD_BYTES = Math.max(parseMaxUploadSize(process.env.MAX_UPLOAD_SIZE), 100 * 1024 * 1024);

const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    fieldSize: 25 * 1024 * 1024,
  },
  fileFilter,
});

/**
 * Express middleware to process the uploaded file buffer.
 * Priority:
 *  1. Google Cloud Storage (GCP) if configured
 *  2. Cloudinary if configured
 *  3. Local disk storage fallback (/uploads/...)
 */
const handleUpload = (options = {}) => {
  return async (req, res, next) => {
    if (!req.file) return next();

    const userSubdir = String(req.candidateId || req.companyId || req.academyId || "anon");
    const folderName = options.folder || `talentera/${userSubdir}`;
    const resourceType = options.resourceType || "auto";

    const saveToDisk = () => {
      const targetDir = path.join(UPLOAD_DIR, userSubdir);
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

      const safeName = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
      const filePath = path.join(targetDir, safeName);

      fs.writeFileSync(filePath, req.file.buffer);

      const relativeUrl = `/uploads/${userSubdir}/${safeName}`;
      req.file.fileUrl = relativeUrl;
      req.file.filename = safeName;
      req.file.provider = "disk";
      req.file.cloudinary = false;
      req.file.gcp = false;
    };

    // 1. Try Google Cloud Storage
    if (isGcpConfigured()) {
      try {
        const gcpResult = await uploadBufferToGcp(req.file.buffer, {
          folder: folderName,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          makePublic: true,
        });

        req.file.fileUrl = gcpResult.fileUrl;
        req.file.filename = gcpResult.filename;
        req.file.provider = "gcp";
        req.file.gcp = true;
        req.file.cloudinary = false;
        console.log(`[STORAGE:GCP] Successfully uploaded ${req.file.originalname} (${req.file.buffer.length} bytes) to ${gcpResult.fileUrl}`);
        return next();
      } catch (gcpErr) {
        console.error(`[STORAGE:GCP] Upload failed: ${gcpErr.message}, falling back...`);
      }
    }

    // 2. Try Cloudinary
    if (isCloudinaryConfigured()) {
      try {
        const cloudResult = await uploadBufferToCloudinary(req.file.buffer, {
          folder: folderName,
          resource_type: resourceType,
        });
        req.file.fileUrl = cloudResult.secure_url;
        req.file.filename = cloudResult.public_id;
        req.file.provider = "cloudinary";
        req.file.cloudinary = true;
        req.file.gcp = false;
        return next();
      } catch (cloudErr) {
        console.warn(`Cloudinary upload error (${cloudErr.message}), falling back to local disk storage.`);
      }
    }

    // 3. Fallback to Local Disk
    try {
      saveToDisk();
      return next();
    } catch (diskErr) {
      console.error("Local disk storage error:", diskErr);
      return res.status(500).json({ message: "File upload failed", error: diskErr.message });
    }
  };
};

module.exports = {
  upload,
  handleUpload,
};

