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

const app = express();

connectDB();

const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://talentera-nine.vercel.app",
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
      // No Origin header at all (curl, server-to-server calls, some mobile
      // clients) - allow; there's no browser same-origin policy to enforce.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }
      // Previously this branch also called callback(null, true) - the
      // whitelist check above was computed but its result was discarded,
      // so every origin was actually allowed regardless. See
      // IMPROVEMENT_ROADMAP.md "CORS accepts every origin, silently."
      // Fixed to genuinely reject anything not on the whitelist.
      return callback(new Error("Not allowed by CORS for this origin."));
    },
    credentials: true,
  })
);
app.use(express.json());

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

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// Central error handler (e.g. multer file-size errors, CORS rejection)
app.use((err, req, res, _next) => {
  logger.error(`${req.method} ${req.originalUrl} - ${err.message}`, { stack: err.stack });
  res.status(err.status || 500).json({ message: err.message || "Server error." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => logger.info(`Talentera API running on port ${PORT}`));
