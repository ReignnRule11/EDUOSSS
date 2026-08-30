import { AuditAction, Permission } from "@eduos/shared";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CreateTimelineEventDto } from "./dto/create-timeline-event.dto";
import { QueryTimelineDto } from "./dto/query-timeline.dto";
import { TimelineService } from "./timeline.service";
import { ApiPaginatedResponse } from "../../common/decorators/api-paginated.decorator";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Timeline")
@ApiBearerAuth()
@Controller("timeline")
export class TimelineController {
  constructor(private readonly timelineService: TimelineService) {}

  @Post()
  @Permissions(Permission.STUDENT_WRITE)
  @ApiOperation({ summary: "Record a timeline event for a student" })
  @Audited({ action: AuditAction.CREATE, resource: "timeline" })
  record(
    @Body() dto: CreateTimelineEventDto,
    @CurrentUser("userId") userId: string,
  ) {
    return this.timelineService.record(dto, userId);
  }

  @Get()
  @Permissions(Permission.TIMELINE_READ)
  @ApiOperation({ summary: "List timeline events with filters" })
  @Cacheable({ ttl: 15 })
  @ApiPaginatedResponse(CreateTimelineEventDto)
  findAll(@Query() query: QueryTimelineDto) {
    return this.timelineService.findAll(query);
  }

  @Get(":id")
  @Permissions(Permission.TIMELINE_READ)
  @ApiOperation({ summary: "Get a timeline event by id" })
  findOne(@Param("id") id: string) {
    return this.timelineService.findOne(id);
  }

  @Delete(":id")
  @Permissions(Permission.STUDENT_DELETE)
  @ApiOperation({ summary: "Remove a timeline event (soft delete)" })
  @Audited({ action: AuditAction.DELETE, resource: "timeline" })
  remove(@Param("id") id: string) {
    return this.timelineService.remove(id);
  }
}
