const express = require("express");
const multer = require("multer");
const {
  uploadBundle,
  listVersions,
  updateRollout,
} = require("../controllers/versionController");
const { protect, validateApiKey } = require("../middleware/auth");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
});

// API Key validation for CLI/CI-CD uploads
router.post("/upload", validateApiKey, upload.single("bundle"), uploadBundle);

// JWT auth for dashboard
router.get("/versions/:appId", protect, listVersions);
router.patch("/versions/:id/rollout", protect, updateRollout);

module.exports = router;
