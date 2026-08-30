-- CreateEnum
CREATE TYPE "AttendanceSource" AS ENUM ('MANUAL', 'QR', 'IMPORT');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS');

-- AlterTable
ALTER TABLE "attendance_records" ADD COLUMN     "source" "AttendanceSource" NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "parent_notification_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "recordId" TEXT,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'EMAIL',
    "recipient" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parent_notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "parent_notification_logs_tenantId_createdAt_idx" ON "parent_notification_logs"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "parent_notification_logs_tenantId_studentId_idx" ON "parent_notification_logs"("tenantId", "studentId");

-- AddForeignKey
ALTER TABLE "parent_notification_logs" ADD CONSTRAINT "parent_notification_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_notification_logs" ADD CONSTRAINT "parent_notification_logs_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_notification_logs" ADD CONSTRAINT "parent_notification_logs_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "attendance_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
