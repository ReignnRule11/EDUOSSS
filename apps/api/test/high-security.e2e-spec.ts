import { type INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as bcrypt from "bcryptjs";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { ensureSecurityE2EFixtures } from "./helpers/security-e2e-fixtures";
import { ValidationFailedException } from "../src/common/exceptions/business.exceptions";
import { PrismaService } from "../src/database/prisma.service";
import { RedisService } from "../src/database/redis.service";

/**
 * HIGH-risk security regression tests:
 *   H7.1 TENANT_ADMIN privilege escalation
 *   H7.2 stale JWT permissions / revocation
 *   H7.4 deactivated tenant JWT fallback
 * plus confirmation that the C7.x critical fixes and cross-tenant isolation
 * remain intact.
 */

const BASE = "/api/v1";
const TFA = "bright-future-academy";
const SUNRISE = "sunrise-international";

describe("High security remediation (H7.x)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let adminToken: string; // TENANT_ADMIN of bright-future-academy
  let studentToken: string;
  let parentToken: string;
  let teacherToken: string;

  // Dedicated users created/removed within this suite.
  const testUsers: string[] = [];
  const restoredTenantIds: string[] = [];

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
    redis = app.get(RedisService);
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
    parentToken = await login("amina@sis.test", "Parent@123", TFA);
    teacherToken = await login("teacher@test.local", "Teacher@123", TFA);
  });

  afterAll(async () => {
    // Restore any tenant status changed by tests.
    for (const tenantId of restoredTenantIds) {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { status: "ACTIVE" },
      });
    }
    // Remove dedicated test users.
    for (const id of testUsers) {
      await prisma.userTenant.deleteMany({ where: { userId: id } });
      await prisma.user.deleteMany({ where: { id } });
    }
    await app.close();
  });

  /** Creates a user + membership directly in the DB (bypassing RBAC) for testing. */
  async function createUser(
    email: string,
    password: string,
    role: string,
    tenantSlug: string,
    opts: { mfaEnabled?: boolean } = {},
  ) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });
    if (!tenant) throw new Error(`tenant ${tenantSlug} not found`);
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email,
        passwordHash,
        firstName: "H7",
        lastName: "Test",
        role,
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
        mfaEnabled: opts.mfaEnabled ?? false,
      },
    });
    await prisma.userTenant.create({
      data: { userId: user.id, tenantId: tenant.id, role, status: "ACTIVE" },
    });
    testUsers.push(user.id);
    return user;
  }

  // ============================================================
  // H7.1 — TENANT_ADMIN privilege escalation
  // ============================================================

  describe("H7.1 role assignment boundaries", () => {
    it("TENANT_ADMIN cannot create a SUPER_ADMIN", async () => {
      const res = await request(app.getHttpServer())
        .post(`${BASE}/users`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          email: "h7-escalation@test.local",
          firstName: "Escalation",
          lastName: "Test",
          role: "SUPER_ADMIN",
          password: "S3curePass123!",
        });
      expect([400, 403]).toContain(res.status);
    });

    it("TENANT_ADMIN cannot promote an existing user to SUPER_ADMIN", async () => {
      const victim = await createUser(
        "h7-victim@test.local",
        "S3curePass123!",
        "TEACHER",
        TFA,
      );
      const res = await request(app.getHttpServer())
        .patch(`${BASE}/users/${victim.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "SUPER_ADMIN" });
      expect([400, 403]).toContain(res.status);
      const after = await prisma.user.findUnique({ where: { id: victim.id } });
      expect(after?.role).toBe("TEACHER");
    });

    it("TENANT_ADMIN can still create legitimate tenant-level roles", async () => {
      const res = await request(app.getHttpServer())
        .post(`${BASE}/users`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          email: "h7-legit@test.local",
          firstName: "Legit",
          lastName: "Test",
          role: "BURSAR",
          password: "S3curePass123!",
        });
      expect(res.status).toBe(201);
      if (res.body.data?.user?.id) testUsers.push(res.body.data.user.id);
    });

    it("Teacher cannot assign privileged roles", async () => {
      const res = await request(app.getHttpServer())
        .post(`${BASE}/users`)
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          email: "h7-teacher-escal@test.local",
          firstName: "T",
          lastName: "Esc",
          role: "PRINCIPAL",
          password: "S3curePass123!",
        });
      expect([400, 403]).toContain(res.status);
    });

    it("Student cannot assign privileged roles", async () => {
      const res = await request(app.getHttpServer())
        .post(`${BASE}/users`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          email: "h7-student-escal@test.local",
          firstName: "S",
          lastName: "Esc",
          role: "ADMIN_STAFF",
          password: "S3curePass123!",
        });
      expect([400, 403]).toContain(res.status);
    });

    it("Parent cannot assign privileged roles", async () => {
      const res = await request(app.getHttpServer())
        .post(`${BASE}/users`)
        .set("Authorization", `Bearer ${parentToken}`)
        .send({
          email: "h7-parent-escal@test.local",
          firstName: "P",
          lastName: "Esc",
          role: "BURSAR",
          password: "S3curePass123!",
        });
      expect([400, 403]).toContain(res.status);
    });
  });

  // ============================================================
  // H7.2 — stale JWT permissions / revocation
  // ============================================================

  describe("H7.2 principal revalidation", () => {
    let privilegedUser: { id: string; email: string };
    let privilegedToken: string;

    beforeAll(async () => {
      privilegedUser = await createUser(
        "h7-priv@test.local",
        "S3curePass123!",
        "TENANT_ADMIN",
        TFA,
      );
      const res = await request(app.getHttpServer())
        .post(`${BASE}/auth/login`)
        .send({
          email: privilegedUser.email,
          password: "S3curePass123!",
          tenantSlug: TFA,
        })
        .expect(200);
      privilegedToken = res.body.data.accessToken;
    });

    it("privileged user works before demotion", async () => {
      await request(app.getHttpServer())
        .get(`${BASE}/users?limit=5`)
        .set("Authorization", `Bearer ${privilegedToken}`)
        .expect(200);
    });

    it("old token is denied after role downgrade", async () => {
      await prisma.user.update({
        where: { id: privilegedUser.id },
        data: { role: "STUDENT" },
      });
      await prisma.userTenant.updateMany({
        where: { userId: privilegedUser.id },
        data: { role: "STUDENT" },
      });
      await request(app.getHttpServer())
        .get(`${BASE}/users?limit=5`)
        .set("Authorization", `Bearer ${privilegedToken}`)
        .expect(403);
    });

    it("old token is denied after membership status revocation", async () => {
      // Restore to privileged, then deactivate the membership row itself.
      await prisma.user.update({
        where: { id: privilegedUser.id },
        data: { role: "TENANT_ADMIN", status: "ACTIVE" },
      });
      await prisma.userTenant.updateMany({
        where: { userId: privilegedUser.id },
        data: { role: "TENANT_ADMIN", status: "INACTIVE" },
      });
      await request(app.getHttpServer())
        .get(`${BASE}/users?limit=5`)
        .set("Authorization", `Bearer ${privilegedToken}`)
        .expect(401);
      // Restore membership for any later assertions in this suite.
      await prisma.userTenant.updateMany({
        where: { userId: privilegedUser.id },
        data: { status: "ACTIVE" },
      });
    });

    it("old token is denied after user deactivation", async () => {
      await prisma.user.update({
        where: { id: privilegedUser.id },
        data: { status: "INACTIVE" },
      });
      await request(app.getHttpServer())
        .get(`${BASE}/users?limit=5`)
        .set("Authorization", `Bearer ${privilegedToken}`)
        .expect(401);
    });

    it("normal active users continue to work", async () => {
      await request(app.getHttpServer())
        .get(`${BASE}/users?limit=5`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
    });

    it("refresh token rotation still works for an active user", async () => {
      const login = await request(app.getHttpServer())
        .post(`${BASE}/auth/login`)
        .send({
          email: "admin@eduos.local",
          password: "ChangeMe123!",
          tenantSlug: TFA,
        })
        .expect(200);
      const refreshToken = login.body.data.refreshToken;
      const rotated = await request(app.getHttpServer())
        .post(`${BASE}/auth/refresh`)
        .send({ refreshToken })
        .expect(200);
      expect(rotated.body.data.accessToken).toBeDefined();
    });

    it("MFA challenge flow is unaffected", async () => {
      const mfaUser = await createUser(
        "h7-mfa@test.local",
        "S3curePass123!",
        "STUDENT",
        TFA,
        { mfaEnabled: true },
      );
      const res = await request(app.getHttpServer())
        .post(`${BASE}/auth/login`)
        .send({
          email: mfaUser.email,
          password: "S3curePass123!",
          tenantSlug: TFA,
        });
      // MFA-enabled login returns a challenge, not a session token.
      expect(res.status).toBe(200);
      expect(res.body.data.requiresMfa).toBe(true);
      expect(res.body.data.mfaToken).toBeDefined();
    });
  });

  // ============================================================
  // H7.4 — deactivated tenant JWT fallback
  // ============================================================

  describe("H7.4 tenant status enforcement", () => {
    let sunriseAdminToken: string;
    let sunriseTenantId: string;

    beforeAll(async () => {
      const sunrise = await prisma.tenant.findUnique({
        where: { slug: SUNRISE },
      });
      if (!sunrise) throw new Error("sunrise tenant missing");
      sunriseTenantId = sunrise.id;

      // Start from a clean resolver cache and an ACTIVE tenant so a previous
      // failed run cannot leak a cached SUSPENDED status into this run.
      await prisma.tenant.update({
        where: { id: sunriseTenantId },
        data: { status: "ACTIVE" },
      });
      await redis.delete(`tenant:resolver:ref:${sunriseTenantId}`);
      await redis.delete(`tenant:resolver:ref:${SUNRISE}`);

      const res = await request(app.getHttpServer())
        .post(`${BASE}/auth/login`)
        .send({
          email: "admin@sunrise.example",
          password: "ChangeMe123!",
          tenantSlug: SUNRISE,
        })
        .expect(200);
      sunriseAdminToken = res.body.data.accessToken;
    });

    it("JWT-only resolution (no header) works while tenant is ACTIVE", async () => {
      await request(app.getHttpServer())
        .get(`${BASE}/users?limit=1`)
        .set("Authorization", `Bearer ${sunriseAdminToken}`)
        .expect(200);
    });

    it("old token is denied after tenant is suspended (JWT-only resolution)", async () => {
      restoredTenantIds.push(sunriseTenantId);
      await prisma.tenant.update({
        where: { id: sunriseTenantId },
        data: { status: "SUSPENDED" },
      });
      // Mirror production: an API-driven status change invalidates the
      // tenant-resolver cache so the new status is enforced immediately.
      await redis.delete(`tenant:resolver:ref:${sunriseTenantId}`);
      await redis.delete(`tenant:resolver:ref:${SUNRISE}`);
      // No X-Tenant-Id header: tenant must be resolved from the JWT, and its
      // current status must be enforced.
      await request(app.getHttpServer())
        .get(`${BASE}/users?limit=1`)
        .set("Authorization", `Bearer ${sunriseAdminToken}`)
        .expect(403);
    });

    it("suspended tenant is also denied with a tenant header", async () => {
      await request(app.getHttpServer())
        .get(`${BASE}/users?limit=1`)
        .set("Authorization", `Bearer ${sunriseAdminToken}`)
        .set("X-Tenant-Id", SUNRISE)
        .expect(403);
    });

    it("reactivating the tenant restores legitimate access", async () => {
      await prisma.tenant.update({
        where: { id: sunriseTenantId },
        data: { status: "ACTIVE" },
      });
      // Mirror production cache invalidation on the status change.
      await redis.delete(`tenant:resolver:ref:${sunriseTenantId}`);
      await redis.delete(`tenant:resolver:ref:${SUNRISE}`);
      await request(app.getHttpServer())
        .get(`${BASE}/users?limit=1`)
        .set("Authorization", `Bearer ${sunriseAdminToken}`)
        .expect(200);
    });
  });

  // ============================================================
  // C7.x + cross-tenant regression guard
  // ============================================================

  describe("no regression of critical fixes", () => {
    it("student cannot read another student's profile", async () => {
      await request(app.getHttpServer())
        .get(`${BASE}/students/cmsev3xb8000adbc9yy6avdhr`)
        .set("Authorization", `Bearer ${studentToken}`)
        .expect(404);
    });

    it("student cannot access tenant-wide outstanding fees", async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/finance/invoices/outstanding?limit=100`)
        .set("Authorization", `Bearer ${studentToken}`)
        .expect(200);
      for (const inv of res.body.data as Array<{ studentId: string }>) {
        expect(inv.studentId).toBe("cmsm1sseu00051o135qoylwe7");
      }
    });

    it("cross-tenant header is rejected", async () => {
      await request(app.getHttpServer())
        .get(`${BASE}/students?limit=1`)
        .set("Authorization", `Bearer ${studentToken}`)
        .set("X-Tenant-Id", "westfield-academy")
        .expect(403);
    });
  });
});
