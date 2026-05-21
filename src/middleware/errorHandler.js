/**
 * Global error handler middleware.
 * Catches all errors passed via next(error) and returns
 * a consistent JSON response.
 */
function errorHandler(err, req, res, next) {
  console.error('❌ Error:', err.message);

  // Prisma known request errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: 'A record with this value already exists.',
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Record not found.',
    });
  }

  // Express-validator errors
  if (err.array && typeof err.array === 'function') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors: err.array(),
    });
  }

  // Default
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error.',
  });
}

module.exports = errorHandler;
