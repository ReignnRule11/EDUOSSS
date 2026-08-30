import { Module } from "@nestjs/common";

import { StudentDocumentsController } from "./student-documents.controller";
import { StudentDocumentsService } from "./student-documents.service";
import { FilesModule } from "../files/files.module";

@Module({
  imports: [FilesModule],
  controllers: [StudentDocumentsController],
  providers: [StudentDocumentsService],
})
export class StudentDocumentsModule {}
