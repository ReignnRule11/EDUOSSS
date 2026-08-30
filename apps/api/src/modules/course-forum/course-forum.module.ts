import { Module } from "@nestjs/common";

import { CourseForumController } from "./course-forum.controller";
import { CourseForumService } from "./course-forum.service";

@Module({
  controllers: [CourseForumController],
  providers: [CourseForumService],
  exports: [CourseForumService],
})
export class CourseForumModule {}
