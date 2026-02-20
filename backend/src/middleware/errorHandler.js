/**
 * Error-handling middleware.
 */
function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message;

  console.error(`[ERROR] ${req.method} ${req.originalUrl}`, err);

  res.status(status).json({
    error: {
      status,
      message,
    },
  });
}

module.exports = errorHandler;
