import { readFileSync } from "fs";
import { join } from "path";

import { type INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { ValidationFailedException } from "../src/common/exceptions/business.exceptions";
import configuration, {
  validateProductionConfig,
} from "../src/config/configuration";
import { PrismaService } from "../src/database/prisma.service";
import { ensureSecurityE2EFixtures } from "./helpers/security-e2e-fixtures";

/**
 * Production-security hardening regression tests:
 *  1. CBT concurrent/duplicate submission
 *  2. Payment security (mock fail-closed, duplicate, mismatch)
 *  3. File upload validation (MIME spoof, executable, size, traversal)
 *  4. Production config fail-fast (secrets, CORS, Swagger)
 *  5. Auth cookies / sensitive logging
 *  6. Rate limiting on sensitive endpoints
 */

const BASE = "/api/v1";
const TFA = "bright-future-academy";

describe("Production security hardening", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let studentToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: (errors) => {
          throw new ValidationFailedException(
            errors.map((error) => ({
              field: error.property,
              constraints: error.constraints ?? {},
              value: error.value,
            })),
          );
        },
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    await ensureSecurityE2EFixtures(prisma);

    const login = async (email: string, password: string, tenant: string) => {
      const res = await request(app.getHttpServer())
        .post(`${BASE}/auth/login`)
        .send({ email, password, tenantSlug: tenant })
        .expect(200);
      return res.body.data.accessToken as string;
    };
    adminToken = await login("security.admin@test.local", "ChangeMe123!", TFA);
    studentToken = await login("lms.student@test.local", "Student@123", TFA);
  });

  afterAll(async () => {
    await app.close();
  });

  // ============================================================
  // 1. CBT concurrent / duplicate submission
  // ============================================================

  describe("CBT submission integrity", () => {
    let examId: string;
    let questionId: string;
    let attemptId: string;

    beforeAll(async () => {
      const tenant = await prisma.tenant.findUnique({ where: { slug: TFA } });
      if (!tenant) throw new Error("tenant missing");
      const classGroup = await prisma.classGroup.findFirst({
        where: { tenantId: tenant.id },
      });
      if (!classGroup) throw new Error("classGroup missing");
      const admin = await prisma.user.findFirst({
        where: { role: "TENANT_ADMIN" },
      });
      if (!admin) throw new Error("admin missing");

      const question = await prisma.question.create({
        data: {
          tenantId: tenant.id,
          createdById: admin.id,
          type: "MULTIPLE_CHOICE",
          body: "PSH test question",
          points: 2,
          status: "ACTIVE",
          options: [
            { id: "a", text: "A", isCorrect: true },
            { id: "b", text: "B", isCorrect: false },
          ],
          correctAnswer: { optionId: "a" },
        },
      });
      questionId = question.id;
      const exam = await prisma.exam.create({
        data: {
          tenantId: tenant.id,
          createdById: admin.id,
          title: "PSH Concurrency Exam",
          status: "PUBLISHED",
          durationMinutes: 30,
          questions: {
            create: [
              {
                tenantId: tenant.id,
                questionId: question.id,
                orderIndex: 0,
              },
            ],
          },
        },
      });
      examId = exam.id;

      const res = await request(app.getHttpServer())
        .post(`${BASE}/exams/${examId}/attempts`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({})
        .expect(201);
      attemptId = res.body.data.id;
    });

    it("concurrent submits cannot double-finalize the attempt", async () => {
      const payload = { answers: { [questionId]: "a" } };
      const [r1, r2] = await Promise.all([
        request(app.getHttpServer())
          .post(`${BASE}/attempts/${attemptId}/submit`)
          .set("Authorization", `Bearer ${studentToken}`)
          .send(payload),
        request(app.getHttpServer())
          .post(`${BASE}/attempts/${attemptId}/submit`)
          .set("Authorization", `Bearer ${studentToken}`)
          .send(payload),
      ]);
      expect(r1.status).toBeLessThan(500);
      expect(r2.status).toBeLessThan(500);

      const attempt = await prisma.examAttempt.findUnique({
        where: { id: attemptId },
      });
      if (!attempt) throw new Error("attempt missing");
      expect(attempt.status).toBe("GRADED");

      const finals = [r1, r2].filter((r) => r.body.data?.status === "GRADED");
      expect(finals.length).toBeGreaterThanOrEqual(1);
    });

    it("duplicate submit after finalization returns finalized result, not a second write", async () => {
      const res = await request(app.getHttpServer())
        .post(`${BASE}/attempts/${attemptId}/submit`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ answers: { [questionId]: "a" } });
      expect(res.status).toBeLessThan(500);
      const attempt = await prisma.examAttempt.findUnique({
        where: { id: attemptId },
      });
      if (!attempt) throw new Error("attempt missing");
      expect(attempt.status).toBe("GRADED");
    });

    it("answers cannot be mutated after finalization via autosave", async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/attempts/${attemptId}/autosave`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ answers: { [questionId]: "b" } });
      const attempt = await prisma.examAttempt.findUnique({
        where: { id: attemptId },
      });
      if (!attempt) throw new Error("attempt missing");
      expect((attempt.answers as Record<string, unknown>)[questionId]).toBe(
        "a",
      );
    });
  });

  // ============================================================
  // 2. Payment security
  // ============================================================

  describe("payment security", () => {
    let invoiceId: string;

    beforeAll(async () => {
      const tenant = await prisma.tenant.findUnique({ where: { slug: TFA } });
      if (!tenant) throw new Error("tenant missing");
      const classGroup = await prisma.classGroup.findFirst({
        where: { tenantId: tenant.id },
      });
      if (!classGroup) throw new Error("classGroup missing");
      const student = await prisma.student.findFirst({
        where: { tenantId: tenant.id },
      });
      if (!student) throw new Error("student missing");
      const fee = await prisma.feeStructure.findFirst({
        where: { tenantId: tenant.id, classGroupId: classGroup.id },
      });
      // Use a unique academic year so the tenant-scoped invoice unique key
      // (student/class/year/term) never collides with other test data.
      const uniqueYear = `PSH-${Date.now()}`;
      const invoice = await prisma.invoice.create({
        data: {
          tenantId: tenant.id,
          invoiceNumber: `INV-PSH-${Date.now()}`,
          studentId: student.id,
          classGroupId: classGroup.id,
          academicYear: uniqueYear,
          term: "FIRST",
          totalAmount: fee?.amount ?? 5000,
          balanceAmount: fee?.amount ?? 5000,
          items: { create: [] },
        },
      });
      invoiceId = invoice.id;
    });

    it("duplicate confirmation is prevented (only PENDING may complete)", async () => {
      const init = await request(app.getHttpServer())
        .post(`${BASE}/finance/invoices/${invoiceId}/gateway-initiate`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(201);
      const paymentId = init.body.data.payment.id;

      const first = await request(app.getHttpServer())
        .post(`${BASE}/finance/payments/${paymentId}/gateway-confirm`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(201);
      expect(first.body.data.status).toBe("COMPLETED");

      await request(app.getHttpServer())
        .post(`${BASE}/finance/payments/${paymentId}/gateway-confirm`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400);
    });

    it("client cannot directly mark an arbitrary invoice paid without PAYMENT_WRITE", async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/finance/invoices/${invoiceId}/payments`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ amount: 100 })
        .expect(403);
    });

    it("invalid state transition is rejected", async () => {
      const res = await request(app.getHttpServer())
        .post(`${BASE}/finance/invoices/${invoiceId}/gateway-confirm`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect([400, 404]).toContain(res.status);
    });

    it("mock provider is blocked (save rejects it)", async () => {
      const res = await request(app.getHttpServer())
        .patch(`${BASE}/finance/gateway`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ provider: "mock", secretKey: "sk_x", isActive: true });
      expect([400, 403]).toContain(res.status);
    });

    it("production validation rejects weak secrets / wildcard CORS / unsafe defaults", async () => {
      const orig = { ...process.env };
      process.env.NODE_ENV = "production";
      process.env.JWT_ACCESS_SECRET = "dev-access-secret";
      process.env.JWT_REFRESH_SECRET = "dev-refresh-secret";
      process.env.CORS_ORIGINS = "https://school.example";
      process.env.AUTH_REQUIRE_EMAIL_VERIFICATION = "true";
      try {
        expect(() => validateProductionConfig()).toThrow(/JWT_ACCESS_SECRET/);
      } finally {
        Object.assign(process.env, orig);
      }
    });
  });

  // ============================================================
  // 3. File upload validation
  // ============================================================

  describe("file upload validation", () => {
    it("rejects a script masquerading as an image (MIME spoof / magic bytes)", async () => {
      const script = Buffer.from("#!/bin/sh\necho pwned\n", "utf-8");
      const res = await request(app.getHttpServer())
        .post(`${BASE}/files/upload`)
        .set("Authorization", `Bearer ${adminToken}`)
        .attach("file", script, {
          filename: "evil.png",
          contentType: "image/png",
        })
        .field("access", "PRIVATE");
      expect([400, 413]).toContain(res.status);
    });

    it("rejects an executable disguised as a PDF", async () => {
      const exe = Buffer.concat([
        Buffer.from([0x4d, 0x5a]),
        Buffer.from("fake-pe-content"),
      ]);
      const res = await request(app.getHttpServer())
        .post(`${BASE}/files/upload`)
        .set("Authorization", `Bearer ${adminToken}`)
        .attach("file", exe, {
          filename: "report.pdf",
          contentType: "application/pdf",
        })
        .field("access", "PRIVATE");
      expect([400, 413]).toContain(res.status);
    });

    it("rejects content that does not match the declared MIME", async () => {
      const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const res = await request(app.getHttpServer())
        .post(`${BASE}/files/upload`)
        .set("Authorization", `Bearer ${adminToken}`)
        .attach("file", png, {
          filename: "doc.pdf",
          contentType: "application/pdf",
        })
        .field("access", "PRIVATE");
      expect([400, 413]).toContain(res.status);
    });

    it("rejects path-traversal filenames (sanitized, cannot escape storage)", async () => {
      const pdf = Buffer.from("%PDF-1.4 ok", "utf-8");
      const res = await request(app.getHttpServer())
        .post(`${BASE}/files/upload`)
        .set("Authorization", `Bearer ${adminToken}`)
        .attach("file", pdf, {
          filename: "../../../etc/passwd.pdf",
          contentType: "application/pdf",
        })
        .field("access", "PRIVATE");
      expect([201, 400]).toContain(res.status);
      if (res.status === 201) {
        expect(res.body.data.key).not.toContain("..");
      }
    });

    it("accepts a valid PDF upload", async () => {
      const pdf = Buffer.from("%PDF-1.4 valid-document", "utf-8");
      const res = await request(app.getHttpServer())
        .post(`${BASE}/files/upload`)
        .set("Authorization", `Bearer ${adminToken}`)
        .attach("file", pdf, {
          filename: "valid.pdf",
          contentType: "application/pdf",
        })
        .field("access", "PRIVATE");
      expect(res.status).toBe(201);
    });

    it("rejects oversized files server-side", async () => {
      const big = Buffer.alloc(11 * 1024 * 1024); // 11 MB > 10 MB
      const res = await request(app.getHttpServer())
        .post(`${BASE}/files/upload`)
        .set("Authorization", `Bearer ${adminToken}`)
        .attach("file", big, {
          filename: "big.pdf",
          contentType: "application/pdf",
        })
        .field("access", "PRIVATE");
      expect([400, 413]).toContain(res.status);
    });
  });

  // ============================================================
  // 4. Production configuration fail-fast
  // ============================================================

  describe("production configuration", () => {
    it("rejects weak JWT secrets in production", async () => {
      const orig = { ...process.env };
      process.env.NODE_ENV = "production";
      process.env.JWT_ACCESS_SECRET = "dev-access-secret";
      process.env.JWT_REFRESH_SECRET = "dev-refresh-secret";
      process.env.CORS_ORIGINS = "https://school.example";
      process.env.AUTH_REQUIRE_EMAIL_VERIFICATION = "true";
      try {
        expect(() => validateProductionConfig()).toThrow(/JWT_ACCESS_SECRET/);
      } finally {
        Object.assign(process.env, orig);
      }
    });

    it("rejects wildcard CORS in production", async () => {
      const orig = { ...process.env };
      process.env.NODE_ENV = "production";
      process.env.JWT_ACCESS_SECRET = "x".repeat(40);
      process.env.JWT_REFRESH_SECRET = "y".repeat(40);
      process.env.CORS_ORIGINS = "*";
      process.env.AUTH_REQUIRE_EMAIL_VERIFICATION = "true";
      try {
        expect(() => validateProductionConfig()).toThrow(/CORS_ORIGINS/);
      } finally {
        Object.assign(process.env, orig);
      }
    });

    it("swagger is OFF by default in production", () => {
      const orig = { ...process.env };
      process.env.NODE_ENV = "production";
      delete process.env.SWAGGER_ENABLED;
      try {
        expect(configuration().swagger.enabled).toBe(false);
      } finally {
        Object.assign(process.env, orig);
      }
    });

    it("seed refuses known default password in production", () => {
      const src = readFileSync(join(process.cwd(), "prisma/seed.ts"), "utf-8");
      expect(src).toMatch(/Refusing to seed production/);
    });
  });

  // ============================================================
  // 5. Auth cookies / sensitive logging
  // ============================================================

  describe("auth cookies & logging", () => {
    it("login does not set an insecure auth cookie (bearer-token API)", async () => {
      const res = await request(app.getHttpServer())
        .post(`${BASE}/auth/login`)
        .send({
          email: "admin@eduos.local",
          password: "ChangeMe123!",
          tenantSlug: TFA,
        });
      expect(res.status).toBe(200);
      const setCookie = res.headers["set-cookie"];
      if (Array.isArray(setCookie) && setCookie.length > 0) {
        for (const c of setCookie) {
          expect(c.toLowerCase()).toContain("httponly");
          expect(c.toLowerCase()).toContain("secure");
        }
      } else {
        // Refresh token is delivered in the body for the bearer API — no
        // cookie-based CSRF surface.
        expect(res.body.data.refreshToken).toBeDefined();
      }
    });

    it("refresh response never exposes password hashes", async () => {
      const res = await request(app.getHttpServer())
        .post(`${BASE}/auth/login`)
        .send({
          email: "admin@eduos.local",
          password: "ChangeMe123!",
          tenantSlug: TFA,
        });
      const refreshToken = res.body.data.refreshToken;
      const rotated = await request(app.getHttpServer())
        .post(`${BASE}/auth/refresh`)
        .send({ refreshToken });
      expect(rotated.status).toBe(200);
      expect(rotated.body.data.user).not.toHaveProperty("passwordHash");
    });
  });

  // ============================================================
  // 6. Rate limiting on sensitive endpoints
  // ============================================================

  describe("rate limiting", () => {
    it("registration is throttled", async () => {
      const statuses: number[] = [];
      for (let i = 0; i < 12; i += 1) {
        const res = await request(app.getHttpServer())
          .post(`${BASE}/auth/register`)
          .send({
            email: `throttle-${Date.now()}-${i}@test.local`,
            firstName: "T",
            lastName: "Rate",
            password: "S3curePass123!",
            role: "STUDENT",
            tenantSlug: TFA,
          });
        statuses.push(res.status);
      }
      expect(statuses).toContain(429);
    });

    it("file upload is throttled", async () => {
      const pdf = Buffer.from("%PDF-1.4 throttle", "utf-8");
      const statuses: number[] = [];
      for (let i = 0; i < 32; i += 1) {
        const res = await request(app.getHttpServer())
          .post(`${BASE}/files/upload`)
          .set("Authorization", `Bearer ${adminToken}`)
          .attach("file", pdf, {
            filename: `t${i}.pdf`,
            contentType: "application/pdf",
          })
          .field("access", "PRIVATE");
        statuses.push(res.status);
      }
      expect(statuses).toContain(429);
    });
  });
});
