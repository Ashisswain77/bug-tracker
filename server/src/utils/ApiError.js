/**
 * Operational error with an HTTP status code.
 * Throw this from controllers/services; the global error handler formats it.
 *
 * @param {number} statusCode HTTP status
 * @param {string} message    human-readable message
 * @param {object} [details]  field-level details (e.g. validation errors)
 * @param {{ code?: string, headers?: Record<string, string> }} [options]
 *        code: stable machine-readable error code for clients (e.g. TOKEN_EXPIRED)
 *        headers: response headers to set (e.g. WWW-Authenticate)
 */
export default class ApiError extends Error {
  constructor(statusCode, message, details = undefined, { code, headers } = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.code = code;
    this.headers = headers;
    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }
}
