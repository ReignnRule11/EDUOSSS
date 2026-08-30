import * as Joi from "joi";

/**
 * Validates required environment variables at bootstrap.
 * The application refuses to start with an invalid configuration.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),
  PORT: Joi.number().default(3001),
  API_GLOBAL_PREFIX: Joi.string().default("api/v1"),
  TRUST_PROXY: Joi.string().default("false"),
  CORS_ORIGINS: Joi.string().default("http://localhost:3000"),
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().default("redis://localhost:6379"),
  CACHE_TTL_SECONDS: Joi.number().default(60),
  TENANT_RESOLUTION_MODES: Joi.string().default("header,domain,subdomain"),
  PLATFORM_APEX_DOMAINS: Joi.string().default("monkeycode-ai.live"),
  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default("7d"),
  AUTH_REQUIRE_EMAIL_VERIFICATION: Joi.boolean().default(false),
  AUTH_MAX_LOGIN_ATTEMPTS: Joi.number().default(5),
  AUTH_LOCKOUT_MS: Joi.number().default(900000),
  PASSWORD_RESET_TTL_SECONDS: Joi.number().default(3600),
  EMAIL_VERIFY_TTL_SECONDS: Joi.number().default(86400),
  MFA_ENABLED: Joi.boolean().default(true),
  MFA_ISSUER: Joi.string().default("EduOS"),
  MFA_WINDOW_SECONDS: Joi.number().default(30),
  MFA_BACKUP_CODE_COUNT: Joi.number().default(10),
  AUTH_PUBLIC_BASE_URL: Joi.string().default("http://localhost:3000"),
  EMAIL_FROM: Joi.string().default("EduOS <no-reply@eduos.local>"),
  SMTP_HOST: Joi.string().allow("").optional(),
  SMTP_PORT: Joi.number().default(587),
  SMTP_USER: Joi.string().allow("").optional(),
  SMTP_PASS: Joi.string().allow("").optional(),
  SMTP_SECURE: Joi.boolean().default(false),
  THROTTLE_TTL_MS: Joi.number().default(60000),
  THROTTLE_LIMIT: Joi.number().default(100),
  THROTTLE_AUTH_TTL_MS: Joi.number().default(900000),
  THROTTLE_AUTH_LIMIT: Joi.number().default(10),
  STORAGE_DRIVER: Joi.string().valid("local", "s3").default("local"),
  STORAGE_LOCAL_ROOT: Joi.string().default("storage"),
  S3_ENDPOINT: Joi.string().optional(),
  S3_REGION: Joi.string().default("us-east-1"),
  S3_BUCKET: Joi.string().optional(),
  S3_ACCESS_KEY_ID: Joi.string().optional(),
  S3_SECRET_ACCESS_KEY: Joi.string().optional(),
  SWAGGER_ENABLED: Joi.boolean().optional(),
  SWAGGER_PATH: Joi.string().default("docs"),
});
