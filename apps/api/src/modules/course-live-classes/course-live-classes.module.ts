import { Module } from "@nestjs/common";

import { CourseLiveClassesController } from "./course-live-classes.controller";
import { CourseLiveClassesService } from "./course-live-classes.service";

@Module({
  controllers: [CourseLiveClassesController],
  providers: [CourseLiveClassesService],
  exports: [CourseLiveClassesService],
})
export class CourseLiveClassesModule {}
