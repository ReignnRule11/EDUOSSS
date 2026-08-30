import { Module } from "@nestjs/common";

import {
  CourseEnrollmentsController,
  MyEnrollmentsController,
} from "./course-enrollments.controller";
import { CourseEnrollmentsService } from "./course-enrollments.service";

@Module({
  controllers: [CourseEnrollmentsController, MyEnrollmentsController],
  providers: [CourseEnrollmentsService],
  exports: [CourseEnrollmentsService],
})
export class CourseEnrollmentsModule {}
