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

import { CreateTeacherEmploymentHistoryDto } from "./dto/create-teacher-employment-history.dto";
import { QueryTeacherEmploymentHistoryDto } from "./dto/query-teacher-employment-history.dto";
import { UpdateTeacherEmploymentHistoryDto } from "./dto/update-teacher-employment-history.dto";
import { TeacherEmploymentHistoryService } from "./teacher-employment-history.service";
import { ApiPaginatedResponse } from "../../common/decorators/api-paginated.decorator";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Teacher Employment History")
@ApiBearerAuth()
@Controller("teacher-employment-history")
export class TeacherEmploymentHistoryController {
  constructor(
    private readonly teacherEmploymentHistoryService: TeacherEmploymentHistoryService,
  ) {}

  @Post()
  @Permissions(Permission.TEACHER_EMPLOYMENT_WRITE)
  @ApiOperation({ summary: "Create a teacher employment history record" })
  @Audited({ action: AuditAction.CREATE, resource: "teacher-employment" })
  create(@Body() dto: CreateTeacherEmploymentHistoryDto) {
    return this.teacherEmploymentHistoryService.create(dto);
  }

  @Get()
  @Permissions(Permission.TEACHER_EMPLOYMENT_READ)
  @ApiOperation({ summary: "List teacher employment history with filters" })
  @Cacheable({ ttl: 15 })
  @ApiPaginatedResponse(CreateTeacherEmploymentHistoryDto)
  findAll(@Query() query: QueryTeacherEmploymentHistoryDto) {
    return this.teacherEmploymentHistoryService.findAll(query);
  }

  @Get(":id")
  @Permissions(Permission.TEACHER_EMPLOYMENT_READ)
  @ApiOperation({ summary: "Get a teacher employment history record by id" })
  findOne(@Param("id") id: string) {
    return this.teacherEmploymentHistoryService.findOne(id);
  }

  @Patch(":id")
  @Permissions(Permission.TEACHER_EMPLOYMENT_WRITE)
  @ApiOperation({ summary: "Update a teacher employment history record" })
  @Audited({ action: AuditAction.UPDATE, resource: "teacher-employment" })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateTeacherEmploymentHistoryDto,
  ) {
    return this.teacherEmploymentHistoryService.update(id, dto);
  }

  @Delete(":id")
  @Permissions(Permission.TEACHER_EMPLOYMENT_DELETE)
  @ApiOperation({
    summary: "Delete a teacher employment history (soft delete)",
  })
  @Audited({ action: AuditAction.DELETE, resource: "teacher-employment" })
  remove(@Param("id") id: string) {
    return this.teacherEmploymentHistoryService.remove(id);
  }
}
