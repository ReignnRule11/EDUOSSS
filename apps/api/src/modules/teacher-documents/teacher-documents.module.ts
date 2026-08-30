import { Module } from "@nestjs/common";

import { TeacherDocumentsController } from "./teacher-documents.controller";
import { TeacherDocumentsService } from "./teacher-documents.service";

@Module({
  controllers: [TeacherDocumentsController],
  providers: [TeacherDocumentsService],
})
export class TeacherDocumentsModule {}
