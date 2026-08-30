-- CreateIndex
CREATE INDEX "assignment_submissions_tenantId_enrollmentId_idx" ON "assignment_submissions"("tenantId", "enrollmentId");

-- CreateIndex
CREATE INDEX "course_enrollments_tenantId_studentId_idx" ON "course_enrollments"("tenantId", "studentId");

-- CreateIndex
CREATE INDEX "payments_tenantId_invoiceId_idx" ON "payments"("tenantId", "invoiceId");
