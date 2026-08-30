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

import { CreateSubjectDto } from "./dto/create-subject.dto";
import { QuerySubjectsDto } from "./dto/query-subjects.dto";
import { UpdateSubjectDto } from "./dto/update-subject.dto";
import { SubjectsService } from "./subjects.service";
import { ApiPaginatedResponse } from "../../common/decorators/api-paginated.decorator";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Subjects")
@ApiBearerAuth()
@Controller("subjects")
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Post()
  @Permissions(Permission.SUBJECT_WRITE)
  @ApiOperation({ summary: "Create a subject" })
  @Audited({ action: AuditAction.CREATE, resource: "subject" })
  create(@Body() dto: CreateSubjectDto) {
    return this.subjectsService.create(dto);
  }

  @Get()
  @Permissions(Permission.SUBJECT_READ)
  @ApiOperation({ summary: "List subjects with pagination and search" })
  @Cacheable({ ttl: 60 })
  @ApiPaginatedResponse(CreateSubjectDto)
  findAll(@Query() query: QuerySubjectsDto) {
    return this.subjectsService.findAll(query);
  }

  @Get(":id")
  @Permissions(Permission.SUBJECT_READ)
  @ApiOperation({ summary: "Get a subject by id" })
  findOne(@Param("id") id: string) {
    return this.subjectsService.findOne(id);
  }

  @Patch(":id")
  @Permissions(Permission.SUBJECT_WRITE)
  @ApiOperation({ summary: "Update a subject" })
  @Audited({ action: AuditAction.UPDATE, resource: "subject" })
  update(@Param("id") id: string, @Body() dto: UpdateSubjectDto) {
    return this.subjectsService.update(id, dto);
  }

  @Delete(":id")
  @Permissions(Permission.SUBJECT_DELETE)
  @ApiOperation({ summary: "Deactivate a subject (soft delete)" })
  @Audited({ action: AuditAction.DELETE, resource: "subject" })
  remove(@Param("id") id: string) {
    return this.subjectsService.remove(id);
  }
}
