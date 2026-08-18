const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { isCloudinaryConfigured, uploadBufferToCloudinary } = require("../config/cloudinary");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Use memory storage so req.file.buffer is available for Cloudinary or disk fallback
const memoryStorage = multer.memoryStorage();

const upload = multer({
  storage: memoryStorage,
  limits: { fileSize: Number(process.env.MAX_UPLOAD_SIZE) || 50 * 1024 * 1024 }, // 50MB limit
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
