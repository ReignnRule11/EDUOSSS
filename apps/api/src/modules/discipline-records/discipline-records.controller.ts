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

import { DisciplineRecordsService } from "./discipline-records.service";
import { CreateDisciplineRecordDto } from "./dto/create-discipline-record.dto";
import { QueryDisciplineRecordsDto } from "./dto/query-discipline-records.dto";
import { UpdateDisciplineRecordDto } from "./dto/update-discipline-record.dto";
import { ApiPaginatedResponse } from "../../common/decorators/api-paginated.decorator";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Discipline Records")
@ApiBearerAuth()
@Controller("discipline-records")
export class DisciplineRecordsController {
  constructor(
    private readonly disciplineRecordsService: DisciplineRecordsService,
  ) {}

  @Post()
  @Permissions(Permission.DISCIPLINE_WRITE)
  @ApiOperation({ summary: "Create a discipline record for a student" })
  @Audited({ action: AuditAction.CREATE, resource: "discipline-record" })
  create(
    @Body() dto: CreateDisciplineRecordDto,
    @CurrentUser("userId") userId: string,
  ) {
    return this.disciplineRecordsService.create(dto, userId);
  }

  @Get()
  @Permissions(Permission.DISCIPLINE_READ)
  @ApiOperation({ summary: "List discipline records with filters" })
  @Cacheable({ ttl: 15 })
  @ApiPaginatedResponse(CreateDisciplineRecordDto)
  findAll(@Query() query: QueryDisciplineRecordsDto) {
    return this.disciplineRecordsService.findAll(query);
  }

  @Get(":id")
  @Permissions(Permission.DISCIPLINE_READ)
  @ApiOperation({ summary: "Get a discipline record by id" })
  findOne(@Param("id") id: string) {
    return this.disciplineRecordsService.findOne(id);
  }

  @Patch(":id")
  @Permissions(Permission.DISCIPLINE_WRITE)
  @ApiOperation({ summary: "Update a discipline record" })
  @Audited({ action: AuditAction.UPDATE, resource: "discipline-record" })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateDisciplineRecordDto,
    @CurrentUser("userId") userId: string,
  ) {
    return this.disciplineRecordsService.update(id, dto, userId);
  }

  @Delete(":id")
  @Permissions(Permission.DISCIPLINE_DELETE)
  @ApiOperation({ summary: "Delete a discipline record (soft delete)" })
  @Audited({ action: AuditAction.DELETE, resource: "discipline-record" })
  remove(@Param("id") id: string) {
    return this.disciplineRecordsService.remove(id);
  }
}
