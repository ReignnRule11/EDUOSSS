export interface AppConfig {
  nodeEnv: string;
  port: number;
  globalPrefix: string;
  trustProxy: string;
  corsOrigins: string[];
  databaseUrl: string;
  redisUrl: string;
  cacheTtlSeconds: number;
  tenantResolutionModes: string;
  platformApexDomains: string;
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessExpiresIn: string;
    refreshExpiresIn: string;
  };
  auth: {
    requireEmailVerification: boolean;
    maxLoginAttempts: number;
    lockoutMs: number;
    passwordResetTtlSeconds: number;
    emailVerificationTtlSeconds: number;
    mfaEnabled: boolean;
    mfaIssuer: string;
    mfaWindowSeconds: number;
    mfaBackupCodeCount: number;
    publicBaseUrl: string;
  };
  mail: {
    from: string;
    host: string;
    port: number;
    user: string;
    pass: string;
    secure: boolean;
    enabled: boolean;
  };
  throttle: {
    ttlMs: number;
    limit: number;
    authTtlMs: number;
    authLimit: number;
  };
  storage: {
    driver: "local" | "s3";
    localRoot: string;
    s3: {
      endpoint: string;
      region: string;
      bucket: string;
      accessKeyId: string;
      secretAccessKey: string;
      forcePathStyle: boolean;
    };
  };
  swagger: {
    enabled: boolean;
    path: string;
  };
}

/**
 * Fail-fast production guard. Rejects known/default credentials or unsafe
 * configurations so a production deployment can never silently run on
 * development secrets.
 */
export function validateProductionConfig(): void {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  if (nodeEnv !== "production") return;

  const access = process.env.JWT_ACCESS_SECRET ?? "";
  const refresh = process.env.JWT_REFRESH_SECRET ?? "";
  if (
    access.length < 32 ||
    refresh.length < 32 ||
    access === "dev-access-secret" ||
    refresh === "dev-refresh-secret" ||
    access === refresh
  ) {
    throw new Error(
      "Production requires strong, distinct JWT_ACCESS_SECRET and JWT_REFRESH_SECRET (>= 32 chars)",
    );
  }

  const cors = (process.env.CORS_ORIGINS ?? "").split(",").map((o) => o.trim());
  if (cors.includes("*") || cors.length === 0) {
    throw new Error(
      "Production requires explicit CORS_ORIGINS (wildcard '*' is not allowed)",
    );
  }

  const s3AccessKey = process.env.S3_ACCESS_KEY_ID ?? "";
  const s3Secret = process.env.S3_SECRET_ACCESS_KEY ?? "";
  if (
    process.env.STORAGE_DRIVER === "s3" &&
    (s3AccessKey === "minioadmin" || s3Secret === "minioadmin")
  ) {
    throw new Error("Production S3 storage requires non-default credentials");
  }

  if (process.env.AUTH_REQUIRE_EMAIL_VERIFICATION === "false") {
    throw new Error(
      "Production requires AUTH_REQUIRE_EMAIL_VERIFICATION=true for self-registration",
    );
  }
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3001),
  globalPrefix: process.env.API_GLOBAL_PREFIX ?? "api/v1",
  trustProxy: process.env.TRUST_PROXY ?? "false",
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim()),
  databaseUrl: process.env.DATABASE_URL ?? "",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS ?? 60),
  tenantResolutionModes:
    process.env.TENANT_RESOLUTION_MODES ?? "header,domain,subdomain",
  platformApexDomains:
    process.env.PLATFORM_APEX_DOMAINS ?? "monkeycode-ai.live",
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret",
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret",
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
  },
  auth: {
    requireEmailVerification:
      (process.env.AUTH_REQUIRE_EMAIL_VERIFICATION ?? "false") === "true",
    maxLoginAttempts: Number(process.env.AUTH_MAX_LOGIN_ATTEMPTS ?? 5),
    lockoutMs: Number(process.env.AUTH_LOCKOUT_MS ?? 900000),
    passwordResetTtlSeconds: Number(
      process.env.PASSWORD_RESET_TTL_SECONDS ?? 3600,
    ),
    emailVerificationTtlSeconds: Number(
      process.env.EMAIL_VERIFY_TTL_SECONDS ?? 86400,
    ),
    mfaEnabled: (process.env.MFA_ENABLED ?? "true") === "true",
    mfaIssuer: process.env.MFA_ISSUER ?? "EduOS",
    mfaWindowSeconds: Number(process.env.MFA_WINDOW_SECONDS ?? 30),
    mfaBackupCodeCount: Number(process.env.MFA_BACKUP_CODE_COUNT ?? 10),
    publicBaseUrl: process.env.AUTH_PUBLIC_BASE_URL ?? "http://localhost:3000",
  },
  mail: {
    from: process.env.EMAIL_FROM ?? "EduOS <no-reply@eduos.local>",
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    secure: (process.env.SMTP_SECURE ?? "false") === "true",
    enabled: Boolean(process.env.SMTP_HOST),
  },
  throttle: {
    ttlMs: Number(process.env.THROTTLE_TTL_MS ?? 60000),
    limit: Number(process.env.THROTTLE_LIMIT ?? 100),
    authTtlMs: Number(process.env.THROTTLE_AUTH_TTL_MS ?? 900000),
    authLimit: Number(process.env.THROTTLE_AUTH_LIMIT ?? 10),
  },
  storage: {
    driver: (process.env.STORAGE_DRIVER as "local" | "s3") ?? "local",
    localRoot: process.env.STORAGE_LOCAL_ROOT ?? "storage",
    s3: {
      endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9000",
      region: process.env.S3_REGION ?? "us-east-1",
      bucket: process.env.S3_BUCKET ?? "eduos",
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "minioadmin",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "minioadmin",
      forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? "true") === "true",
    },
  },
  swagger: {
    // Swagger is OFF by default in production; developers may opt in.
    enabled:
      (process.env.SWAGGER_ENABLED ??
        (process.env.NODE_ENV === "production" ? "false" : "true")) === "true",
    path: process.env.SWAGGER_PATH ?? "docs",
  },
});
