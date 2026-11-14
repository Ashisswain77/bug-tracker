/**
 * Shared validation rules so request validators and Mongoose schemas stay in sync.
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const URL_REGEX = /^https?:\/\/\S+$/i;

export const USER_RULES = Object.freeze({
  NAME_MIN: 2,
  NAME_MAX: 50,
  EMAIL_MAX: 254,
  PASSWORD_MIN: 8,
  // bcrypt only uses the first 72 BYTES of input; longer passwords are silently truncated.
  PASSWORD_MAX_BYTES: 72,
});

export const byteLength = (value) => Buffer.byteLength(value, 'utf8');

