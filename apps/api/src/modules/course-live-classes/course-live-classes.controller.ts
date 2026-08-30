import { AuditAction, Permission } from "@eduos/shared";
import type { AuthPrincipal } from "@eduos/shared";
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

import { CourseLiveClassesService } from "./course-live-classes.service";
import {
  CreateLiveClassDto,
  UpdateLiveClassStatusDto,
} from "./dto/live-class.dto";
import { UpdateLiveClassDto } from "./dto/update-live-class.dto";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Live Classes")
@ApiBearerAuth()
@Controller("courses/:courseId/live-classes")
export class CourseLiveClassesController {
  constructor(private readonly liveClassesService: CourseLiveClassesService) {}

  @Post()
  @Permissions(Permission.LIVE_CLASS_WRITE)
  @ApiOperation({ summary: "Schedule a live class" })
  @Audited({ action: AuditAction.CREATE, resource: "live_class" })
  create(
    @Param("courseId") courseId: string,
    @Body() dto: CreateLiveClassDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.liveClassesService.create(courseId, dto, actor);
  }

  @Get()
  @Permissions(Permission.LIVE_CLASS_READ)
  @ApiOperation({ summary: "List live classes of a course" })
  @Cacheable({ ttl: 30 })
  findAll(@Param("courseId") courseId: string) {
    return this.liveClassesService.findAll(courseId);
  }

  @Get(":id")
  @Permissions(Permission.LIVE_CLASS_READ)
  @ApiOperation({ summary: "Get a live class" })
  findOne(@Param("courseId") courseId: string, @Param("id") id: string) {
    return this.liveClassesService.findOne(courseId, id);
  }

  @Patch(":id")
  @Permissions(Permission.LIVE_CLASS_WRITE)
  @ApiOperation({ summary: "Update a live class" })
  @Audited({ action: AuditAction.UPDATE, resource: "live_class" })
  update(
    @Param("courseId") courseId: string,
    @Param("id") id: string,
    @Body() dto: UpdateLiveClassDto,
  ) {
    return this.liveClassesService.update(courseId, id, dto);
  }

  @Patch(":id/status")
  @Permissions(Permission.LIVE_CLASS_WRITE)
  @ApiOperation({ summary: "Change live class status (LIVE/ENDED/CANCELLED)" })
  @Audited({ action: AuditAction.UPDATE, resource: "live_class" })
  updateStatus(
    @Param("courseId") courseId: string,
    @Param("id") id: string,
    @Body() dto: UpdateLiveClassStatusDto,
  ) {
    return this.liveClassesService.updateStatus(courseId, id, dto.status);
  }

  @Delete(":id")
  @Permissions(Permission.LIVE_CLASS_DELETE)
  @ApiOperation({ summary: "Deactivate a live class" })
  @Audited({ action: AuditAction.DELETE, resource: "live_class" })
  remove(@Param("courseId") courseId: string, @Param("id") id: string) {
    return this.liveClassesService.remove(courseId, id);
  }
}
