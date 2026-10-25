import { validateProductionConfig } from "./configuration";

describe("validateProductionConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.NODE_ENV = "production";
    process.env.JWT_ACCESS_SECRET = "a".repeat(40);
    process.env.JWT_REFRESH_SECRET = "b".repeat(40);
    process.env.CORS_ORIGINS = "https://app.example.com";
    process.env.STORAGE_DRIVER = "s3";
    process.env.S3_ACCESS_KEY_ID = "production-access-key";
    process.env.S3_SECRET_ACCESS_KEY = "production-secret-key";
    process.env.S3_BUCKET = "eduos-production";
    process.env.AUTH_REQUIRE_EMAIL_VERIFICATION = "true";
    process.env.AUTH_PUBLIC_BASE_URL = "https://app.example.com";
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.EMAIL_FROM = "EduOS <no-reply@example.com>";
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("accepts a complete production configuration", () => {
    expect(() => validateProductionConfig()).not.toThrow();
  });

  it("rejects missing email-verification enforcement", () => {
    delete process.env.AUTH_REQUIRE_EMAIL_VERIFICATION;
    expect(() => validateProductionConfig()).toThrow(
      "AUTH_REQUIRE_EMAIL_VERIFICATION=true",
    );
  });

  it("rejects local file storage in production", () => {
    process.env.STORAGE_DRIVER = "local";
    expect(() => validateProductionConfig()).toThrow(
      "STORAGE_DRIVER=s3",
    );
  });

  it("rejects HTTP CORS origins in production", () => {
    process.env.CORS_ORIGINS = "http://app.example.com";
    expect(() => validateProductionConfig()).toThrow("HTTPS CORS_ORIGINS");
  });

  it("rejects missing SMTP configuration when email verification is mandatory", () => {
    delete process.env.SMTP_HOST;
    expect(() => validateProductionConfig()).toThrow("SMTP_HOST");
  });

  it("rejects an HTTP public authentication URL", () => {
    process.env.AUTH_PUBLIC_BASE_URL = "http://app.example.com";
    expect(() => validateProductionConfig()).toThrow(
      "HTTPS AUTH_PUBLIC_BASE_URL",
    );
  });
});
