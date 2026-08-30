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

import { CreateTeacherQualificationDto } from "./dto/create-teacher-qualification.dto";
import { QueryTeacherQualificationsDto } from "./dto/query-teacher-qualifications.dto";
import { UpdateTeacherQualificationDto } from "./dto/update-teacher-qualification.dto";
import { TeacherQualificationsService } from "./teacher-qualifications.service";
import { ApiPaginatedResponse } from "../../common/decorators/api-paginated.decorator";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Teacher Qualifications")
@ApiBearerAuth()
@Controller("teacher-qualifications")
export class TeacherQualificationsController {
  constructor(
    private readonly teacherQualificationsService: TeacherQualificationsService,
  ) {}

  @Post()
  @Permissions(Permission.TEACHER_QUALIFICATION_WRITE)
  @ApiOperation({ summary: "Create a teacher qualification record" })
  @Audited({ action: AuditAction.CREATE, resource: "teacher-qualification" })
  create(@Body() dto: CreateTeacherQualificationDto) {
    return this.teacherQualificationsService.create(dto);
  }

  @Get()
  @Permissions(Permission.TEACHER_QUALIFICATION_READ)
  @ApiOperation({ summary: "List teacher qualifications with filters" })
  @Cacheable({ ttl: 15 })
  @ApiPaginatedResponse(CreateTeacherQualificationDto)
  findAll(@Query() query: QueryTeacherQualificationsDto) {
    return this.teacherQualificationsService.findAll(query);
  }

  @Get(":id")
  @Permissions(Permission.TEACHER_QUALIFICATION_READ)
  @ApiOperation({ summary: "Get a teacher qualification by id" })
  findOne(@Param("id") id: string) {
    return this.teacherQualificationsService.findOne(id);
  }

  @Patch(":id")
  @Permissions(Permission.TEACHER_QUALIFICATION_WRITE)
  @ApiOperation({ summary: "Update a teacher qualification" })
  @Audited({ action: AuditAction.UPDATE, resource: "teacher-qualification" })
  update(@Param("id") id: string, @Body() dto: UpdateTeacherQualificationDto) {
    return this.teacherQualificationsService.update(id, dto);
  }

  @Delete(":id")
  @Permissions(Permission.TEACHER_QUALIFICATION_DELETE)
  @ApiOperation({ summary: "Delete a teacher qualification (soft delete)" })
  @Audited({ action: AuditAction.DELETE, resource: "teacher-qualification" })
  remove(@Param("id") id: string) {
    return this.teacherQualificationsService.remove(id);
  }
}
