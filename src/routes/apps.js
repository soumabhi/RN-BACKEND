const express = require("express");
const {
  createApp,
  listApps,
  getApp,
  deleteApp,
} = require("../controllers/appController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// All routes require JWT
router.use(protect);

router.post("/", createApp);
router.get("/", listApps);
router.get("/:id", getApp);
router.delete("/:id", deleteApp);

module.exports = router;
