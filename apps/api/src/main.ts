import { join } from "path";

import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import compression from "compression";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";

import { AppModule } from "./app.module";
import { ValidationFailedException } from "./common/exceptions/business.exceptions";
import { validateProductionConfig } from "./config/configuration";

async function bootstrap(): Promise<void> {
  // Fail fast on unsafe production configuration (secrets, CORS, S3, email).
  validateProductionConfig();
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  // Graceful shutdown: handle SIGTERM/SIGINT so in-flight requests drain and
  // DB/Redis connections close cleanly before the process exits.
  app.enableShutdownHooks();
  const config = app.get(ConfigService);
  const logger = new Logger("Bootstrap");

  const globalPrefix = config.get<string>("globalPrefix") ?? "api/v1";
  app.setGlobalPrefix(globalPrefix);

  // Prisma BigInt fields (e.g. Tenant.storageUsed/storageQuota) must be
  // serialized as strings or JSON.stringify throws at runtime.
  const expressApp = app.getHttpAdapter().getInstance() as express.Express;
  expressApp.set("json replacer", (_key: string, value: unknown) =>
    typeof value === "bigint" ? value.toString() : value,
  );

  // Trust the configured reverse-proxy hop(s) so req.ip and req.headers.host
  // reflect the real client. Without this, rate limiting keys on the proxy IP
  // and tenant host resolution (subdomain/domain) breaks behind a proxy.
  const trustProxy = config.get<string>("trustProxy") ?? "false";
  if (trustProxy === "true" || trustProxy === "false") {
    expressApp.set("trust proxy", trustProxy === "true");
  } else {
    expressApp.set("trust proxy", trustProxy);
  }

  // ---- Security headers, compression, cookies ----
  // contentSecurityPolicy is disabled so the Swagger UI can load its assets;
  // the API does not serve user-generated HTML pages.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());
  app.use(cookieParser());

  // ---- CORS ----
  const corsOrigins = config.get<string[]>("corsOrigins") ?? [];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  // ---- Global validation ----
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      stopAtFirstError: false,
      exceptionFactory: (errors) => {
        const details = errors.map((error) => ({
          field: error.property,
          constraints: error.constraints ?? {},
          value: error.value,
        }));
        throw new ValidationFailedException(details);
      },
    }),
  );

  // ---- Serve locally-uploaded files at /storage ----
  // Development convenience only. In production, files are served exclusively
  // through the authenticated /files/:id/download endpoint, which enforces
  // auth, tenant isolation and object-level authorization.
  const isProduction = config.get<string>("nodeEnv") === "production";
  if (!isProduction && config.get<string>("storage.driver") === "local") {
    const localRoot = join(
      process.cwd(),
      config.get<string>("storage.localRoot") ?? "storage",
    );
    app.use("/storage", express.static(localRoot, { fallthrough: false }));
  }

  // ---- Swagger / OpenAPI ----
  if (config.get<boolean>("swagger.enabled")) {
    const swaggerPath = config.get<string>("swagger.path") ?? "docs";
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle("EduOS API")
        .setDescription(
          "Enterprise multi-tenant School Management System - REST API",
        )
        .setVersion("1.0.0")
        .addBearerAuth(
          {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            name: "Authorization",
            in: "header",
          },
          "access-token",
        )
        .addTag("Auth", "Authentication & token rotation")
        .addTag("Tenants", "Platform tenant catalog (super admin)")
        .addTag("Tenants - Onboarding", "Public tenant self-onboarding")
        .addTag("Tenant - Settings", "Current tenant self-service settings")
        .addTag("Users", "Tenant user management")
        .addTag("Schools", "School management")
        .addTag("Students", "Student records")
        .addTag("Teachers", "Teacher records")
        .addTag("Classes", "Class groups")
        .addTag("Subjects", "Subjects")
        .addTag("Enrollments", "Student-class enrollments")
        .addTag("Attendance", "Daily attendance")
        .addTag("Grades", "Academic grades")
        .addTag("Audit Logs", "Audit trail")
        .addTag("Files", "File uploads & storage")
        .addTag("Health", "Liveness & readiness probes")
        .build(),
      {
        operationIdFactory: (_controllerKey: string, methodKey: string) =>
          methodKey,
      },
    );
    SwaggerModule.setup(swaggerPath, app, document, {
      swaggerOptions: { persistAuthorization: true },
      customSiteTitle: "EduOS API Documentation",
    });
    logger.log(
      `Swagger available at http://localhost:${config.get<number>("port") ?? 3001}/${swaggerPath}`,
    );
  }

  const port = config.get<number>("port") ?? 3001;
  await app.listen(port);
  logger.log(`EduOS API running on http://localhost:${port}/${globalPrefix}`);
}

void bootstrap();
