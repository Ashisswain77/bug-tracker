import { registerUser, loginUser } from '../services/auth.service.js';
import { setRefreshTokenCookie, clearRefreshTokenCookie } from '../utils/authCookies.js';

// Express 5 forwards rejected promises to the error handler automatically.
export const register = async (req, res) => {
  const user = await registerUser(req.body);

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: { user },
  });
};

export const login = async (req, res) => {
  const { user, accessToken, refreshToken } = await loginUser(req.body);

  // Refresh token travels only in the HttpOnly cookie — never in the body.
  setRefreshTokenCookie(res, refreshToken.token, refreshToken.expiresAt);

  // Responses carrying credentials must never be cached.
  res.set('Cache-Control', 'no-store');

  res.status(200).json({
    success: true,
    message: 'Logged in successfully',
    data: {
      user,
      accessToken: accessToken.token,
      accessTokenExpiresAt: accessToken.expiresAt.toISOString(),
    },
  });
};

export const getMe = (req, res) => {
  res.set('Cache-Control', 'no-store');

  res.status(200).json({
    success: true,
    message: 'Authenticated user retrieved successfully',
    data: { user: req.user },
  });
};

export const logout = (_req, res) => {
  clearRefreshTokenCookie(res);
  res.set('Cache-Control', 'no-store');

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};
