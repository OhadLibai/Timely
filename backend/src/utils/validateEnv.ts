// backend/src/utils/validateEnv.ts
// Environment variable validation to ensure proper configuration

import logger from '@/utils/logger';

interface EnvConfig {
  // Database
  POSTGRES_USER: string;
  POSTGRES_PASSWORD: string;
  POSTGRES_DB: string;
  DB_HOST: string;
  DB_PORT: number;

  // JWT Authentication
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_TOKEN_EXPIRY: string;

  // Service URLs
  ML_SERVICE_URL: string;
  FRONTEND_URL: string;

  // Application
  NODE_ENV: string;
  PORT: number;

  // Security
  BCRYPT_ROUNDS: number;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  MIN_PASSWORD_LENGTH: number;
}

const requiredEnvVars = [
  'POSTGRES_USER',
  'POSTGRES_PASSWORD', 
  'POSTGRES_DB',
  'DB_HOST',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'ML_SERVICE_URL',
  'FRONTEND_URL'
];

const validateEnvironmentVariables = (): EnvConfig => {
  const missing: string[] = [];
  const invalid: Array<{ key: string; value: any; reason: string }> = [];

  // Check for missing required variables
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    logger.error('Missing required environment variables:', missing);
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate and parse environment variables
  const config: Partial<EnvConfig> = {};

  // String validations
  config.POSTGRES_USER = process.env.POSTGRES_USER!;
  config.POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD!;
  config.POSTGRES_DB = process.env.POSTGRES_DB!;
  config.DB_HOST = process.env.DB_HOST!;
  config.ML_SERVICE_URL = process.env.ML_SERVICE_URL!;
  config.FRONTEND_URL = process.env.FRONTEND_URL!;

  // JWT Secret validations
  config.JWT_SECRET = process.env.JWT_SECRET!;
  config.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
  
  if (config.JWT_SECRET.length < 32) {
    invalid.push({
      key: 'JWT_SECRET',
      value: config.JWT_SECRET.length,
      reason: 'JWT_SECRET must be at least 32 characters long'
    });
  }

  if (config.JWT_REFRESH_SECRET.length < 32) {
    invalid.push({
      key: 'JWT_REFRESH_SECRET',
      value: config.JWT_REFRESH_SECRET.length,
      reason: 'JWT_REFRESH_SECRET must be at least 32 characters long'
    });
  }

  // Number validations with defaults
  config.DB_PORT = parseInt(process.env.DB_PORT || '5432');
  if (isNaN(config.DB_PORT) || config.DB_PORT < 1 || config.DB_PORT > 65535) {
    invalid.push({
      key: 'DB_PORT',
      value: process.env.DB_PORT,
      reason: 'DB_PORT must be a valid port number (1-65535)'
    });
  }

  config.PORT = parseInt(process.env.PORT || '5000');
  if (isNaN(config.PORT) || config.PORT < 1 || config.PORT > 65535) {
    invalid.push({
      key: 'PORT',
      value: process.env.PORT,
      reason: 'PORT must be a valid port number (1-65535)'
    });
  }

  config.BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');
  if (isNaN(config.BCRYPT_ROUNDS) || config.BCRYPT_ROUNDS < 10 || config.BCRYPT_ROUNDS > 15) {
    invalid.push({
      key: 'BCRYPT_ROUNDS',
      value: process.env.BCRYPT_ROUNDS,
      reason: 'BCRYPT_ROUNDS must be between 10 and 15'
    });
  }

  config.RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000');
  if (isNaN(config.RATE_LIMIT_WINDOW_MS) || config.RATE_LIMIT_WINDOW_MS < 60000) {
    invalid.push({
      key: 'RATE_LIMIT_WINDOW_MS',
      value: process.env.RATE_LIMIT_WINDOW_MS,
      reason: 'RATE_LIMIT_WINDOW_MS must be at least 60000 (1 minute)'
    });
  }

  config.RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');
  if (isNaN(config.RATE_LIMIT_MAX_REQUESTS) || config.RATE_LIMIT_MAX_REQUESTS < 1) {
    invalid.push({
      key: 'RATE_LIMIT_MAX_REQUESTS',
      value: process.env.RATE_LIMIT_MAX_REQUESTS,
      reason: 'RATE_LIMIT_MAX_REQUESTS must be at least 1'
    });
  }

  config.MIN_PASSWORD_LENGTH = parseInt(process.env.MIN_PASSWORD_LENGTH || '8');
  if (isNaN(config.MIN_PASSWORD_LENGTH) || config.MIN_PASSWORD_LENGTH < 6) {
    invalid.push({
      key: 'MIN_PASSWORD_LENGTH',
      value: process.env.MIN_PASSWORD_LENGTH,
      reason: 'MIN_PASSWORD_LENGTH must be at least 6'
    });
  }

  // String validations with defaults
  config.NODE_ENV = process.env.NODE_ENV || 'development';
  if (!['development', 'test', 'production'].includes(config.NODE_ENV)) {
    invalid.push({
      key: 'NODE_ENV',
      value: config.NODE_ENV,
      reason: 'NODE_ENV must be one of: development, test, production'
    });
  }

  config.JWT_ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_TOKEN_EXPIRY || '8h';
  if (!/^(\d+[smhd]?|forever)$/.test(config.JWT_ACCESS_TOKEN_EXPIRY)) {
    invalid.push({
      key: 'JWT_ACCESS_TOKEN_EXPIRY',
      value: config.JWT_ACCESS_TOKEN_EXPIRY,
      reason: 'JWT_ACCESS_TOKEN_EXPIRY must be a valid time format (e.g., 15m, 8h, 1d)'
    });
  }

  // URL validations
  try {
    new URL(config.ML_SERVICE_URL);
  } catch {
    invalid.push({
      key: 'ML_SERVICE_URL',
      value: config.ML_SERVICE_URL,
      reason: 'ML_SERVICE_URL must be a valid URL'
    });
  }

  try {
    new URL(config.FRONTEND_URL);
  } catch {
    invalid.push({
      key: 'FRONTEND_URL',
      value: config.FRONTEND_URL,
      reason: 'FRONTEND_URL must be a valid URL'
    });
  }

  if (invalid.length > 0) {
    logger.error('Invalid environment variables:', invalid);
    throw new Error(`Invalid environment variables: ${invalid.map(i => `${i.key} (${i.reason})`).join(', ')}`);
  }

  // Security warnings for development
  if (config.NODE_ENV === 'development') {
    if (config.JWT_SECRET.includes('change-this') || config.JWT_SECRET.includes('your-')) {
      logger.warn('⚠️  Using default JWT_SECRET - change this for production!');
    }
    if (config.POSTGRES_PASSWORD.includes('password')) {
      logger.warn('⚠️  Using weak database password - change this for production!');
    }
  }

  logger.info('✅ Environment variables validated successfully', {
    nodeEnv: config.NODE_ENV,
    dbHost: config.DB_HOST,
    port: config.PORT,
    jwtExpiry: config.JWT_ACCESS_TOKEN_EXPIRY
  });

  return config as EnvConfig;
};

export { validateEnvironmentVariables, EnvConfig };