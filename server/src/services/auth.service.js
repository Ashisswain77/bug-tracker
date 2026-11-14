import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import User, { SALT_ROUNDS } from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { signAccessToken, signRefreshToken } from './token.service.js';

const DUPLICATE_KEY = 11000;

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
