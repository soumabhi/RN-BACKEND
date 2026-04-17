const Log = require("../models/Log");

/**
 * POST /api/log — Record a client event
 */
exports.createLog = async (req, res, next) => {
  try {
    const { appId, event, version, platform, userId, meta } = req.body;

    if (!appId || !event) {
      return res.status(400).json({ error: "appId and event are required" });
    }

    const VALID_EVENTS = [
      "app_start",
      "update_success",
      "update_failed",
      "crash",
    ];
    if (!VALID_EVENTS.includes(event)) {
      return res
        .status(400)
        .json({ error: `event must be one of: ${VALID_EVENTS.join(", ")}` });
    }

    const log = await Log.create({
      appId,
      event,
      version: version || "unknown",
      platform: platform || "unknown",
      userId: userId || "anonymous",
      meta: meta || {},
    });

    console.log(
      `[log] ${log.event} | ${log.appId} v${log.version} | user=${log.userId}`,
    );

    res.status(201).json({ success: true, id: log._id });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/logs — Fetch logs with filters (requires JWT auth)
 *
 * Query: appId, event, version, platform, limit (default 100)
 */
exports.getLogs = async (req, res, next) => {
  try {
    const { appId, event, version, platform, limit = 100 } = req.query;

    const filter = {};
    if (appId) filter.appId = appId;
    if (event) filter.event = event;
    if (version) filter.version = version;
    if (platform) filter.platform = platform;

    const n = Math.min(Number(limit) || 100, 1000);

    const logs = await Log.find(filter).sort("-createdAt").limit(n);

    // Build summary grouped by version
    const summary = {};
    for (const log of logs) {
      if (!summary[log.version])
        summary[log.version] = { total: 0, events: {} };
      summary[log.version].total++;
      summary[log.version].events[log.event] =
        (summary[log.version].events[log.event] || 0) + 1;
    }

    res.json({ logs, summary, count: logs.length });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/logs/stats/:appId — Aggregated stats for an app
 */
exports.getStats = async (req, res, next) => {
  try {
    const { appId } = req.params;

    const pipeline = [
      { $match: { appId } },
      {
        $group: {
          _id: { event: "$event", version: "$version" },
          count: { $sum: 1 },
          lastSeen: { $max: "$createdAt" },
        },
      },
      { $sort: { "_id.version": -1, count: -1 } },
    ];

    const stats = await Log.aggregate(pipeline);

    res.json({ appId, stats });
  } catch (err) {
    next(err);
  }
};
