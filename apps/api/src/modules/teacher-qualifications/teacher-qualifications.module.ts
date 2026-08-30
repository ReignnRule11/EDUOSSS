import { Module } from "@nestjs/common";

import { TeacherQualificationsController } from "./teacher-qualifications.controller";
import { TeacherQualificationsService } from "./teacher-qualifications.service";

@Module({
  controllers: [TeacherQualificationsController],
  providers: [TeacherQualificationsService],
})
export class TeacherQualificationsModule {}
