require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");

const authRoutes = require("./routes/auth");
const candidateRoutes = require("./routes/candidate");
const publicRoutes = require("./routes/public");
const academyRoutes = require("./routes/academy");
const staffRoutes = require("./routes/staff");

const app = express();

connectDB();

const allowedOrigins = (process.env.CLIENT_ORIGINS || "http://localhost:5173").split(",");
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// Serve uploaded files (resume assets, videos) - replaces Firebase Storage public URLs
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/candidate", candidateRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/academy", academyRoutes);
app.use("/api/staff", staffRoutes);

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// Central error handler (e.g. multer file-size errors)
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Server error." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Talentera API running on port ${PORT}`));
