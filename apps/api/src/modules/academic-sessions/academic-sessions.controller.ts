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
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { AcademicSessionsService } from "./academic-sessions.service";
import { CreateAcademicSessionDto } from "./dto/create-academic-session.dto";
import { QueryAcademicSessionsDto } from "./dto/query-academic-sessions.dto";
import { UpdateAcademicSessionDto } from "./dto/update-academic-session.dto";
import { ApiPaginatedResponse } from "../../common/decorators/api-paginated.decorator";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Academic Sessions")
@ApiBearerAuth()
@Controller("academic-sessions")
export class AcademicSessionsController {
  constructor(private readonly sessionsService: AcademicSessionsService) {}

  @Post()
  @Permissions(Permission.SESSION_WRITE)
  @ApiOperation({ summary: "Create an academic session" })
  @Audited({ action: AuditAction.CREATE, resource: "academic-session" })
  create(@Body() dto: CreateAcademicSessionDto) {
    return this.sessionsService.create(dto);
  }

  @Get()
  @Permissions(Permission.SESSION_READ)
  @ApiOperation({
    summary: "List academic sessions with pagination, search and filters",
  })
  @Cacheable({ ttl: 30 })
  @ApiPaginatedResponse(CreateAcademicSessionDto)
  findAll(@Query() query: QueryAcademicSessionsDto) {
    return this.sessionsService.findAll(query);
  }

  @Get("current")
  @Permissions(Permission.SESSION_READ)
  @ApiOperation({ summary: "Get the current active academic session" })
  @Cacheable({ ttl: 15 })
  findCurrent() {
    return this.sessionsService.findCurrentOrNull();
  }

  @Get(":id")
  @Permissions(Permission.SESSION_READ)
  @ApiOperation({ summary: "Get an academic session by id" })
  findOne(@Param("id") id: string) {
    return this.sessionsService.findOne(id);
  }

  @Patch(":id")
  @Permissions(Permission.SESSION_WRITE)
  @ApiOperation({ summary: "Update an academic session" })
  @Audited({ action: AuditAction.UPDATE, resource: "academic-session" })
  update(@Param("id") id: string, @Body() dto: UpdateAcademicSessionDto) {
    return this.sessionsService.update(id, dto);
  }

  @Post(":id/set-current")
  @Permissions(Permission.SESSION_WRITE)
  @ApiOperation({ summary: "Mark a session as the current one" })
  @Audited({ action: AuditAction.UPDATE, resource: "academic-session" })
  setCurrent(@Param("id") id: string) {
    return this.sessionsService.setCurrent(id);
  }

  @Delete(":id")
  @Permissions(Permission.SESSION_DELETE)
  @ApiOperation({ summary: "Deactivate an academic session" })
  @Audited({ action: AuditAction.DELETE, resource: "academic-session" })
  remove(@Param("id") id: string) {
    return this.sessionsService.remove(id);
  }
}
