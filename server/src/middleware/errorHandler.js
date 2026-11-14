import ApiError from '../utils/ApiError.js';
import env from '../config/env.js';

export const notFound = (req, _res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details;

  // Malformed JSON body
  if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Invalid JSON payload';
  }

  // Mongoose schema validation failed
  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    message = 'Validation failed';
    details = Object.fromEntries(
      Object.entries(err.errors).map(([field, e]) => [field, e.message])
    );
  }

  // Invalid ObjectId or type cast
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for ${err.path}`;
  }

  // MongoDB unique index violation (field name only — never echo the submitted value)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern ?? err.keyValue ?? {})[0] ?? 'field';
    statusCode = 409;
    message = `A record with this ${field} already exists`;
    details = { [field]: `${field} is already in use` };
  }

  if (statusCode >= 500) {
    console.error('[error]', err);
    if (env.isProduction) message = 'Internal Server Error';
  }

  // Only operational (ApiError) codes/headers are exposed — never driver error codes.
  if (err.isOperational && err.headers) res.set(err.headers);
  const code = err.isOperational && typeof err.code === 'string' ? err.code : undefined;

  res.status(statusCode).json({
    success: false,
    message,
    ...(code && { code }),
    ...(details && { details }),
    ...(!env.isProduction && statusCode >= 500 && { stack: err.stack }),
  });
};

