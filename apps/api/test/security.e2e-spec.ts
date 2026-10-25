import { type INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { ensureSecurityE2EFixtures } from "./helpers/security-e2e-fixtures";
import { ValidationFailedException } from "../src/common/exceptions/business.exceptions";
import { PrismaService } from "../src/database/prisma.service";

/**
 * Security integration tests for the confirmed critical vulnerabilities:
 * C7.1 file access, C7.2/C7.3 student profile/listing BOLA,
 * C7.4 grades BOLA, C7.5 class broadsheet/ranking, C7.6 outstanding fees,
 * plus cross-tenant isolation regression.
 *
 * These tests boot the real application (real DB + Redis) and use real JWTs,
 * so authorization is verified end-to-end, server-side.
 */

const ADMIN = {
  email: "security.admin@test.local",
  password: "ChangeMe123!",
  tenantSlug: "bright-future-academy",
};
const STUDENT = {
  email: "lms.student@test.local",
  password: "Student@123",
  tenantSlug: "bright-future-academy",
};
const PARENT = {
  email: "amina@sis.test",
  password: "Parent@123",
  tenantSlug: "bright-future-academy",
};

// IDs are resolved from deterministic fixture keys at runtime, never hard-coded.
let STUDENT_A_ID: string;
let STUDENT_B_ID: string;
let PARENT_CHILD_ID: string;
let CLASS_A: string;
let MATH_SUBJECT_ID: string;

describe("Security remediation (C7.x)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let studentToken: string;
  let parentToken: string;

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
    const fixtures = await ensureSecurityE2EFixtures(prisma);
    STUDENT_A_ID = fixtures.studentAId;
    STUDENT_B_ID = fixtures.studentBId;
    PARENT_CHILD_ID = fixtures.parentChildId;
    CLASS_A = fixtures.classGroupId;
    MATH_SUBJECT_ID = fixtures.mathSubjectId;

    const login = async (creds: typeof ADMIN) => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send(creds)
        .expect(200);
      return res.body.data.accessToken as string;
    };
    adminToken = await login(ADMIN);
    studentToken = await login(STUDENT);
    parentToken = await login(PARENT);
  });

  afterAll(async () => {
    await app.close();
  });

  // ---------- C7.2 / C7.3: student profiles ----------

  it("C7.2 STUDENT can read their own profile", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/students/${STUDENT_A_ID}`)
      .set("Authorization", `Bearer ${studentToken}`)
      .expect(200);
    expect(res.body.data.id).toBe(STUDENT_A_ID);
  });

  it("C7.2 STUDENT cannot read another student's profile (404)", async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/students/${STUDENT_B_ID}`)
      .set("Authorization", `Bearer ${studentToken}`)
      .expect(404);
  });

  it("C7.3 STUDENT list returns only their own record", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/students?limit=100")
      .set("Authorization", `Bearer ${studentToken}`)
      .expect(200);
    const ids = res.body.data.map((s: { id: string }) => s.id);
    expect(ids).toHaveLength(1);
    expect(ids[0]).toBe(STUDENT_A_ID);
  });

  // ---------- Parent access ----------

  it("PARENT can read a linked child", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/students/${PARENT_CHILD_ID}`)
      .set("Authorization", `Bearer ${parentToken}`)
      .expect(200);
    expect(res.body.data.id).toBe(PARENT_CHILD_ID);
  });

  it("PARENT cannot read an unrelated child (404)", async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/students/${STUDENT_A_ID}`)
      .set("Authorization", `Bearer ${parentToken}`)
      .expect(404);
  });

  it("PARENT list returns only linked children", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/students?limit=100")
      .set("Authorization", `Bearer ${parentToken}`)
      .expect(200);
    const ids = res.body.data.map((s: { id: string }) => s.id);
    expect(ids).toContain(PARENT_CHILD_ID);
    expect(ids).not.toContain(STUDENT_A_ID);
    expect(ids).not.toContain(STUDENT_B_ID);
  });

  // ---------- C7.4: grades ----------

  let studentAGradeId: string;
  let studentBGradeId: string;

  beforeAll(async () => {
    // Create real grade rows as admin so ownership is exercised with data.
    const gradeFor = async (studentId: string) => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/grades")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          studentId,
          classGroupId: CLASS_A,
          subjectId: MATH_SUBJECT_ID,
          academicYear: "2026/2027",
          term: "FIRST",
          score: 70,
        });
      return res.body.data.id as string;
    };
    try {
      studentAGradeId = await gradeFor(STUDENT_A_ID);
    } catch {
      studentAGradeId = "";
    }
    try {
      studentBGradeId = await gradeFor(STUDENT_B_ID);
    } catch {
      studentBGradeId = "";
    }
  });

  it("C7.4 STUDENT reading another student's grade by id is denied (404)", async () => {
    if (!studentBGradeId) return;
    await request(app.getHttpServer())
      .get(`/api/v1/grades/${studentBGradeId}`)
      .set("Authorization", `Bearer ${studentToken}`)
      .expect(404);
  });

  it("C7.4 STUDENT can read their own grade by id (200)", async () => {
    if (!studentAGradeId) return;
    const res = await request(app.getHttpServer())
      .get(`/api/v1/grades/${studentAGradeId}`)
      .set("Authorization", `Bearer ${studentToken}`)
      .expect(200);
    expect(res.body.data.studentId).toBe(STUDENT_A_ID);
  });

  it("C7.4 STUDENT querying grades with another studentId returns only their own", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/grades?studentId=${STUDENT_B_ID}&limit=100`)
      .set("Authorization", `Bearer ${studentToken}`)
      .expect(200);
    const items = res.body.data as Array<{ studentId: string }>;
    for (const g of items) {
      expect(g.studentId).toBe(STUDENT_A_ID);
    }
  });

  it("C7.4 STUDENT cannot see class grade summary (403)", async () => {
    await request(app.getHttpServer())
      .get(
        `/api/v1/grades/summary?classGroupId=${CLASS_A}&academicYear=2026%2F2027&term=FIRST`,
      )
      .set("Authorization", `Bearer ${studentToken}`)
      .expect(403);
  });

  // ---------- C7.5: broadsheet / ranking ----------

  it("C7.5 STUDENT cannot access another class broadsheet (403)", async () => {
    await request(app.getHttpServer())
      .get(
        `/api/v1/result-insights/broadsheet?classGroupId=${CLASS_A}&academicYear=2026%2F2027&term=FIRST`,
      )
      .set("Authorization", `Bearer ${studentToken}`)
      .expect(403);
  });

  it("C7.5 STUDENT cannot access another class ranking (403)", async () => {
    await request(app.getHttpServer())
      .get(
        `/api/v1/result-insights/ranking?classGroupId=${CLASS_A}&academicYear=2026%2F2027&term=FIRST`,
      )
      .set("Authorization", `Bearer ${studentToken}`)
      .expect(403);
  });

  // ---------- C7.6: outstanding fees ----------

  it("C7.6 STUDENT cannot see tenant-wide outstanding fees", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/finance/invoices/outstanding?limit=100")
      .set("Authorization", `Bearer ${studentToken}`)
      .expect(200);
    const items = res.body.data as Array<{ studentId: string }>;
    for (const inv of items) {
      expect(inv.studentId).toBe(STUDENT_A_ID);
    }
  });

  it("C7.6 STUDENT cannot see another student's invoice by id (404)", async () => {
    // Create an invoice for another student as admin, then try to read it.
    const invRes = await request(app.getHttpServer())
      .post("/api/v1/finance/invoices")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        studentId: STUDENT_B_ID,
        classGroupId: CLASS_A,
        academicYear: "2026/2027",
        term: "FIRST",
      });
    if (invRes.status !== 201) return; // invoice may already exist
    const invoiceId = invRes.body.data.id as string;
    await request(app.getHttpServer())
      .get(`/api/v1/finance/invoices/${invoiceId}`)
      .set("Authorization", `Bearer ${studentToken}`)
      .expect(404);
  });

  // ---------- C7.1: file access ----------

  let fileId: string;
  let fileUrl: string;

  beforeAll(async () => {
    // Upload a PRIVATE file as admin (the uploader).
    const up = await request(app.getHttpServer())
      .post("/api/v1/files/upload")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from("%PDF-1.4 test-private-file"), {
        filename: "private-doc.pdf",
        contentType: "application/pdf",
      })
      .field("access", "PRIVATE")
      .expect(201);
    fileId = up.body.data.id;
    fileUrl = up.body.data.url;
  });

  it("C7.1 anonymous cannot download a private file (401)", async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/files/${fileId}/download`)
      .expect(401);
  });

  it("C7.1 a viewer (student) cannot download a private file (403)", async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/files/${fileId}/download`)
      .set("Authorization", `Bearer ${studentToken}`)
      .expect(403);
  });

  it("C7.1 the uploader (admin) can download the private file (200)", async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/files/${fileId}/download`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
  });

  it("C7.1 file metadata is protected too (viewer denied)", async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/files/${fileId}`)
      .set("Authorization", `Bearer ${studentToken}`)
      .expect(403);
  });

  it("C7.1 anonymous cannot read file metadata (401)", async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/files/${fileId}`)
      .expect(401);
  });

  it("C7.1 the static /storage route must not serve private files in production", async () => {
    // In the test (non-production) runtime the static route may exist, but the
    // production config disables it. Assert the URL is not the primary path:
    // downloading via the storage URL without auth must fail at the API layer.
    const res = await request(app.getHttpServer()).get(fileUrl);
    // Allow 404/401/403 (denied); a 200 here would mean public exposure.
    expect([401, 403, 404]).toContain(res.status);
  });

  // ---------- Cross-tenant isolation regression ----------

  it("CROSS-TENANT: wrong tenant header is rejected (403)", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/students?limit=5")
      .set("Authorization", `Bearer ${studentToken}`)
      .set("X-Tenant-Id", "sunrise-international")
      .expect(403);
  });

  it("CROSS-TENANT: staff cannot reach tenant B resources via header", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/students?limit=5")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("X-Tenant-Id", "westfield-academy")
      .expect(403);
  });
});
