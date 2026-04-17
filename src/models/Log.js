const mongoose = require("mongoose");

const logSchema = new mongoose.Schema(
  {
    appId: {
      type: String,
      required: true,
      index: true,
    },
    event: {
      type: String,
      required: true,
      enum: ["app_start", "update_success", "update_failed", "crash"],
    },
    version: {
      type: String,
      default: "unknown",
    },
    platform: {
      type: String,
      default: "unknown",
    },
    userId: {
      type: String,
      default: "anonymous",
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

// TTL index — auto-delete logs older than 90 days
logSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model("Log", logSchema);
