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
  // Academy profile gallery - photos and short videos
  media: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
    "video/webm",
    "video/quicktime",
  ],
  // Academy bulk student-roster upload, CSV
  file: [
    "text/csv",
    "application/vnd.ms-excel",
    "application/csv",
    "text/plain",
    "application/octet-stream",
    // Excel workbooks (.xlsx) - converted to CSV right after upload (see xlsxToCsvMiddleware)
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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

    const userSubdir = String(req.candidateId || req.companyId || req.academyId || req.collegeId || "anon");
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

// ---------------------------------------------------------------------------
// Excel (.xlsx) support for the CSV-based bulk uploads.
// If the uploaded file is a real .xlsx workbook (ZIP magic bytes), its first sheet is converted to
// CSV text in place, so every downstream route keeps parsing plain CSV and nothing else changes.
// ---------------------------------------------------------------------------
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function csvEscape(v) {
  const t = String(v ?? "");
  return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

function excelCellToText(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    // Month & Year columns (e.g. "Jan-26") come through Excel as dates
    return `${MONTHS[value.getUTCMonth()]}-${String(value.getUTCFullYear()).slice(-2)}`;
  }
  if (typeof value === "object") {
    if (Array.isArray(value.richText)) return value.richText.map((r) => r.text).join("");
    if (value.result !== undefined && value.result !== null) return excelCellToText(value.result);
    if (value.text !== undefined) return excelCellToText(value.text);
    if (value.hyperlink) return String(value.hyperlink);
    if (value.error) return "";
    return "";
  }
  return String(value);
}

async function xlsxBufferToCsvBuffer(buffer) {
  const ExcelJS = require("exceljs");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets.find((w) => w.rowCount > 0) || wb.worksheets[0];
  if (!ws) return Buffer.from("", "utf-8");
  const lines = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const cells = [];
    for (let c = 1; c <= ws.columnCount; c++) cells.push(csvEscape(excelCellToText(row.getCell(c).value).trim()));
    if (cells.some((x) => x !== "")) lines.push(cells.join(","));
  });
  return Buffer.from(lines.join("\n"), "utf-8");
}

async function xlsxToCsvMiddleware(req, res, next) {
  try {
    const f = req.file;
    if (f && f.buffer && f.buffer.length >= 4 && f.buffer[0] === 0x50 && f.buffer[1] === 0x4b && f.buffer[2] === 0x03 && f.buffer[3] === 0x04) {
      f.buffer = await xlsxBufferToCsvBuffer(f.buffer);
      f.size = f.buffer.length;
      f.mimetype = "text/csv";
      if (f.originalname) f.originalname = f.originalname.replace(/\.(xlsx|xlsm)$/i, ".csv");
    }
    next();
  } catch (err) {
    console.error("xlsx to csv conversion failed:", err);
    res.status(400).json({ message: "Could not read this Excel file. Please re-save it as .xlsx or .csv and try again." });
  }
}

// Same multer instance, but single() also converts an uploaded .xlsx to CSV after multer finishes.
// A real .doc/.zip is never ZIP-magic-bytes + accepted by the `file` field filter, so other fields are unaffected.
const uploadWithXlsx = Object.create(upload);
uploadWithXlsx.single = (field) => [upload.single(field), xlsxToCsvMiddleware];

module.exports = {
  upload: uploadWithXlsx,
  handleUpload,
  xlsxBufferToCsvBuffer,
};

