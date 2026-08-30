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

import { CreateTeacherSalaryDto } from "./dto/create-teacher-salary.dto";
import { QueryTeacherSalariesDto } from "./dto/query-teacher-salaries.dto";
import { UpdateTeacherSalaryDto } from "./dto/update-teacher-salary.dto";
import { TeacherSalariesService } from "./teacher-salaries.service";
import { ApiPaginatedResponse } from "../../common/decorators/api-paginated.decorator";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Teacher Salaries")
@ApiBearerAuth()
@Controller("teacher-salaries")
export class TeacherSalariesController {
  constructor(
    private readonly teacherSalariesService: TeacherSalariesService,
  ) {}

  @Post()
  @Permissions(Permission.TEACHER_SALARY_WRITE)
  @ApiOperation({ summary: "Create a teacher salary record" })
  @Audited({ action: AuditAction.CREATE, resource: "teacher-salary" })
  create(@Body() dto: CreateTeacherSalaryDto) {
    return this.teacherSalariesService.create(dto);
  }

  @Get()
  @Permissions(Permission.TEACHER_SALARY_READ)
  @ApiOperation({ summary: "List teacher salaries with filters" })
  @Cacheable({ ttl: 15 })
  @ApiPaginatedResponse(CreateTeacherSalaryDto)
  findAll(@Query() query: QueryTeacherSalariesDto) {
    return this.teacherSalariesService.findAll(query);
  }

  @Get(":id")
  @Permissions(Permission.TEACHER_SALARY_READ)
  @ApiOperation({ summary: "Get a teacher salary record by id" })
  findOne(@Param("id") id: string) {
    return this.teacherSalariesService.findOne(id);
  }

  @Patch(":id")
  @Permissions(Permission.TEACHER_SALARY_WRITE)
  @ApiOperation({ summary: "Update a teacher salary record" })
  @Audited({ action: AuditAction.UPDATE, resource: "teacher-salary" })
  update(@Param("id") id: string, @Body() dto: UpdateTeacherSalaryDto) {
    return this.teacherSalariesService.update(id, dto);
  }

  @Delete(":id")
  @Permissions(Permission.TEACHER_SALARY_DELETE)
  @ApiOperation({ summary: "Delete a teacher salary record (soft delete)" })
  @Audited({ action: AuditAction.DELETE, resource: "teacher-salary" })
  remove(@Param("id") id: string) {
    return this.teacherSalariesService.remove(id);
  }
}
