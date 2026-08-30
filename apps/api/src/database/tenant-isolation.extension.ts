import { Prisma } from "@prisma/client";

import { TenantContext } from "../common/context/tenant.context";

/**
 * Models that carry a `tenantId` column and MUST be isolated per tenant.
 * `Tenant` is deliberately excluded: it is the global catalog managed by
 * platform super-admins and onboarding flows.
 */
const TENANT_SCOPED_MODELS = new Set<string>([
  "User",
  "School",
  "Student",
  "Teacher",
  "ClassGroup",
  "Subject",
  "Enrollment",
  "ClassSubject",
  "AttendanceRecord",
  "Grade",
  "AuditLog",
  "StoredFile",
  "RefreshToken",
  "UserTenant",
  "TenantDomain",
  "Guardian",
  "MedicalRecord",
  "DisciplineRecord",
  "StudentDocument",
  "StudentTransfer",
  "StudentPromotion",
  "TimelineEvent",
  "TeacherQualification",
  "TeacherEmploymentHistory",
  "TeacherAttendance",
  "TeacherPerformanceReview",
  "TeacherLeaveRequest",
  "TeacherSalary",
  "TeacherDocument",
  "QuestionCategory",
  "Question",
  "Exam",
  "ExamQuestion",
  "ExamAttempt",
  "ResultScale",
  "ResultScaleEntry",
  "TermResult",
  "SubjectResult",
  "FeeStructure",
  "Invoice",
  "InvoiceItem",
  "Payment",
  "Receipt",
  "Discount",
  "Scholarship",
  "ParentMessage",
  "AiPromptTemplate",
  "AiUsageLog",
  "PushSubscription",
]);

const READ_OPERATIONS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);

type PrismaArgs = Record<string, unknown>;

function mergeWhere(
  where: PrismaArgs | undefined,
  filter: PrismaArgs,
): PrismaArgs {
  if (!where) return filter;
  return { AND: [filter, where] };
}

/**
 * Prisma client extension that automatically injects the current tenantId
 * into every query on tenant-scoped models.
 *
 * This is a defense-in-depth safety net: even if a developer forgets to
 * scope a query explicitly, the AsyncLocalStorage tenant context is merged
 * into the WHERE clause. Isolation never depends on caller discipline alone.
 *
 * When no tenant context is active (e.g. seed scripts, platform admin
 * maintenance, unauthenticated resolution) the filter is skipped.
 */
export const tenantIsolationExtension = Prisma.defineExtension({
  name: "tenantIsolation",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const tenantId = TenantContext.getTenantId();

        if (!tenantId || !TENANT_SCOPED_MODELS.has(model)) {
          return query(args);
        }

        const a = args as PrismaArgs;
        const filter: PrismaArgs = { tenantId };

        if (READ_OPERATIONS.has(operation)) {
          a.where = mergeWhere(a.where as PrismaArgs | undefined, filter);
        } else if (operation === "update" || operation === "delete") {
          const w = (a.where ?? {}) as PrismaArgs;
          const hasUnique = Object.keys(w).some(
            (key) => key !== "AND" && key !== "OR" && key !== "NOT",
          );
          if (hasUnique) {
            const { AND, ...rest } = w;
            const ands = [filter, AND].flat().filter(Boolean);
            a.where = { ...rest, ...(ands.length > 0 ? { AND: ands } : {}) };
          } else {
            a.where = mergeWhere(w, filter);
          }
        } else if (operation === "updateMany" || operation === "deleteMany") {
          a.where = mergeWhere(a.where as PrismaArgs | undefined, filter);
        } else if (operation === "create") {
          a.data = { ...(a.data as PrismaArgs), ...filter };
        } else if (operation === "createMany") {
          const items = a.data as PrismaArgs[];
          if (Array.isArray(items)) {
            a.data = items.map((item) => ({ ...item, ...filter }));
          }
        } else if (operation === "upsert") {
          a.create = { ...(a.create as PrismaArgs), ...filter };
          a.update = { ...(a.update as PrismaArgs), ...filter };
        }

        return query(args);
      },
    },
  },
});
