require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const connectDB = require("./config/db");
const logger = require("./utils/logger");

const authRoutes = require("./routes/auth");
const candidateRoutes = require("./routes/candidate");
const publicRoutes = require("./routes/public");
const academyRoutes = require("./routes/academy");
const staffRoutes = require("./routes/staff");
const companyAuthRoutes = require("./routes/companyAuth");
const companyRoutes = require("./routes/company");
const otpRoutes = require("./routes/otp");
const aadhaarRoutes = require("./routes/aadhaar");
const vapiInterviewRoutes = require("./routes/vapiInterview");
const collegeRoutes = require("./routes/college");

const app = express();

connectDB();

const defaultOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:5175",
  "http://127.0.0.1:5175",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
  "https://talentera-nine.vercel.app",
  "https://talentera.in",
  "https://www.talentera.in",
];
const envOrigins = (process.env.CLIENT_ORIGINS || "").split(",").map((o) => o.trim()).filter(Boolean);
const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

app.use(
  helmet({
    // This is a JSON API, not an HTML-serving app - a default CSP has no
    // useful page to protect here and mainly just risks breaking the
    // /uploads static file responses (videos/resumes) for no benefit.
    contentSecurityPolicy: false,
    // Uploaded files (resume assets, interview videos) are fetched
    // cross-origin by the frontend - helmet's default
    // crossOriginResourcePolicy: "same-origin" would otherwise block that.
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(
  cors({
    origin: function (origin, callback) {
      // No Origin header at all (curl, mobile apps, Postman, server-to-server)
      if (!origin) return callback(null, true);

      // In development or test mode, allow any localhost port or private local network IP
      const isDev = process.env.NODE_ENV !== "production";
      if (isDev) {
        if (
          /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
          /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin) ||
          /^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin)
        ) {
          return callback(null, true);
        }
      }

      if (allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }

      logger.warn(`[CORS BLOCKED] Origin '${origin}' is not in allowed origins.`);
      return callback(new Error("Not allowed by CORS for this origin."));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

// Serve uploaded files (resume assets, videos) - replaces Firebase Storage public URLs
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/candidate", candidateRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/academy", academyRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/company/auth", companyAuthRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/aadhaar", aadhaarRoutes);
// Not behind requireAuth - Vapi calls this server-to-server; see
// routes/vapiInterview.js for how it authenticates the candidate instead.
app.use("/api/vapi", vapiInterviewRoutes);
app.use("/api/college", collegeRoutes);

const { isGcpConfigured } = require("./config/gcpStorage");

app.get("/api/health", (_req, res) => {
  const gcpActive = isGcpConfigured();
  res.json({
    status: "ok",
    storage: gcpActive ? "gcp" : "local",
    gcpBucket: process.env.GCP_STORAGE_BUCKET || null,
  });
});

// Central error handler (e.g. multer file-size errors, CORS rejection)
app.use((err, req, res, _next) => {
  logger.error(`${req.method} ${req.originalUrl} - ${err.message}`, { stack: err.stack });

  // Handle Multer file-size error specifically
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      message: "Uploaded video file is too large. Maximum allowed size is 100 MB.",
      error: "LIMIT_FILE_SIZE",
    });
  }

  res.status(err.status || 500).json({ message: err.message || "Server error." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`Talentera API running on port ${PORT}`);
  if (isGcpConfigured()) {
    logger.info(`[GCP STORAGE] Connected: Bucket '${process.env.GCP_STORAGE_BUCKET}'`);
  } else {
    logger.warn(`[GCP STORAGE] Not configured. Video uploads will use local disk storage.`);
  }
});
