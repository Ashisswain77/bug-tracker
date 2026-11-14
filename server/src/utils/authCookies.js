import env from '../config/env.js';

export const REFRESH_COOKIE_NAME = 'refreshToken';

// Only sent to auth endpoints (refresh/logout), never to the rest of the API.
export const REFRESH_COOKIE_PATH = '/api/v1/auth';

export const refreshCookieOptions = (expiresAt) => ({
  httpOnly: true, // not readable from JavaScript (XSS protection)
  secure: env.cookieSecure, // HTTPS-only in production
  sameSite: env.cookieSameSite, // CSRF protection
  path: REFRESH_COOKIE_PATH,
  ...(expiresAt && { expires: expiresAt }), // matches the token's own `exp`
});

export const setRefreshTokenCookie = (res, token, expiresAt) => {
  res.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions(expiresAt));
};

export const clearRefreshTokenCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());
};

