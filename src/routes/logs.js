const express = require("express");
const {
  createLog,
  getLogs,
  getStats,
} = require("../controllers/logController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Public — SDK sends events here
router.post("/log", createLog);

// Protected — dashboard reads logs
router.get("/logs", protect, getLogs);
router.get("/logs/stats/:appId", protect, getStats);

module.exports = router;
