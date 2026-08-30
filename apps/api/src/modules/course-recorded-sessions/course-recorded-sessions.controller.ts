import { AuditAction, Permission } from "@eduos/shared";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CourseRecordedSessionsService } from "./course-recorded-sessions.service";
import { CreateRecordedSessionDto } from "./dto/recorded-session.dto";
import { UpdateRecordedSessionDto } from "./dto/update-recorded-session.dto";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Recorded Sessions")
@ApiBearerAuth()
@Controller("courses/:courseId/recorded-sessions")
export class CourseRecordedSessionsController {
  constructor(
    private readonly recordedSessionsService: CourseRecordedSessionsService,
  ) {}

  @Post()
  @Permissions(Permission.RECORDED_SESSION_WRITE)
  @ApiOperation({ summary: "Add a recorded session to a course" })
  @Audited({ action: AuditAction.CREATE, resource: "recorded_session" })
  create(
    @Param("courseId") courseId: string,
    @Body() dto: CreateRecordedSessionDto,
  ) {
    return this.recordedSessionsService.create(courseId, dto);
  }

  @Get()
  @Permissions(Permission.RECORDED_SESSION_READ)
  @ApiOperation({ summary: "List recorded sessions of a course" })
  @Cacheable({ ttl: 30 })
  findAll(@Param("courseId") courseId: string) {
    return this.recordedSessionsService.findAll(courseId);
  }

  @Get(":id")
  @Permissions(Permission.RECORDED_SESSION_READ)
  @ApiOperation({ summary: "Get a recorded session" })
  findOne(@Param("courseId") courseId: string, @Param("id") id: string) {
    return this.recordedSessionsService.findOne(courseId, id);
  }

  @Patch(":id")
  @Permissions(Permission.RECORDED_SESSION_WRITE)
  @ApiOperation({ summary: "Update a recorded session" })
  @Audited({ action: AuditAction.UPDATE, resource: "recorded_session" })
  update(
    @Param("courseId") courseId: string,
    @Param("id") id: string,
    @Body() dto: UpdateRecordedSessionDto,
  ) {
    return this.recordedSessionsService.update(courseId, id, dto);
  }

  @Delete(":id")
  @Permissions(Permission.RECORDED_SESSION_DELETE)
  @ApiOperation({ summary: "Deactivate a recorded session" })
  @Audited({ action: AuditAction.DELETE, resource: "recorded_session" })
  remove(@Param("courseId") courseId: string, @Param("id") id: string) {
    return this.recordedSessionsService.remove(courseId, id);
  }
}
