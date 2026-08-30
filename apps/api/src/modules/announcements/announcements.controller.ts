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
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { AnnouncementsService } from "./announcements.service";
import { CreateAnnouncementDto } from "./dto/create-announcement.dto";
import { QueryAnnouncementsDto } from "./dto/query-announcements.dto";
import { UpdateAnnouncementDto } from "./dto/update-announcement.dto";
import { ApiPaginatedResponse } from "../../common/decorators/api-paginated.decorator";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Announcements")
@ApiBearerAuth()
@Controller("announcements")
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @Permissions(Permission.ANNOUNCEMENT_WRITE)
  @ApiOperation({ summary: "Create an announcement" })
  @Audited({ action: AuditAction.CREATE, resource: "announcement" })
  create(
    @CurrentUser() actor: AuthPrincipal,
    @Body() dto: CreateAnnouncementDto,
  ) {
    return this.announcementsService.create(actor, dto);
  }

  @Get()
  @Permissions(Permission.ANNOUNCEMENT_READ)
  @ApiOperation({
    summary: "List announcements with pagination, search and filters",
  })
  @Cacheable({ ttl: 30 })
  @ApiPaginatedResponse(CreateAnnouncementDto)
  findAll(@Query() query: QueryAnnouncementsDto) {
    return this.announcementsService.findAll(query);
  }

  @Get(":id")
  @Permissions(Permission.ANNOUNCEMENT_READ)
  @ApiOperation({ summary: "Get an announcement by id" })
  findOne(@Param("id") id: string) {
    return this.announcementsService.findOne(id);
  }

  @Patch(":id")
  @Permissions(Permission.ANNOUNCEMENT_WRITE)
  @ApiOperation({ summary: "Update an announcement" })
  @Audited({ action: AuditAction.UPDATE, resource: "announcement" })
  update(@Param("id") id: string, @Body() dto: UpdateAnnouncementDto) {
    return this.announcementsService.update(id, dto);
  }

  @Delete(":id")
  @Permissions(Permission.ANNOUNCEMENT_DELETE)
  @ApiOperation({ summary: "Deactivate an announcement" })
  @Audited({ action: AuditAction.DELETE, resource: "announcement" })
  remove(@Param("id") id: string) {
    return this.announcementsService.remove(id);
  }
}
