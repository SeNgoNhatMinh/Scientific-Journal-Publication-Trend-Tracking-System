/**
 * Error Handling Middleware
 * Centralized error handling for all routes
 */

const errorHandler = (err, req, res, next) => {
  const isTimeout =
    err.code === 'ECONNABORTED' || /timeout.*exceeded/i.test(err.message || '');
  const isCastError = err.name === 'CastError';
  const statusCode =
    err.statusCode || (isTimeout ? 504 : isCastError ? 400 : 500);
  const message = isTimeout
    ? 'External API (OpenAlex, etc.) timed out. Retry with a shorter query or try again later.'
    : err.message || 'Internal Server Error';

  console.error(`[ERROR] ${statusCode} - ${message}`);
  console.error(err);

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
