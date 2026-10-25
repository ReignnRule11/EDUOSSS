import {
  Gender,
  GradeLevel,
  GuardianRelationship,
  PrismaClient,
  UserStatus,
} from "@prisma/client";
import * as bcrypt from "bcryptjs";

/**
 * Creates stable, isolated identities for security E2E tests.
 * These fixtures are test-only and must never be used by production seeding.
 * Every lookup is by a domain key; tests must not depend on generated CUIDs.
 */
export const SECURITY_E2E_PASSWORDS = {
  admin: "ChangeMe123!",
  student: "Student@123",
  parent: "Parent@123",
  teacher: "Teacher@123",
} as const;

export async function ensureSecurityE2EFixtures(prisma: PrismaClient) {
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { slug: "bright-future-academy" },
  });
  const school = await prisma.school.findUniqueOrThrow({
    where: { tenantId_code: { tenantId: tenant.id, code: "BFA" } },
  });
  const classGroup = await prisma.classGroup.findFirstOrThrow({
    where: {
      tenantId: tenant.id,
      schoolId: school.id,
      name: "Primary 4A",
      academicYear: "2026/2027",
    },
  });
  const math = await prisma.subject.findUniqueOrThrow({
    where: { tenantId_code: { tenantId: tenant.id, code: "MATH" } },
  });

  async function ensureUser(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: string,
  ) {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email } },
      update: {
        passwordHash,
        firstName,
        lastName,
        role,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
        failedLoginCount: 0,
        lockedUntil: null,
        mfaEnabled: false,
      },
      create: {
        tenantId: tenant.id,
        email,
        passwordHash,
        firstName,
        lastName,
        role,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    });
    await prisma.userTenant.upsert({
      where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
      update: { role, status: "ACTIVE" },
      create: { userId: user.id, tenantId: tenant.id, role, status: "ACTIVE" },
    });
    return user;
  }

  const admin = await ensureUser(
    "security.admin@test.local",
    SECURITY_E2E_PASSWORDS.admin,
    "System",
    "Administrator",
    "TENANT_ADMIN",
  );
  const studentUser = await ensureUser(
    "lms.student@test.local",
    SECURITY_E2E_PASSWORDS.student,
    "E2E",
    "Student",
    "STUDENT",
  );
  const parentUser = await ensureUser(
    "amina@sis.test",
    SECURITY_E2E_PASSWORDS.parent,
    "Amina",
    "Parent",
    "PARENT",
  );
  const teacherUser = await ensureUser(
    "teacher@test.local",
    SECURITY_E2E_PASSWORDS.teacher,
    "E2E",
    "Teacher",
    "TEACHER",
  );

  const studentA = await prisma.student.upsert({
    where: {
      tenantId_admissionNumber: {
        tenantId: tenant.id,
        admissionNumber: "E2E-SECURITY-STUDENT-A",
      },
    },
    update: {
      schoolId: school.id,
      userId: studentUser.id,
      firstName: "E2E",
      lastName: "Student",
      gender: Gender.MALE,
      gradeLevel: GradeLevel.PRIMARY,
      guardianEmail: "unrelated.guardian@example.test",
    },
    create: {
      tenantId: tenant.id,
      schoolId: school.id,
      userId: studentUser.id,
      admissionNumber: "E2E-SECURITY-STUDENT-A",
      firstName: "E2E",
      lastName: "Student",
      gender: Gender.MALE,
      gradeLevel: GradeLevel.PRIMARY,
      guardianEmail: "amina@sis.test",
    },
  });

  // Use the normal seeded student as the unrelated student; resolve by unique
  // admission number rather than relying on an environment-specific CUID.
  const studentB = await prisma.student.findUniqueOrThrow({
    where: {
      tenantId_admissionNumber: {
        tenantId: tenant.id,
        admissionNumber: "BFA/2026/0001",
      },
    },
  });

  const parentChild = await prisma.student.upsert({
    where: {
      tenantId_admissionNumber: {
        tenantId: tenant.id,
        admissionNumber: "E2E-SECURITY-PARENT-CHILD",
      },
    },
    update: {
      schoolId: school.id,
      userId: null,
      firstName: "E2E",
      lastName: "ParentChild",
      gender: Gender.FEMALE,
      gradeLevel: GradeLevel.PRIMARY,
      guardianName: "Amina Parent",
      guardianEmail: parentUser.email,
    },
    create: {
      tenantId: tenant.id,
      schoolId: school.id,
      admissionNumber: "E2E-SECURITY-PARENT-CHILD",
      firstName: "E2E",
      lastName: "ParentChild",
      gender: Gender.FEMALE,
      gradeLevel: GradeLevel.PRIMARY,
      guardianName: "Amina Parent",
      guardianEmail: parentUser.email,
    },
  });

  await prisma.guardian.upsert({
    where: { id: "e2e-security-parent-guardian" },
    update: {
      tenantId: tenant.id,
      studentId: parentChild.id,
      firstName: parentUser.firstName,
      lastName: parentUser.lastName,
      relationship: GuardianRelationship.MOTHER,
      email: parentUser.email,
      isPrimary: true,
      deletedAt: null,
    },
    create: {
      id: "e2e-security-parent-guardian",
      tenantId: tenant.id,
      studentId: parentChild.id,
      firstName: parentUser.firstName,
      lastName: parentUser.lastName,
      relationship: GuardianRelationship.MOTHER,
      email: parentUser.email,
      isPrimary: true,
    },
  });

  const teacher = await prisma.teacher.upsert({
    where: {
      tenantId_staffNumber: {
        tenantId: tenant.id,
        staffNumber: "E2E-SECURITY-TEACHER",
      },
    },
    update: {
      schoolId: school.id,
      userId: teacherUser.id,
      firstName: teacherUser.firstName,
      lastName: teacherUser.lastName,
      email: teacherUser.email,
      isActive: true,
    },
    create: {
      tenantId: tenant.id,
      schoolId: school.id,
      userId: teacherUser.id,
      staffNumber: "E2E-SECURITY-TEACHER",
      firstName: teacherUser.firstName,
      lastName: teacherUser.lastName,
      email: teacherUser.email,
      gender: Gender.OTHER,
      specialization: "E2E security tests",
    },
  });

  for (const student of [studentA, studentB, parentChild]) {
    await prisma.enrollment.upsert({
      where: {
        tenantId_studentId_academicYear_term: {
          tenantId: tenant.id,
          studentId: student.id,
          academicYear: "2026/2027",
          term: "FIRST",
        },
      },
      update: { classGroupId: classGroup.id },
      create: {
        tenantId: tenant.id,
        studentId: student.id,
        classGroupId: classGroup.id,
        academicYear: "2026/2027",
        term: "FIRST",
      },
    });
  }

  return {
    tenantId: tenant.id,
    adminUserId: admin.id,
    studentUserId: studentUser.id,
    parentUserId: parentUser.id,
    teacherUserId: teacherUser.id,
    studentAId: studentA.id,
    studentBId: studentB.id,
    parentChildId: parentChild.id,
    teacherId: teacher.id,
    classGroupId: classGroup.id,
    mathSubjectId: math.id,
  };
}
