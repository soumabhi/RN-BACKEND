const Version = require("../models/Version");
const App = require("../models/App");
const s3 = require("../services/s3");
const { isInRollout, compareVersions } = require("../utils/rollout");

/**
 * GET /api/check-update — Public endpoint (validated via API key or query params)
 *
 * Query: appId, version, platform, userId
 */
exports.checkUpdate = async (req, res, next) => {
  try {
    const { appId, platform = "android", version, userId } = req.query;

    if (!appId || !version || !userId) {
      return res
        .status(400)
        .json({ error: "appId, version, and userId are required" });
    }

    // Find latest active version for this app + platform
    const latest = await Version.findOne({
      appId,
      platform,
      isActive: true,
    }).sort("-createdAt");

    if (!latest) {
      return res.json({ update: false });
    }

    // Already on latest or newer
    if (compareVersions(version, latest.version) >= 0) {
      return res.json({ update: false });
    }

    // Rollout gate
    if (!isInRollout(userId, latest.rollout)) {
      return res.json({ update: false, reason: "not_in_rollout" });
    }

    // Generate a fresh signed URL
    const bundleUrl = await s3.getPresignedUrl(latest.bundleKey);

    res.json({
      update: true,
      version: latest.version,
      bundleUrl,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/rollback — Rollback to the previous version
 * Requires API key auth (via x-api-key header). Body: { appId, platform }
 */
exports.rollback = async (req, res, next) => {
  try {
    const { appId, platform = "android" } = req.body;

    if (!appId) {
      return res.status(400).json({ error: "appId is required" });
    }

    // Verify the app exists (already validated by validateApiKey middleware)
    const app = req.appDoc;
    if (app.appId !== appId) {
      return res
        .status(403)
        .json({ error: "API key does not match the specified app" });
    }

    // Get the two most recent versions for this app+platform
    const versions = await Version.find({ appId, platform })
      .sort("-createdAt")
      .limit(2);

    if (versions.length < 2) {
      return res
        .status(400)
        .json({ error: "No previous version to rollback to" });
    }

    const [current, previous] = versions;

    // Deactivate current, activate previous
    current.isActive = false;
    previous.isActive = true;
    previous.rollout = 100; // Full rollout on rollback

    await Promise.all([current.save(), previous.save()]);

    console.log(
      `[rollback] ${appId}/${platform}: v${current.version} → v${previous.version}`,
    );

    res.json({
      success: true,
      rolledBackTo: previous.version,
      previousLatest: current.version,
    });
  } catch (err) {
    next(err);
  }
};
