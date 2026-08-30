import type { AuthPrincipal } from "@eduos/shared";
import type { PrismaClient } from "@prisma/client";

import { ResourceNotFoundException } from "../exceptions/business.exceptions";

/**
 * Resolves which student records an authenticated principal may access.
 *
 * - Staff (any non STUDENT/PARENT role): `null` => unrestricted within the tenant.
 * - STUDENT: only their own linked `Student` record (via `Student.userId`).
 * - PARENT: only children linked through `Guardian.email` matching the
 *   authenticated user's email.
 *
 * The caller is responsible for combining this scope with the tenant filter
 * (the scoped Prisma client already enforces tenant isolation).
 */
export interface StudentScope {
  /** `null` means tenant-wide (staff). Non-null is the allow-list of student ids. */
  studentIds: string[] | null;
}

/** Returns true when the principal is a STUDENT or PARENT (viewer role). */
export function isViewerRole(role: string): boolean {
  return role === "STUDENT" || role === "PARENT";
}

/**
 * Resolves the viewer's student scope using the tenant-scoped Prisma client.
 * Pass `prisma.scoped` so tenant isolation is preserved.
 */
export async function resolveStudentScope(
  scoped: PrismaClient,
  actor: AuthPrincipal,
): Promise<StudentScope> {
  if (!isViewerRole(actor.role)) {
    return { studentIds: null };
  }

  if (actor.role === "STUDENT") {
    const student = await scoped.student.findFirst({
      where: { userId: actor.userId },
      select: { id: true },
    });
    return { studentIds: student ? [student.id] : [] };
  }

  // PARENT: children linked via Guardian.email
  const guardians = await scoped.guardian.findMany({
    where: { email: actor.email, deletedAt: null },
    select: { studentId: true },
  });
  const studentIds = Array.from(new Set(guardians.map((g) => g.studentId)));
  return { studentIds };
}

/**
 * Throws a 404 when a studentId is not within the principal's scope.
 * A 404 (rather than 403) avoids leaking whether a resource exists.
 */
export function assertStudentInScope(
  scope: StudentScope,
  studentId: string,
): void {
  if (scope.studentIds === null) return;
  if (!scope.studentIds.includes(studentId)) {
    throw new ResourceNotFoundException("Student", studentId);
  }
}
