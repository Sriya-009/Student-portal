const appConfig = Object.freeze({
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: '1h',
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS || 10),
  defaultAdminIdentifier: process.env.DEFAULT_ADMIN_IDENTIFIER || '',
  defaultAdminPassword: process.env.DEFAULT_ADMIN_PASSWORD || '',
  otpSessionTtlMs: 5 * 60 * 1000,
  maxOtpAttempts: 5
});

module.exports = appConfig;
