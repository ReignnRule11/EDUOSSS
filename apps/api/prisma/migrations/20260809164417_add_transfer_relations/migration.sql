-- AlterTable
ALTER TABLE "student_transfers" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "completedById" TEXT,
ADD COLUMN     "createdById" TEXT;

-- AddForeignKey
ALTER TABLE "student_transfers" ADD CONSTRAINT "student_transfers_fromSchoolId_fkey" FOREIGN KEY ("fromSchoolId") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_transfers" ADD CONSTRAINT "student_transfers_toSchoolId_fkey" FOREIGN KEY ("toSchoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_transfers" ADD CONSTRAINT "student_transfers_fromClassGroupId_fkey" FOREIGN KEY ("fromClassGroupId") REFERENCES "class_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_transfers" ADD CONSTRAINT "student_transfers_toClassGroupId_fkey" FOREIGN KEY ("toClassGroupId") REFERENCES "class_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
