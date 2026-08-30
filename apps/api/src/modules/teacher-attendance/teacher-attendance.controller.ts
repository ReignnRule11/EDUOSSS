import { AuditAction, Permission } from "@eduos/shared";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { Res, StreamableFile } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";

import { CreateTeacherAttendanceDto } from "./dto/create-teacher-attendance.dto";
import { QueryTeacherAttendanceDto } from "./dto/query-teacher-attendance.dto";
import { UpdateTeacherAttendanceDto } from "./dto/update-teacher-attendance.dto";
import { TeacherAttendanceService } from "./teacher-attendance.service";
import { ApiPaginatedResponse } from "../../common/decorators/api-paginated.decorator";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Teacher Attendance")
@ApiBearerAuth()
@Controller("teacher-attendance")
export class TeacherAttendanceController {
  constructor(
    private readonly teacherAttendanceService: TeacherAttendanceService,
  ) {}

  @Post()
  @Permissions(Permission.TEACHER_ATTENDANCE_WRITE)
  @ApiOperation({ summary: "Create or update teacher attendance for a date" })
  @Audited({ action: AuditAction.CREATE, resource: "teacher-attendance" })
  create(
    @Body() dto: CreateTeacherAttendanceDto,
    @CurrentUser("userId") userId: string,
  ) {
    return this.teacherAttendanceService.create(dto, userId);
  }

  @Get()
  @Permissions(Permission.TEACHER_ATTENDANCE_READ)
  @ApiOperation({ summary: "List teacher attendance with filters" })
  @Cacheable({ ttl: 15 })
  @ApiPaginatedResponse(CreateTeacherAttendanceDto)
  findAll(@Query() query: QueryTeacherAttendanceDto) {
    return this.teacherAttendanceService.findAll(query);
  }

  @Get("reports/daily")
  @Permissions(Permission.TEACHER_ATTENDANCE_READ)
  @ApiOperation({ summary: "Teacher attendance daily report" })
  dailyReport(@Query("date") date?: string) {
    return this.teacherAttendanceService.dailyReport(
      date ? new Date(date) : undefined,
    );
  }

  @Get("export")
  @Permissions(Permission.ATTENDANCE_EXPORT)
  @ApiOperation({ summary: "Export teacher attendance as CSV" })
  async export(
    @Query() query: { from?: string; to?: string; teacherId?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { csv, filename } =
      await this.teacherAttendanceService.exportCsv(query);
    res.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    });
    return new StreamableFile(Buffer.from(csv, "utf-8"));
  }

  @Get(":id")
  @Permissions(Permission.TEACHER_ATTENDANCE_READ)
  @ApiOperation({ summary: "Get teacher attendance by id" })
  findOne(@Param("id") id: string) {
    return this.teacherAttendanceService.findOne(id);
  }

  @Patch(":id")
  @Permissions(Permission.TEACHER_ATTENDANCE_WRITE)
  @ApiOperation({ summary: "Update teacher attendance" })
  @Audited({ action: AuditAction.UPDATE, resource: "teacher-attendance" })
  update(@Param("id") id: string, @Body() dto: UpdateTeacherAttendanceDto) {
    return this.teacherAttendanceService.update(id, dto);
  }

  @Delete(":id")
  @Permissions(Permission.TEACHER_ATTENDANCE_DELETE)
  @ApiOperation({ summary: "Delete teacher attendance (soft delete)" })
  @Audited({ action: AuditAction.DELETE, resource: "teacher-attendance" })
  remove(@Param("id") id: string) {
    return this.teacherAttendanceService.remove(id);
  }
}
