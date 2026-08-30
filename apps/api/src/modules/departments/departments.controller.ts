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

import { DepartmentsService } from "./departments.service";
import { CreateDepartmentDto } from "./dto/create-department.dto";
import { QueryDepartmentsDto } from "./dto/query-departments.dto";
import { UpdateDepartmentDto } from "./dto/update-department.dto";
import { ApiPaginatedResponse } from "../../common/decorators/api-paginated.decorator";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Departments")
@ApiBearerAuth()
@Controller("departments")
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @Permissions(Permission.DEPARTMENT_WRITE)
  @ApiOperation({ summary: "Create a department" })
  @Audited({ action: AuditAction.CREATE, resource: "department" })
  create(@Body() dto: CreateDepartmentDto) {
    return this.departmentsService.create(dto);
  }

  @Get()
  @Permissions(Permission.DEPARTMENT_READ)
  @ApiOperation({
    summary: "List departments with pagination, search and filters",
  })
  @Cacheable({ ttl: 30 })
  @ApiPaginatedResponse(CreateDepartmentDto)
  findAll(@Query() query: QueryDepartmentsDto) {
    return this.departmentsService.findAll(query);
  }

  @Get(":id")
  @Permissions(Permission.DEPARTMENT_READ)
  @ApiOperation({ summary: "Get a department by id" })
  findOne(@Param("id") id: string) {
    return this.departmentsService.findOne(id);
  }

  @Patch(":id")
  @Permissions(Permission.DEPARTMENT_WRITE)
  @ApiOperation({ summary: "Update a department" })
  @Audited({ action: AuditAction.UPDATE, resource: "department" })
  update(@Param("id") id: string, @Body() dto: UpdateDepartmentDto) {
    return this.departmentsService.update(id, dto);
  }

  @Delete(":id")
  @Permissions(Permission.DEPARTMENT_DELETE)
  @ApiOperation({ summary: "Deactivate a department" })
  @Audited({ action: AuditAction.DELETE, resource: "department" })
  remove(@Param("id") id: string) {
    return this.departmentsService.remove(id);
  }
}
