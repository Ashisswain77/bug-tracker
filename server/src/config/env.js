import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const fail = (...lines) => {
  lines.forEach((line) => console.error(`[config] ${line}`));
  process.exit(1);
};

const REQUIRED_VARS = ['MONGODB_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  fail(
    `Missing required environment variables: ${missing.join(', ')}`,
    'Copy server/.env.example to server/.env and fill in the values.'
  );
}

// --- JWT ---------------------------------------------------------------------
const MIN_SECRET_LENGTH = 32;
const DURATION_REGEX = /^\d+[smhd]$/; // e.g. 15m, 12h, 7d — unit required to avoid ms/seconds ambiguity

for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
  if (process.env[key].length < MIN_SECRET_LENGTH) {
    fail(
      `${key} must be at least ${MIN_SECRET_LENGTH} characters.`,
      `Generate one with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
    );
  }
}
if (process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) {
  fail('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different values.');
}

const jwtAccessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
for (const [key, value] of [
  ['JWT_ACCESS_EXPIRES_IN', jwtAccessExpiresIn],
  ['JWT_REFRESH_EXPIRES_IN', jwtRefreshExpiresIn],
]) {
  if (!DURATION_REGEX.test(value)) fail(`${key} must look like 15m, 12h or 7d (got "${value}").`);
}

// --- Cookies -----------------------------------------------------------------
const isProduction = process.env.NODE_ENV === 'production';
const cookieSameSite = (process.env.COOKIE_SAME_SITE || 'strict').toLowerCase();
if (!['strict', 'lax', 'none'].includes(cookieSameSite)) {
  fail(`COOKIE_SAME_SITE must be strict, lax or none (got "${cookieSameSite}").`);
}

const env = Object.freeze({
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  isProduction,

  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtAccessExpiresIn,
  jwtRefreshExpiresIn,

  cookieSameSite,
  // SameSite=None is only accepted by browsers on Secure cookies.
  cookieSecure: isProduction || cookieSameSite === 'none',
});

export default env;
