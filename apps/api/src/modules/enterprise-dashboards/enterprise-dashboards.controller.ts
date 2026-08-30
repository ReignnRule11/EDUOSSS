import { Permission } from "@eduos/shared";
import { Controller, Get, Query, Res, StreamableFile } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";

import { EnterpriseDashboardsService } from "./enterprise-dashboards.service";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Enterprise Dashboards")
@ApiBearerAuth()
@Controller("enterprise-dashboards")
export class EnterpriseDashboardsController {
  constructor(
    private readonly dashboardsService: EnterpriseDashboardsService,
  ) {}

  @Get("overview")
  @Permissions(Permission.DASHBOARD_READ)
  @ApiOperation({ summary: "Real-time dashboard widget snapshot" })
  @Cacheable({ ttl: 30 })
  overview() {
    return this.dashboardsService.overview();
  }

  @Get("admissions")
  @Permissions(Permission.DASHBOARD_READ)
  @ApiOperation({ summary: "Admissions over time and by status" })
  @Cacheable({ ttl: 60 })
  admissions() {
    return this.dashboardsService.admissions();
  }

  @Get("enrollment")
  @Permissions(Permission.DASHBOARD_READ)
  @ApiOperation({ summary: "Enrollment by class and academic year" })
  @Cacheable({ ttl: 60 })
  enrollment() {
    return this.dashboardsService.enrollment();
  }

  @Get("revenue")
  @Permissions(Permission.DASHBOARD_READ)
  @ApiOperation({ summary: "Revenue by month and payment method" })
  @Cacheable({ ttl: 30 })
  revenue() {
    return this.dashboardsService.revenue();
  }

  @Get("attendance")
  @Permissions(Permission.DASHBOARD_READ)
  @ApiOperation({ summary: "Attendance trend and present rate" })
  @Cacheable({ ttl: 30 })
  attendance(@Query("windowDays") windowDays?: string) {
    return this.dashboardsService.attendance(
      windowDays ? Number(windowDays) : 30,
    );
  }

  @Get("academic-performance")
  @Permissions(Permission.DASHBOARD_READ)
  @ApiOperation({ summary: "Academic performance and grade distribution" })
  @Cacheable({ ttl: 60 })
  academicPerformance() {
    return this.dashboardsService.academicPerformance();
  }

  @Get("teacher-productivity")
  @Permissions(Permission.DASHBOARD_READ)
  @ApiOperation({ summary: "Teacher workload metrics" })
  @Cacheable({ ttl: 60 })
  teacherProductivity() {
    return this.dashboardsService.teacherProductivity();
  }

  @Get("payment-collection")
  @Permissions(Permission.DASHBOARD_READ)
  @ApiOperation({ summary: "Payment collection rate" })
  @Cacheable({ ttl: 30 })
  paymentCollection() {
    return this.dashboardsService.paymentCollection();
  }

  @Get("student-growth")
  @Permissions(Permission.DASHBOARD_READ)
  @ApiOperation({ summary: "Cumulative student growth" })
  @Cacheable({ ttl: 60 })
  studentGrowth() {
    return this.dashboardsService.studentGrowth();
  }

  @Get("export")
  @Permissions(Permission.DASHBOARD_EXPORT)
  @ApiOperation({ summary: "Export the dashboard snapshot as CSV" })
  async exportCsv(@Res({ passthrough: true }) res: Response) {
    const { csv, filename } = await this.dashboardsService.exportCsv();
    res.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    });
    return new StreamableFile(Buffer.from(csv, "utf-8"));
  }
}
