/**
 * Global error handler middleware.
 */
function errorHandler(err, req, res, _next) {
  console.error("[error]", err.stack || err.message);

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res
      .status(400)
      .json({ error: "Validation failed", details: messages });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({ error: `Duplicate value for ${field}` });
  }

  // Multer file size error
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "File too large (max 50 MB)" });
  }

  const status = err.statusCode || 500;
  res.status(status).json({ error: err.message || "Internal server error" });
}

module.exports = { errorHandler };
