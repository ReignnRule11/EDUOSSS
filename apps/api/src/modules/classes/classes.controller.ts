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

import { ClassesService } from "./classes.service";
import { CreateClassGroupDto } from "./dto/create-class-group.dto";
import { QueryClassGroupsDto } from "./dto/query-class-groups.dto";
import { UpdateClassGroupDto } from "./dto/update-class-group.dto";
import { ApiPaginatedResponse } from "../../common/decorators/api-paginated.decorator";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Classes")
@ApiBearerAuth()
@Controller("classes")
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @Permissions(Permission.CLASS_WRITE)
  @ApiOperation({ summary: "Create a class group" })
  @Audited({ action: AuditAction.CREATE, resource: "class" })
  create(@Body() dto: CreateClassGroupDto) {
    return this.classesService.create(dto);
  }

  @Get()
  @Permissions(Permission.CLASS_READ)
  @ApiOperation({
    summary: "List class groups with pagination, search and filters",
  })
  @Cacheable({ ttl: 30 })
  @ApiPaginatedResponse(CreateClassGroupDto)
  findAll(@Query() query: QueryClassGroupsDto) {
    return this.classesService.findAll(query);
  }

  @Get(":id")
  @Permissions(Permission.CLASS_READ)
  @ApiOperation({ summary: "Get a class group by id" })
  findOne(@Param("id") id: string) {
    return this.classesService.findOne(id);
  }

  @Patch(":id")
  @Permissions(Permission.CLASS_WRITE)
  @ApiOperation({ summary: "Update a class group" })
  @Audited({ action: AuditAction.UPDATE, resource: "class" })
  update(@Param("id") id: string, @Body() dto: UpdateClassGroupDto) {
    return this.classesService.update(id, dto);
  }

  @Delete(":id")
  @Permissions(Permission.CLASS_DELETE)
  @ApiOperation({ summary: "Deactivate a class group (soft delete)" })
  @Audited({ action: AuditAction.DELETE, resource: "class" })
  remove(@Param("id") id: string) {
    return this.classesService.remove(id);
  }
}
