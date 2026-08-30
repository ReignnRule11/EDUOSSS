import { Module } from "@nestjs/common";

import { CourseHomeworkController } from "./course-homework.controller";
import { CourseHomeworkService } from "./course-homework.service";

@Module({
  controllers: [CourseHomeworkController],
  providers: [CourseHomeworkService],
  exports: [CourseHomeworkService],
})
export class CourseHomeworkModule {}
