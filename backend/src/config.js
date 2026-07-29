const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('FATAL: Defina JWT_SECRET com no mínimo 32 caracteres');
  process.exit(1);
}

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'humbertoadm';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) {
  console.error('FATAL: Defina ADMIN_PASSWORD com no mínimo 8 caracteres');
  process.exit(1);
}

const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
const PASSWORD_RULES = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
};
const LOGIN_RATE_LIMIT = { maxAttempts: 5, windowMs: 15 * 60 * 1000 };

module.exports = { JWT_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD, CORS_ORIGIN, PASSWORD_RULES, LOGIN_RATE_LIMIT };
