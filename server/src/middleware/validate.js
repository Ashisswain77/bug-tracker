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

/**
 * Runs a validator `(query) => ({ errors, value })` against req.query.
 * In Express 5 `req.query` is a getter, so the sanitized value is attached
 * to `req.validatedQuery`.
 */
export const validateQuery = (validator) => (req, _res, next) => {
  const { errors, value } = validator(req.query ?? {});
  if (errors) return next(new ApiError(400, 'Validation failed', errors));
  req.validatedQuery = value;
  next();
};

/**
 * Runs a validator `(params) => ({ errors, value })` against req.params.
 * The sanitized value is attached to `req.validatedParams`, mirroring
 * `validateQuery`.
 */
export const validateParams = (validator) => (req, _res, next) => {
  const { errors, value } = validator(req.params ?? {});
  if (errors) return next(new ApiError(400, 'Validation failed', errors));
  req.validatedParams = value;
  next();
};
