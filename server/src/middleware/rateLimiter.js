import rateLimit from 'express-rate-limit';

/**
 * Brute-force protection for login: 10 failed attempts per IP per 15 minutes.
 * Successful logins don't count toward the limit.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in 15 minutes.',
  },
});

