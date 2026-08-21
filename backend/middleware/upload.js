const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { isCloudinaryConfigured, uploadBufferToCloudinary } = require("../config/cloudinary");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Allowed MIME types per multer field name. Previously upload.js enforced a
// size cap only - any file type could be uploaded as a "resume" or
// "interview video" - see IMPROVEMENT_ROADMAP.md "Uploads aren't
// type-checked." This is a MIME allowlist (checked against what the browser
// reports, which a malicious client can forge - it's a usability/hygiene
// filter, not a substitute for treating all uploaded content as untrusted
// downstream).
const ALLOWED_MIME_TYPES = {
  // Stage 5 interview / video-intro recordings (candidate.js, routes using
  // upload.single("video")).
  video: ["video/webm", "video/mp4", "video/quicktime", "video/x-matroska", "audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg"],
  // Aadhaar e-KYC PDF or offline e-KYC .zip package (candidate.js /ekyc/verify).
  ekycZip: ["application/pdf", "application/zip", "application/x-zip-compressed", "application/octet-stream"],
  // Generic per-stage document upload (resumes, certificates, KYC docs) -
  // candidate.js and company.js both use upload.single("doc").
  doc: [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  // Academy bulk student-roster upload (academy.js), CSV.
  file: ["text/csv", "application/vnd.ms-excel", "application/csv", "text/plain"],
};

function fileFilter(req, file, cb) {
  const allowed = ALLOWED_MIME_TYPES[file.fieldname];
  // Unknown field name (shouldn't happen given the routes that use this
  // middleware, but fail closed rather than silently allowing anything).
  if (!allowed) {
    return cb(new Error(`Uploads are not accepted on field "${file.fieldname}".`));
  }
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error(`Unsupported file type "${file.mimetype}" for this upload. Allowed: ${allowed.join(", ")}`));
  }
  cb(null, true);
}

// Use memory storage so req.file.buffer is available for Cloudinary or disk fallback
const memoryStorage = multer.memoryStorage();

const upload = multer({
  storage: memoryStorage,
  limits: { fileSize: Number(process.env.MAX_UPLOAD_SIZE) || 50 * 1024 * 1024 }, // 50MB limit
  fileFilter,
});

/**
 * Express middleware to process the uploaded file buffer.
 * If Cloudinary is configured (env vars set), uploads to Cloudinary.
 * Otherwise, falls back to local disk storage in /uploads directory.
 * Attaches req.file.fileUrl and req.file.publicId / req.file.filename.
 */
const handleUpload = (options = {}) => {
  return async (req, res, next) => {
    if (!req.file) return next();

    const folderName = options.folder || `talentera/${req.candidateId || req.companyId || "anon"}`;
    const resourceType = options.resourceType || "auto";

    try {
      if (isCloudinaryConfigured()) {
        // Upload to Cloudinary
        const cloudResult = await uploadBufferToCloudinary(req.file.buffer, {
          folder: folderName,
          resource_type: resourceType,
        });
        req.file.fileUrl = cloudResult.secure_url;
        req.file.filename = cloudResult.public_id;
        req.file.cloudinary = true;
      } else {
        // Local Disk Fallback
        const userSubdir = path.join(UPLOAD_DIR, req.candidateId || req.companyId || "anon");
        if (!fs.existsSync(userSubdir)) fs.mkdirSync(userSubdir, { recursive: true });

        const safeName = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
        const filePath = path.join(userSubdir, safeName);

        fs.writeFileSync(filePath, req.file.buffer);

        const relativeUrl = `/uploads/${req.candidateId || req.companyId || "anon"}/${safeName}`;
        req.file.fileUrl = relativeUrl;
        req.file.filename = safeName;
        req.file.cloudinary = false;
      }
      next();
    } catch (err) {
      console.error("Upload error:", err);
      return res.status(500).json({ message: "File upload failed", error: err.message });
    }
  };
};

module.exports = {
  upload,
  handleUpload,
};
