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

import { CreateSchoolDto } from "./dto/create-school.dto";
import { QuerySchoolsDto } from "./dto/query-schools.dto";
import { UpdateSchoolDto } from "./dto/update-school.dto";
import { SchoolsService } from "./schools.service";
import { ApiPaginatedResponse } from "../../common/decorators/api-paginated.decorator";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Schools")
@ApiBearerAuth()
@Controller("schools")
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Post()
  @Permissions(Permission.SCHOOL_WRITE)
  @ApiOperation({ summary: "Create a school" })
  @Audited({ action: AuditAction.CREATE, resource: "school" })
  create(@Body() dto: CreateSchoolDto) {
    return this.schoolsService.create(dto);
  }

  @Get()
  @Permissions(Permission.SCHOOL_READ)
  @ApiOperation({ summary: "List schools with pagination, search and filters" })
  @Cacheable({ ttl: 60 })
  @ApiPaginatedResponse(CreateSchoolDto)
  findAll(@Query() query: QuerySchoolsDto) {
    return this.schoolsService.findAll(query);
  }

  @Get(":id")
  @Permissions(Permission.SCHOOL_READ)
  @ApiOperation({ summary: "Get a school by id" })
  findOne(@Param("id") id: string) {
    return this.schoolsService.findOne(id);
  }

  @Patch(":id")
  @Permissions(Permission.SCHOOL_WRITE)
  @ApiOperation({ summary: "Update a school" })
  @Audited({ action: AuditAction.UPDATE, resource: "school" })
  update(@Param("id") id: string, @Body() dto: UpdateSchoolDto) {
    return this.schoolsService.update(id, dto);
  }

  @Delete(":id")
  @Permissions(Permission.SCHOOL_DELETE)
  @ApiOperation({ summary: "Deactivate a school" })
  @Audited({ action: AuditAction.DELETE, resource: "school" })
  remove(@Param("id") id: string) {
    return this.schoolsService.remove(id);
  }
}
