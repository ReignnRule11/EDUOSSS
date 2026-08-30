-- CreateEnum
CREATE TYPE "ResultStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'RELEASED');

-- CreateTable
CREATE TABLE "result_scales" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "result_scales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "result_scale_entries" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "scaleId" TEXT NOT NULL,
    "minScore" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "letterGrade" TEXT NOT NULL,
    "gpa" DOUBLE PRECISION NOT NULL,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "result_scale_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "term_results" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classGroupId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "term" "GradeTerm" NOT NULL,
    "status" "ResultStatus" NOT NULL DEFAULT 'DRAFT',
    "caWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "examWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "totalScore" DOUBLE PRECISION,
    "totalMaxScore" DOUBLE PRECISION,
    "average" DOUBLE PRECISION,
    "classPosition" INTEGER,
    "classSize" INTEGER,
    "teacherComment" TEXT,
    "principalComment" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "term_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subject_results" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "termResultId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "caScore" DOUBLE PRECISION,
    "examScore" DOUBLE PRECISION,
    "totalScore" DOUBLE PRECISION,
    "letterGrade" TEXT,
    "gpa" DOUBLE PRECISION,
    "remark" TEXT,
    "position" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subject_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "result_scales_tenantId_isActive_idx" ON "result_scales"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "result_scales_tenantId_name_key" ON "result_scales"("tenantId", "name");

-- CreateIndex
CREATE INDEX "result_scale_entries_tenantId_scaleId_idx" ON "result_scale_entries"("tenantId", "scaleId");

-- CreateIndex
CREATE INDEX "term_results_tenantId_classGroupId_academicYear_term_status_idx" ON "term_results"("tenantId", "classGroupId", "academicYear", "term", "status");

-- CreateIndex
CREATE UNIQUE INDEX "term_results_tenantId_studentId_classGroupId_academicYear_t_key" ON "term_results"("tenantId", "studentId", "classGroupId", "academicYear", "term");

-- CreateIndex
CREATE INDEX "subject_results_tenantId_subjectId_idx" ON "subject_results"("tenantId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "subject_results_tenantId_termResultId_subjectId_key" ON "subject_results"("tenantId", "termResultId", "subjectId");

-- AddForeignKey
ALTER TABLE "result_scales" ADD CONSTRAINT "result_scales_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result_scale_entries" ADD CONSTRAINT "result_scale_entries_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result_scale_entries" ADD CONSTRAINT "result_scale_entries_scaleId_fkey" FOREIGN KEY ("scaleId") REFERENCES "result_scales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "term_results" ADD CONSTRAINT "term_results_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "term_results" ADD CONSTRAINT "term_results_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "term_results" ADD CONSTRAINT "term_results_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "class_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "term_results" ADD CONSTRAINT "term_results_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_results" ADD CONSTRAINT "subject_results_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_results" ADD CONSTRAINT "subject_results_termResultId_fkey" FOREIGN KEY ("termResultId") REFERENCES "term_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_results" ADD CONSTRAINT "subject_results_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
