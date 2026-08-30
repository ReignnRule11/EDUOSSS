import { Module } from "@nestjs/common";

import { TeacherLeaveRequestsController } from "./teacher-leave-requests.controller";
import { TeacherLeaveRequestsService } from "./teacher-leave-requests.service";

@Module({
  controllers: [TeacherLeaveRequestsController],
  providers: [TeacherLeaveRequestsService],
})
export class TeacherLeaveRequestsModule {}
