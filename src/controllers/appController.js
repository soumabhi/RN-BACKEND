const App = require("../models/App");

/**
 * POST /api/apps — Create a new app
 */
exports.createApp = async (req, res, next) => {
  try {
    const { name, appId, platforms } = req.body;

    if (!name || !appId) {
      return res.status(400).json({ error: "name and appId are required" });
    }

    const app = await App.create({
      name,
      appId,
      platforms: platforms || ["android"],
      owner: req.user._id,
    });

    res.status(201).json({ app });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/apps — List apps owned by the current user
 */
exports.listApps = async (req, res, next) => {
  try {
    const apps = await App.find({ owner: req.user._id }).sort("-createdAt");
    res.json({ apps });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/apps/:id — Get a single app by MongoDB _id
 */
exports.getApp = async (req, res, next) => {
  try {
    const app = await App.findOne({ _id: req.params.id, owner: req.user._id });
    if (!app) {
      return res.status(404).json({ error: "App not found" });
    }
    res.json({ app });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/apps/:id — Delete an app
 */
exports.deleteApp = async (req, res, next) => {
  try {
    const app = await App.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id,
    });
    if (!app) {
      return res.status(404).json({ error: "App not found" });
    }
    res.json({ message: "App deleted" });
  } catch (err) {
    next(err);
  }
};
