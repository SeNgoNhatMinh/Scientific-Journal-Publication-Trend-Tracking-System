require('dotenv').config();

/**
 * Environment Configuration
 * Centralized configuration management
 */

const sanitizeEnv = value => {
  if (value == null || typeof value !== 'string') return value;
  return value.trim().replace(/^["']|["']$/g, '');
};

const envConfig = {
  // Server
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Database
  MONGODB_URI: sanitizeEnv(process.env.MONGODB_URI),

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'default-secret-key',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',

  // APIs
  OPENALEX_API_URL: process.env.OPENALEX_API_URL || 'https://api.openalex.org',
  /** OpenAlex polite pool — thêm mailto vào mọi request (nhanh/ổn định hơn) */
  OPENALEX_MAILTO:
    process.env.OPENALEX_MAILTO || process.env.CROSSREF_MAILTO || 'youremail@gmail.com',
  EXTERNAL_API_TIMEOUT_MS:
    parseInt(process.env.EXTERNAL_API_TIMEOUT_MS, 10) ||
    (process.env.NODE_ENV === 'production' ? 90000 : 30000),
  SEMANTIC_SCHOLAR_API_URL:
    process.env.SEMANTIC_SCHOLAR_API_URL || 'https://api.semanticscholar.org/graph/v1',
  SEMANTIC_SCHOLAR_API_KEY: process.env.SEMANTIC_SCHOLAR_API_KEY || '',
  CROSSREF_API_URL: process.env.CROSSREF_API_URL || 'https://api.crossref.org',
  CROSSREF_MAILTO: process.env.CROSSREF_MAILTO || 'youremail@gmail.com',
  IEEE_API_URL: process.env.IEEE_API_URL || 'https://ieeexploreapi.ieee.org',
  IEEE_API_KEY: process.env.IEEE_API_KEY || '',
  EXA_API_URL: process.env.EXA_API_URL || 'https://api.exa.ai',
  EXA_API_KEY: process.env.EXA_API_KEY || '',
  AI_SERVICE_URL: sanitizeEnv(process.env.AI_SERVICE_URL) || 'http://localhost:8000',

  // CORS (nhiều origin cách nhau bởi dấu phẩy)
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',

  // URL public API (Swagger + FE); Railway: https://${RAILWAY_PUBLIC_DOMAIN}
  PUBLIC_API_URL:
    process.env.PUBLIC_API_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : ''),

  // Validation
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
};

// Validate required environment variables
const requiredEnvs = ['MONGODB_URI', 'JWT_SECRET'];

const missingEnvs = requiredEnvs.filter(env => !process.env[env]);
if (missingEnvs.length > 0 && envConfig.isProduction) {
  throw new Error(`Missing required environment variables: ${missingEnvs.join(', ')}`);
}

module.exports = envConfig;
