import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import env from '../config/env.js';

export const TOKEN_ISSUER = 'bug-tracker-api';
export const TOKEN_AUDIENCE = 'bug-tracker-client';
export const TOKEN_ALGORITHM = 'HS256';

/**
 * Signs a JWT for a user. Payload is intentionally minimal (no PII):
 * `sub` = user id, `type` distinguishes access vs refresh tokens,
 * `jti` gives each token a unique id (enables future rotation/revocation).
 * @returns {{ token: string, expiresAt: Date }}
 */
const signToken = (userId, type, secret, expiresIn) => {
  const token = jwt.sign({ type }, secret, {
    subject: String(userId),
    expiresIn,
    algorithm: TOKEN_ALGORITHM,
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
    jwtid: randomUUID(),
  });
  const { exp } = jwt.decode(token);
  return { token, expiresAt: new Date(exp * 1000) };
};

export const signAccessToken = (userId) =>
  signToken(userId, 'access', env.jwtAccessSecret, env.jwtAccessExpiresIn);

export const signRefreshToken = (userId) =>
  signToken(userId, 'refresh', env.jwtRefreshSecret, env.jwtRefreshExpiresIn);

/**
 * Verifies an access token: signature, algorithm (pinned — blocks `alg: none`
 * and algorithm-confusion attacks), expiry, issuer, audience, and token type.
 * Throws jsonwebtoken errors (TokenExpiredError / JsonWebTokenError / NotBeforeError).
 * @returns {object} decoded payload
 */
export const verifyAccessToken = (token) => {
  const payload = jwt.verify(token, env.jwtAccessSecret, {
    algorithms: [TOKEN_ALGORITHM],
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
  });
  if (payload.type !== 'access') {
    throw new jwt.JsonWebTokenError('invalid token type');
  }
  return payload;
};

