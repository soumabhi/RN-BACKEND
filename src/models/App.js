const mongoose = require("mongoose");
const crypto = require("crypto");

const appSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "App name is required"],
      trim: true,
      maxlength: 100,
    },
    appId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [
        /^[a-z0-9-]+$/,
        "appId must be lowercase alphanumeric with hyphens",
      ],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    platforms: {
      type: [String],
      enum: ["android", "ios"],
      default: ["android"],
    },
    apiKey: {
      type: String,
      unique: true,
    },
  },
  { timestamps: true },
);

// Auto-generate apiKey before first save
appSchema.pre("save", function (next) {
  if (!this.apiKey) {
    this.apiKey = `ota_${crypto.randomBytes(24).toString("hex")}`;
  }
  next();
});

module.exports = mongoose.model("App", appSchema);
