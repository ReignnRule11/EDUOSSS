import { Module } from "@nestjs/common";

import { StudentsController } from "./students.controller";
import { StudentsService } from "./students.service";
import { FilesModule } from "../files/files.module";
import { TimelineModule } from "../timeline/timeline.module";

@Module({
  imports: [FilesModule, TimelineModule],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
