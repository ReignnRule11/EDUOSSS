import { Module } from "@nestjs/common";

import { CourseRecordedSessionsController } from "./course-recorded-sessions.controller";
import { CourseRecordedSessionsService } from "./course-recorded-sessions.service";

@Module({
  controllers: [CourseRecordedSessionsController],
  providers: [CourseRecordedSessionsService],
  exports: [CourseRecordedSessionsService],
})
export class CourseRecordedSessionsModule {}
