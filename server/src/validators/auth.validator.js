import { EMAIL_REGEX, USER_RULES, byteLength } from '../utils/validation.js';

/**
 * Validates and sanitizes the registration payload.
 * Only whitelisted fields are returned, which blocks mass assignment
 * (e.g. a client sending `avatar`, `role`, or `_id`). Requiring strings also
 * prevents NoSQL operator injection such as `{ "email": { "$ne": null } }`.
 *
 * @returns {{ errors: Record<string, string> | null, value: { name: string, email: string, password: string } }}
 */
export const validateRegister = (body = {}) => {
  const errors = {};
  const { name, email, password } = body;

  // name
  const cleanName = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
  if (typeof name !== 'string' || !cleanName) {
    errors.name = 'Name is required';
  } else if (cleanName.length < USER_RULES.NAME_MIN) {
    errors.name = `Name must be at least ${USER_RULES.NAME_MIN} characters`;
  } else if (cleanName.length > USER_RULES.NAME_MAX) {
    errors.name = `Name cannot exceed ${USER_RULES.NAME_MAX} characters`;
  }

  // email
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (typeof email !== 'string' || !cleanEmail) {
    errors.email = 'Email is required';
  } else if (cleanEmail.length > USER_RULES.EMAIL_MAX || !EMAIL_REGEX.test(cleanEmail)) {
    errors.email = 'Please provide a valid email address';
  }

  // password (never trimmed — whitespace may be intentional)
  if (typeof password !== 'string' || password.length === 0) {
    errors.password = 'Password is required';
  } else if (password.length < USER_RULES.PASSWORD_MIN) {
    errors.password = `Password must be at least ${USER_RULES.PASSWORD_MIN} characters`;
  } else if (byteLength(password) > USER_RULES.PASSWORD_MAX_BYTES) {
    errors.password = `Password cannot exceed ${USER_RULES.PASSWORD_MAX_BYTES} bytes`;
  }

  return {
    errors: Object.keys(errors).length ? errors : null,
    value: { name: cleanName, email: cleanEmail, password },
  };
};

/**
 * Validates the login payload. Deliberately does NOT apply registration
 * strength rules (min length), so rule changes never lock out existing users;
 * it only checks shape and the bcrypt input limit.
 *
 * @returns {{ errors: Record<string, string> | null, value: { email: string, password: string } }}
 */
export const validateLogin = (body = {}) => {
  const errors = {};
  const { email, password } = body;

  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (typeof email !== 'string' || !cleanEmail) {
    errors.email = 'Email is required';
  } else if (cleanEmail.length > USER_RULES.EMAIL_MAX || !EMAIL_REGEX.test(cleanEmail)) {
    errors.email = 'Please provide a valid email address';
  }

  if (typeof password !== 'string' || password.length === 0) {
    errors.password = 'Password is required';
  } else if (byteLength(password) > USER_RULES.PASSWORD_MAX_BYTES) {
    errors.password = `Password cannot exceed ${USER_RULES.PASSWORD_MAX_BYTES} bytes`;
  }

  return {
    errors: Object.keys(errors).length ? errors : null,
    value: { email: cleanEmail, password },
  };
};

