import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import User, { SALT_ROUNDS } from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from './token.service.js';

const DUPLICATE_KEY = 11000;
const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

// Hash of a random value, used to spend the same bcrypt time when an email is
// not registered — prevents discovering accounts via response timing.
const dummyHashPromise = bcrypt.hash(randomUUID(), SALT_ROUNDS);

const invalidCredentials = () => new ApiError(401, 'Invalid email or password');

/**
 * Creates a new user. Password hashing is handled by the User model's pre-save hook.
 * @returns {Promise<object>} the user as safe JSON (no password)
 */
export const registerUser = async ({ name, email, password }) => {
  if (await User.exists({ email })) {
    throw new ApiError(409, 'An account with this email already exists', {
      email: 'Email is already registered',
    });
  }

  try {
    const user = await User.create({ name, email, password });
    return user.toJSON();
  } catch (err) {
    // Race condition: another request registered the same email between the check and insert.
    if (err?.code === DUPLICATE_KEY) {
      throw new ApiError(409, 'An account with this email already exists', {
        email: 'Email is already registered',
      });
    }
    throw err;
  }
};

/**
 * Verifies credentials and issues an access/refresh token pair.
 * Unknown email and wrong password produce the identical 401 error.
 * @returns {Promise<{ user: object, accessToken: {token, expiresAt}, refreshToken: {token, expiresAt} }>}
 */
export const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    await bcrypt.compare(password, await dummyHashPromise);
    throw invalidCredentials();
  }

  if (!(await user.comparePassword(password))) {
    throw invalidCredentials();
  }

  return {
    user: user.toJSON(),
    accessToken: signAccessToken(user.id),
    refreshToken: signRefreshToken(user.id),
  };
};

/**
 * Verifies the HttpOnly refresh token cookie, loads the user, and rotates the token pair.
 * @returns {Promise<{ user: object, accessToken: {token, expiresAt}, refreshToken: {token, expiresAt} }>}
 */
export const refreshUserSession = async (rawRefreshToken) => {
  if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
    throw new ApiError(401, 'Refresh token required', undefined, { code: 'REFRESH_REQUIRED' });
  }

  let payload;
  try {
    payload = verifyRefreshToken(rawRefreshToken);
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new ApiError(401, 'Refresh token has expired', undefined, { code: 'REFRESH_EXPIRED' });
    }
    if (err instanceof jwt.JsonWebTokenError) {
      throw new ApiError(401, 'Invalid refresh token', undefined, { code: 'REFRESH_INVALID' });
    }
    throw err;
  }

  if (typeof payload.sub !== 'string' || !OBJECT_ID_REGEX.test(payload.sub)) {
    throw new ApiError(401, 'Invalid refresh token', undefined, { code: 'REFRESH_INVALID' });
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    throw new ApiError(401, 'User no longer exists', undefined, { code: 'USER_NOT_FOUND' });
  }

  return {
    user: user.toJSON(),
    accessToken: signAccessToken(user.id),
    refreshToken: signRefreshToken(user.id),
  };
};
