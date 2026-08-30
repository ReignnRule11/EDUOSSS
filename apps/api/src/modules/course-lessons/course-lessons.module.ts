import { Module } from "@nestjs/common";

import { CourseLessonsController } from "./course-lessons.controller";
import { CourseLessonsService } from "./course-lessons.service";

@Module({
  controllers: [CourseLessonsController],
  providers: [CourseLessonsService],
  exports: [CourseLessonsService],
})
export class CourseLessonsModule {}
