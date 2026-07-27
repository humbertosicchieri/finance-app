const JWT_SECRET = process.env.JWT_SECRET || 'financeflow-secret-key-2024';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_RULES = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
};

const LOGIN_RATE_LIMIT = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
};

module.exports = { JWT_SECRET, PASSWORD_MIN_LENGTH, PASSWORD_RULES, LOGIN_RATE_LIMIT };
