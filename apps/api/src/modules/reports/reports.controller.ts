import { Permission } from "@eduos/shared";
import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { QueryReportsDto } from "./dto/query-reports.dto";
import { ReportsService } from "./reports.service";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Reports")
@ApiBearerAuth()
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("overview")
  @Permissions(Permission.REPORT_READ)
  @ApiOperation({ summary: "Aggregate counts across academic resources" })
  @Cacheable({ ttl: 30 })
  getOverview(@Query() query: QueryReportsDto) {
    return this.reportsService.getOverview(query);
  }

  @Get("enrollment-by-class")
  @Permissions(Permission.REPORT_READ)
  @ApiOperation({ summary: "Enrollment distribution across classes" })
  @Cacheable({ ttl: 30 })
  getEnrollmentByClass(@Query() query: QueryReportsDto) {
    return this.reportsService.getEnrollmentByClass(query);
  }

  @Get("gender-distribution")
  @Permissions(Permission.REPORT_READ)
  @ApiOperation({ summary: "Student gender distribution" })
  @Cacheable({ ttl: 60 })
  getGenderDistribution(@Query() query: QueryReportsDto) {
    return this.reportsService.getGenderDistribution(query);
  }

  @Get("attendance-summary")
  @Permissions(Permission.REPORT_READ)
  @ApiOperation({ summary: "Attendance summary over a rolling window" })
  @Cacheable({ ttl: 30 })
  getAttendanceSummary(@Query() query: QueryReportsDto) {
    return this.reportsService.getAttendanceSummary(query);
  }

  @Get("academic-year")
  @Permissions(Permission.REPORT_READ)
  @ApiOperation({ summary: "Sessions, terms and class breakdown by year" })
  @Cacheable({ ttl: 60 })
  getAcademicYearSummary() {
    return this.reportsService.getAcademicYearSummary();
  }
}
