const mongoose = require("mongoose");

const versionSchema = new mongoose.Schema(
  {
    app: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "App",
      required: true,
    },
    appId: {
      type: String,
      required: true,
      index: true,
    },
    version: {
      type: String,
      required: [true, "Version is required"],
      match: [/^\d+\.\d+\.\d+$/, "Version must be semver (e.g. 1.0.2)"],
    },
    platform: {
      type: String,
      required: true,
      enum: ["android", "ios"],
    },
    bundleUrl: {
      type: String,
      required: true,
    },
    bundleKey: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      default: 0,
    },
    rollout: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// Compound index for efficient lookups
versionSchema.index({ appId: 1, platform: 1, isActive: 1 });
versionSchema.index({ appId: 1, platform: 1, version: 1 }, { unique: true });

module.exports = mongoose.model("Version", versionSchema);
