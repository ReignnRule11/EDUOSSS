import { AuditAction, Permission } from "@eduos/shared";
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { AttendanceNotificationService } from "./attendance-notification.service";
import { AttendanceService } from "./attendance.service";
import { CreateAttendanceDto } from "./dto/create-attendance.dto";
import { NotifyParentsDto } from "./dto/notify-parents.dto";
import { QrSheetQueryDto } from "./dto/qr-sheet-query.dto";
import { QueryAttendanceDto } from "./dto/query-attendance.dto";
import { ScanAttendanceDto } from "./dto/scan-attendance.dto";
import { UpdateAttendanceDto } from "./dto/update-attendance.dto";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Attendance")
@ApiBearerAuth()
@Controller("attendance")
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly notifications: AttendanceNotificationService,
  ) {}

  @Post()
  @Permissions(Permission.ATTENDANCE_WRITE)
  @ApiOperation({
    summary: "Record (or update) attendance for a class on a date",
  })
  @Audited({ action: AuditAction.CREATE, resource: "attendance" })
  create(
    @Body() dto: CreateAttendanceDto,
    @CurrentUser("userId") userId: string,
  ) {
    return this.attendanceService.create(dto, userId);
  }

  @Get()
  @Permissions(Permission.ATTENDANCE_READ)
  @ApiOperation({
    summary: "List attendance records with filters and pagination",
  })
  @Cacheable({ ttl: 15 })
  findAll(@Query() query: QueryAttendanceDto) {
    return this.attendanceService.findAll(query);
  }

  @Get("summary")
  @Permissions(Permission.ATTENDANCE_READ)
  @ApiOperation({ summary: "Attendance rate summary for a class" })
  summary(
    @Query("classGroupId") classGroupId: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.attendanceService.summary(classGroupId, from, to);
  }

  @Post("scan")
  @Permissions(Permission.ATTENDANCE_QR)
  @ApiOperation({ summary: "Mark a student present from a QR scan" })
  @Audited({ action: AuditAction.CREATE, resource: "attendance" })
  scan(@Body() dto: ScanAttendanceDto, @CurrentUser("userId") userId: string) {
    return this.attendanceService.scan(dto, userId);
  }

  @Get("qr/sheet")
  @Permissions(Permission.ATTENDANCE_QR)
  @ApiOperation({ summary: "QR code sheet for a class on a date" })
  qrSheet(@Query() query: QrSheetQueryDto) {
    return this.attendanceService.qrSheet(query.classGroupId, query.date);
  }

  @Post("notify")
  @Permissions(Permission.ATTENDANCE_NOTIFY)
  @ApiOperation({ summary: "Notify guardians of absent/late students" })
  @Audited({ action: AuditAction.CREATE, resource: "parent-notification" })
  notify(@Body() dto: NotifyParentsDto) {
    return this.notifications.notifyAbsent(dto);
  }

  @Get(":id")
  @Permissions(Permission.ATTENDANCE_READ)
  @ApiOperation({ summary: "Get an attendance record by id" })
  findOne(@Param("id") id: string) {
    return this.attendanceService.findOne(id);
  }

  @Patch(":id")
  @Permissions(Permission.ATTENDANCE_WRITE)
  @ApiOperation({ summary: "Update an attendance record" })
  @Audited({ action: AuditAction.UPDATE, resource: "attendance" })
  update(@Param("id") id: string, @Body() dto: UpdateAttendanceDto) {
    return this.attendanceService.update(id, dto);
  }
}
