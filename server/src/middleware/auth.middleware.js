import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { verifyAccessToken } from '../services/token.service.js';

const BEARER_REGEX = /^Bearer\s+(\S+)$/i;
const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;
const REALM = 'bug-tracker-api';

/**
 * 401 with an RFC 6750 `WWW-Authenticate` header and a stable `code` that
 * clients can branch on (e.g. TOKEN_EXPIRED -> call the refresh endpoint).
 */
const unauthorized = (message, code, oauthError) => {
  const challenge = oauthError
    ? `Bearer realm="${REALM}", error="${oauthError}", error_description="${message}"`
    : `Bearer realm="${REALM}"`;
  return new ApiError(401, message, undefined, {
    code,
    headers: { 'WWW-Authenticate': challenge },
  });
};

/**
 * Requires a valid access token in `Authorization: Bearer <token>`.
 *
 * On success:
 *   req.user — the safe user object (same shape as API responses; no password)
 *   req.auth — { userId, tokenId } from the verified token
 *
 * The user identity comes ONLY from the verified token's `sub` claim.
 * Controllers must use `req.user._id` / `req.auth.userId` and never trust
 * user IDs sent in the request body, query, or params for ownership.
 *
 * Failures (all 401):
 *   AUTH_REQUIRED   missing header / not a Bearer token
 *   TOKEN_EXPIRED   valid token past its `exp` (client should refresh)
 *   TOKEN_INVALID   bad signature, wrong algorithm/issuer/audience/type, malformed
 *   USER_NOT_FOUND  token is valid but the user was deleted
 * Database errors are NOT masked as 401 — they propagate as 500.
 */
export const authenticate = async (req, _res, next) => {
  const match = req.get('authorization')?.trim().match(BEARER_REGEX);
  if (!match) {
    return next(unauthorized('Authentication required', 'AUTH_REQUIRED'));
  }

  let payload;
  try {
    payload = verifyAccessToken(match[1]);
  } catch (err) {
    // TokenExpiredError extends JsonWebTokenError, so check it first.
    if (err instanceof jwt.TokenExpiredError) {
      return next(unauthorized('Access token has expired', 'TOKEN_EXPIRED', 'invalid_token'));
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return next(unauthorized('Invalid access token', 'TOKEN_INVALID', 'invalid_token'));
    }
    return next(err);
  }

  // Guard before querying so a malformed `sub` can't surface as a 400 CastError.
  if (typeof payload.sub !== 'string' || !OBJECT_ID_REGEX.test(payload.sub)) {
    return next(unauthorized('Invalid access token', 'TOKEN_INVALID', 'invalid_token'));
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    return next(unauthorized('User no longer exists', 'USER_NOT_FOUND', 'invalid_token'));
  }

  req.user = user.toJSON();
  req.auth = { userId: user.id, tokenId: payload.jti };
  next();
};

