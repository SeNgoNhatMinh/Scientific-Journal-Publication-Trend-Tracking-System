/**
 * Error Handling Middleware
 * Centralized error handling for all routes
 */

const errorHandler = (err, req, res, next) => {
  const isTimeout =
    err.code === 'ECONNABORTED' || /timeout.*exceeded/i.test(err.message || '');
  const isCastError = err.name === 'CastError';
  const providerStatus = err.response?.status;
  const statusCode =
    err.statusCode || providerStatus || (isTimeout ? 504 : isCastError ? 400 : 500);
  let message = isTimeout
    ? 'External API (OpenAlex, etc.) timed out. Retry with a shorter query or try again later.'
    : err.message || 'Internal Server Error';

  if (providerStatus === 429) {
    message = 'External academic API rate limit exceeded. Please wait and retry with a smaller request.';
  }

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
