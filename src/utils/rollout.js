const crypto = require("crypto");

/**
 * Deterministic rollout check.
 * Returns true if the user should receive the update for the given rollout %.
 */
function isInRollout(userId, rolloutPercent) {
  if (rolloutPercent >= 100) return true;
  if (rolloutPercent <= 0) return false;

  const hash = crypto.createHash("sha256").update(String(userId)).digest("hex");
  const bucket = parseInt(hash.substring(0, 8), 16) % 100;
  return bucket < rolloutPercent;
}

/**
 * Semver comparison. Returns -1 if a < b, 0 if equal, 1 if a > b.
 */
function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

module.exports = { isInRollout, compareVersions };
