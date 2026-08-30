import { Module } from "@nestjs/common";

import { CourseAssignmentsController } from "./course-assignments.controller";
import { CourseAssignmentsService } from "./course-assignments.service";

@Module({
  controllers: [CourseAssignmentsController],
  providers: [CourseAssignmentsService],
  exports: [CourseAssignmentsService],
})
export class CourseAssignmentsModule {}
