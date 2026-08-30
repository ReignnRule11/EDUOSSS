-- AlterTable
ALTER TABLE "student_promotions" ADD COLUMN     "createdById" TEXT;

-- AddForeignKey
ALTER TABLE "student_promotions" ADD CONSTRAINT "student_promotions_fromClassGroupId_fkey" FOREIGN KEY ("fromClassGroupId") REFERENCES "class_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_promotions" ADD CONSTRAINT "student_promotions_toClassGroupId_fkey" FOREIGN KEY ("toClassGroupId") REFERENCES "class_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
