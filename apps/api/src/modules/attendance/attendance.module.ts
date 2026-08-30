import { Module } from "@nestjs/common";

import { AttendanceInsightsController } from "./attendance-insights.controller";
import { AttendanceInsightsService } from "./attendance-insights.service";
import { AttendanceNotificationService } from "./attendance-notification.service";
import { AttendanceController } from "./attendance.controller";
import { AttendanceService } from "./attendance.service";

@Module({
  controllers: [AttendanceInsightsController, AttendanceController],
  providers: [
    AttendanceService,
    AttendanceInsightsService,
    AttendanceNotificationService,
  ],
  exports: [AttendanceService, AttendanceInsightsService],
})
export class AttendanceModule {}
