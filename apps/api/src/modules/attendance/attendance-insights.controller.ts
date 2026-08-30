import { Permission } from "@eduos/shared";
import { Controller, Get, Query, Res, StreamableFile } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";

import { AttendanceInsightsService } from "./attendance-insights.service";
import { AttendanceNotificationService } from "./attendance-notification.service";
import {
  AnalyticsQueryDto,
  DailyReportQueryDto,
  LateArrivalsQueryDto,
  MonthlyReportQueryDto,
} from "./dto/attendance-report-query.dto";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Attendance")
@ApiBearerAuth()
@Controller("attendance")
export class AttendanceInsightsController {
  constructor(
    private readonly insights: AttendanceInsightsService,
    private readonly notifications: AttendanceNotificationService,
  ) {}

  @Get("dashboard")
  @Permissions(Permission.ATTENDANCE_ANALYTICS)
  @ApiOperation({
    summary: "Attendance dashboard: today, trend, classes, alerts",
  })
  dashboard() {
    return this.insights.dashboard();
  }

  @Get("reports/daily")
  @Permissions(Permission.ATTENDANCE_READ)
  @ApiOperation({ summary: "Daily attendance report by class" })
  @Cacheable({ ttl: 15 })
  dailyReport(@Query() query: DailyReportQueryDto) {
    return this.insights.dailyReport(query);
  }

  @Get("reports/monthly")
  @Permissions(Permission.ATTENDANCE_READ)
  @ApiOperation({ summary: "Monthly attendance report per student" })
  monthlyReport(@Query() query: MonthlyReportQueryDto) {
    return this.insights.monthlyReport(query);
  }

  @Get("reports/late")
  @Permissions(Permission.ATTENDANCE_READ)
  @ApiOperation({ summary: "List late arrivals in a date range" })
  lateArrivals(@Query() query: LateArrivalsQueryDto) {
    return this.insights.lateArrivals(query);
  }

  @Get("analytics/trend")
  @Permissions(Permission.ATTENDANCE_ANALYTICS)
  @ApiOperation({ summary: "Daily attendance trend over a window" })
  @Cacheable({ ttl: 60 })
  trend(@Query() query: AnalyticsQueryDto) {
    return this.insights.trend(query);
  }

  @Get("analytics/by-class")
  @Permissions(Permission.ATTENDANCE_ANALYTICS)
  @ApiOperation({ summary: "Attendance rates compared by class" })
  byClass(@Query() query: AnalyticsQueryDto) {
    return this.insights.byClass(query);
  }

  @Get("analytics/students")
  @Permissions(Permission.ATTENDANCE_ANALYTICS)
  @ApiOperation({ summary: "Students ranked by attendance (lowest first)" })
  topStudents(@Query() query: AnalyticsQueryDto) {
    return this.insights.topStudents(query);
  }

  @Get("notifications")
  @Permissions(Permission.ATTENDANCE_READ)
  @ApiOperation({ summary: "Parent notification log" })
  notificationLog(@Query("limit") limit?: string) {
    return this.notifications.listLogs({
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get("export")
  @Permissions(Permission.ATTENDANCE_EXPORT)
  @ApiOperation({ summary: "Export attendance records as CSV" })
  async export(
    @Query() query: DailyReportQueryDto & { from?: string; to?: string },
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { csv, filename } = await this.insights.exportCsv(query);
    res.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    });
    return new StreamableFile(Buffer.from(csv, "utf-8"));
  }
}
