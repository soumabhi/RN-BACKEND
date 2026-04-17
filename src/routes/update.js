const express = require("express");
const { checkUpdate, rollback } = require("../controllers/updateController");
const { protect, validateApiKey } = require("../middleware/auth");

const router = express.Router();

// Public endpoint — used by the SDK
router.get("/check-update", checkUpdate);

// API Key validation for CLI rollback
router.post("/rollback", validateApiKey, rollback);

module.exports = router;
