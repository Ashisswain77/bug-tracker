import ApiError from '../utils/ApiError.js';

/**
 * Runs a validator `(body) => ({ errors, value })` against req.body.
 * On failure responds 400 with field-level details; on success replaces
 * req.body with the sanitized, whitelisted value.
 */
export const validate = (validator) => (req, _res, next) => {
  const { errors, value } = validator(req.body ?? {});
  if (errors) return next(new ApiError(400, 'Validation failed', errors));
  req.body = value;
  next();
};

