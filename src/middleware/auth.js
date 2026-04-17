const jwt = require("jsonwebtoken");
const User = require("../models/User");
const App = require("../models/App");

/**
 * Protect routes — requires a valid JWT in the Authorization header.
 * Attaches req.user (the User doc).
 */
async function protect(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const token = header.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: "User no longer exists" });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    next(err);
  }
}

/**
 * Validate API key for SDK/public routes.
 * Expects header: x-api-key: <key>
 * Attaches req.app (the App doc).
 */
async function validateApiKey(req, res, next) {
  try {
    const apiKey = req.headers["x-api-key"];
    if (!apiKey) {
      return res
        .status(401)
        .json({ error: "API key required (x-api-key header)" });
    }

    const app = await App.findOne({ apiKey });
    if (!app) {
      return res.status(403).json({ error: "Invalid API key" });
    }

    req.appDoc = app;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { protect, validateApiKey };
