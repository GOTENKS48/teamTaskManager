require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-do-not-use-in-prod',
  jwtExpiresIn: '7d',
  bcryptSaltRounds: 12,
};

// Validate required env vars
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set. Please check your .env file.');
  process.exit(1);
}

if (process.env.JWT_SECRET === undefined) {
  console.warn('⚠️  JWT_SECRET is not set. Using fallback (NOT safe for production).');
}

module.exports = config;
