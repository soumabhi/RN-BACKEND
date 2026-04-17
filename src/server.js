require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { errorHandler } = require("./middleware/errorHandler");
const autoRollback = require("./services/autoRollback"); // NEW

// Route imports
const authRoutes = require("./routes/auth");
const appRoutes = require("./routes/apps");
const versionRoutes = require("./routes/versions");
const updateRoutes = require("./routes/update");
const logRoutes = require("./routes/logs");

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security ──────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate-limit the public check-update endpoint
app.use(
  "/api/check-update",
  rateLimit({
    windowMs: 60_000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// Rate-limit auth endpoints to prevent brute-force
app.use(
  "/api/auth",
  rateLimit({
    windowMs: 15 * 60_000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// ── Routes ────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/apps", appRoutes);
app.use("/api", versionRoutes);
app.use("/api", updateRoutes);
app.use("/api", logRoutes);

// Health check (basic)
app.get("/health", (_req, res) =>
  res.json({ status: "ok", time: new Date().toISOString() }),
);

// Health check (detailed) — includes auto-rollback status
app.get("/health/detailed", (_req, res) =>
  res.json({
    status: "ok",
    time: new Date().toISOString(),
    autoRollback: autoRollback.getStatus(),
  }),
);

// ── Error handler ─────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────
async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Start auto-rollback service (monitors crash rates)
    autoRollback.startGlobalMonitoring(5); // checks every 5 seconds

    app.listen(PORT, () => {
      console.log(`🚀 rn-ota server running on port ${PORT}`);
      console.log(`📊 Auto-rollback service active`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
}

start();

module.exports = app; // for testing
