-- AddForeignKey
ALTER TABLE "student_documents" ADD CONSTRAINT "student_documents_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "stored_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
