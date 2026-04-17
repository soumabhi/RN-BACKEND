const App = require("../models/App");
const Version = require("../models/Version");
const s3 = require("../services/s3");

/**
 * POST /api/upload — Upload a new JS bundle
 * Requires API key auth (via x-api-key header). Multipart form:
 *   - bundle (file)
 *   - appId, version, platform, rollout
 */
exports.uploadBundle = async (req, res, next) => {
  try {
    const {
      appId,
      version,
      platform = "android",
      rollout = 100,
      segment = "all",              // NEW
      minVersion,                    // NEW
      maxVersion,                    // NEW
      countries,                     // NEW
    } = req.body;

    if (!appId || !version) {
      return res.status(400).json({ error: "appId and version are required" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Bundle file is required" });
    }
    if (!/^\d+\.\d+\.\d+$/.test(version)) {
      return res
        .status(400)
        .json({ error: "Version must be semver (e.g. 1.0.2)" });
    }

    // Verify the API key matches the app (already validated by validateApiKey middleware)
    const app = req.appDoc;
    if (app.appId !== appId) {
      return res
        .status(403)
        .json({ error: "API key does not match the specified app" });
    }

    // Upload bundle to S3
    const s3Key = `apps/${appId}/${platform}/v${version}/bundle.js`;
    await s3.uploadFile(s3Key, req.file.buffer);

    // Deactivate all previous active versions for this app + platform
    await Version.updateMany(
      { appId, platform, isActive: true },
      { $set: { isActive: false } },
    );

    // Create the new version record
    const bundleUrl = await s3.getPresignedUrl(s3Key);
    const versionDoc = await Version.create({
      app: app._id,
      appId,
      version,
      platform,
      bundleUrl,
      bundleKey: s3Key,
      size: req.file.size,
      rollout: Math.min(100, Math.max(0, Number(rollout))),
      segment: segment || "all",                           // NEW
      minVersion: minVersion || undefined,                  // NEW
      maxVersion: maxVersion || undefined,                  // NEW
      countries: countries ? countries.split(",") : [],    // NEW
      autoRollbackEnabled: true,                           // NEW
      crashThreshold: 5,                                    // NEW
      isActive: true,
    });

    console.log(
      `[upload] ${appId}/${platform} → v${version} (rollout ${versionDoc.rollout}%, segment: ${versionDoc.segment})`,  // Updated log
    );

    res.status(201).json({
      success: true,
      version: {
        id: versionDoc._id,
        appId,
        platform,
        version: versionDoc.version,
        rollout: versionDoc.rollout,
        segment: versionDoc.segment,                    // NEW
        minVersion: versionDoc.minVersion,              // NEW
        maxVersion: versionDoc.maxVersion,              // NEW
        countries: versionDoc.countries,                // NEW
        isActive: versionDoc.isActive,
        size: versionDoc.size,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/versions/:appId — List all versions for an app
 */
exports.listVersions = async (req, res, next) => {
  try {
    const { appId } = req.params;
    const { platform } = req.query;

    const filter = { appId };
    if (platform) filter.platform = platform;

    const versions = await Version.find(filter).sort("-createdAt");
    res.json({ versions });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/versions/:id/rollout — Update rollout percentage
 */
exports.updateRollout = async (req, res, next) => {
  try {
    const { rollout } = req.body;
    if (rollout == null) {
      return res.status(400).json({ error: "rollout is required" });
    }

    const version = await Version.findById(req.params.id);
    if (!version) {
      return res.status(404).json({ error: "Version not found" });
    }

    // Verify ownership
    const app = await App.findOne({
      appId: version.appId,
      owner: req.user._id,
    });
    if (!app) {
      return res.status(403).json({ error: "You do not own this app" });
    }

    version.rollout = Math.min(100, Math.max(0, Number(rollout)));
    await version.save();

    res.json({ version });
  } catch (err) {
    next(err);
  }
};
