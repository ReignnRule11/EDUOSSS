import { Module } from "@nestjs/common";

import { TeacherEmploymentHistoryController } from "./teacher-employment-history.controller";
import { TeacherEmploymentHistoryService } from "./teacher-employment-history.service";

@Module({
  controllers: [TeacherEmploymentHistoryController],
  providers: [TeacherEmploymentHistoryService],
})
export class TeacherEmploymentHistoryModule {}
