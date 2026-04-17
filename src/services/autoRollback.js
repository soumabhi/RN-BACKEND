const Log = require("../models/Log");
const Version = require("../models/Version");

let isMonitoring = false;
const monitoredApps = new Map(); // appId -> { interval, lastCheck }

/**
 * Calculate crash rate for a version in a sliding window
 */
async function getCrashRate(appId, versionId, windowSeconds) {
  const windowStart = new Date(Date.now() - windowSeconds * 1000);

  const crashLogs = await Log.countDocuments({
    appId,
    versionId,
    type: "crash",
    createdAt: { $gte: windowStart },
  });

  const totalLogs = await Log.countDocuments({
    appId,
    versionId,
    createdAt: { $gte: windowStart },
  });

  return totalLogs > 0 ? (crashLogs / totalLogs) * 100 : 0;
}

/**
 * Perform rollback: deactivate current version, activate previous one
 */
async function performRollback(appId, platform, failedVersionId, reason) {
  try {
    const failedVersion = await Version.findById(failedVersionId);
    if (!failedVersion) return;

    // Deactivate failed version
    await Version.findByIdAndUpdate(failedVersionId, { isActive: false });

    // Find previous active version
    const previous = await Version.findOne({
      appId,
      platform,
      _id: { $ne: failedVersionId },
      isActive: true,
    }).sort("-createdAt");

    if (previous) {
      // Previous version is likely already active, but ensure it is
      await Version.findByIdAndUpdate(previous._id, { isActive: true });
    }

    console.log(
      `[AutoRollback] Rolled back ${appId}@${failedVersion.version} (${platform}). Reason: ${reason}`
    );

    // Log the rollback event
    await Log.create({
      appId,
      versionId: failedVersionId,
      type: "rollback",
      message: `Auto-rollback triggered: ${reason}`,
    });
  } catch (err) {
    console.error("[AutoRollback] Error during rollback:", err.message);
  }
}

/**
 * Monitor a single version for crashes
 */
async function monitorVersion(version) {
  if (
    !version.autoRollbackEnabled ||
    !version.crashThreshold ||
    version.crashThreshold <= 0
  ) {
    return; // Auto-rollback not configured
  }

  const crashRate = await getCrashRate(
    version.appId,
    version._id,
    version.crashWindowSeconds || 300
  );

  if (crashRate >= version.crashThreshold) {
    console.warn(
      `[AutoRollback] Crash rate ${crashRate.toFixed(2)}% exceeds threshold ${version.crashThreshold}% for ${version.appId}@${version.version}`
    );
    await performRollback(
      version.appId,
      version.platform,
      version._id,
      `Crash rate ${crashRate.toFixed(2)}% exceeds threshold ${version.crashThreshold}%`
    );
  }
}

/**
 * Scan all active versions for crash anomalies
 */
async function scanActiveVersions() {
  try {
    const activeVersions = await Version.find({ isActive: true });

    for (const version of activeVersions) {
      await monitorVersion(version);
    }
  } catch (err) {
    console.error("[AutoRollback] Error scanning versions:", err.message);
  }
}

/**
 * Start monitoring for a specific app
 */
function startMonitoring(appId, intervalSeconds = 5) {
  if (monitoredApps.has(appId)) {
    console.log(`[AutoRollback] Already monitoring ${appId}`);
    return;
  }

  const interval = setInterval(scanActiveVersions, intervalSeconds * 1000);
  monitoredApps.set(appId, { interval, lastCheck: Date.now() });

  console.log(
    `[AutoRollback] Started monitoring ${appId} (interval: ${intervalSeconds}s)`
  );
}

/**
 * Stop monitoring for a specific app
 */
function stopMonitoring(appId) {
  const entry = monitoredApps.get(appId);
  if (entry) {
    clearInterval(entry.interval);
    monitoredApps.delete(appId);
    console.log(`[AutoRollback] Stopped monitoring ${appId}`);
  }
}

/**
 * Start global auto-rollback service
 */
function startGlobalMonitoring(intervalSeconds = 5) {
  if (isMonitoring) {
    console.log("[AutoRollback] Global monitoring already running");
    return;
  }

  isMonitoring = true;
  const interval = setInterval(scanActiveVersions, intervalSeconds * 1000);

  console.log(
    `[AutoRollback] Global monitoring started (interval: ${intervalSeconds}s)`
  );

  return interval;
}

/**
 * Stop global auto-rollback service
 */
function stopGlobalMonitoring() {
  isMonitoring = false;
  console.log("[AutoRollback] Global monitoring stopped");
}

/**
 * Health check: return monitoring status
 */
function getStatus() {
  return {
    isGlobalMonitoring: isMonitoring,
    monitoredAppsCount: monitoredApps.size,
    monitoredApps: Array.from(monitoredApps.entries()).map(([appId, data]) => ({
      appId,
      lastCheck: new Date(data.lastCheck),
    })),
  };
}

module.exports = {
  startGlobalMonitoring,
  stopGlobalMonitoring,
  startMonitoring,
  stopMonitoring,
  getStatus,
  performRollback,
  getCrashRate,
  scanActiveVersions,
};
