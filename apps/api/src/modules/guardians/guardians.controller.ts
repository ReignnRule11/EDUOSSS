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

import { CreateGuardianDto } from "./dto/create-guardian.dto";
import { QueryGuardiansDto } from "./dto/query-guardians.dto";
import { UpdateGuardianDto } from "./dto/update-guardian.dto";
import { GuardiansService } from "./guardians.service";
import { ApiPaginatedResponse } from "../../common/decorators/api-paginated.decorator";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Guardians")
@ApiBearerAuth()
@Controller("guardians")
export class GuardiansController {
  constructor(private readonly guardiansService: GuardiansService) {}

  @Post()
  @Permissions(Permission.GUARDIAN_WRITE)
  @ApiOperation({ summary: "Create a guardian for a student" })
  @Audited({ action: AuditAction.CREATE, resource: "guardian" })
  create(@Body() dto: CreateGuardianDto) {
    return this.guardiansService.create(dto);
  }

  @Get()
  @Permissions(Permission.GUARDIAN_READ)
  @ApiOperation({ summary: "List guardians with filters" })
  @Cacheable({ ttl: 15 })
  @ApiPaginatedResponse(CreateGuardianDto)
  findAll(@Query() query: QueryGuardiansDto) {
    return this.guardiansService.findAll(query);
  }

  @Get(":id")
  @Permissions(Permission.GUARDIAN_READ)
  @ApiOperation({ summary: "Get a guardian by id" })
  findOne(@Param("id") id: string) {
    return this.guardiansService.findOne(id);
  }

  @Patch(":id")
  @Permissions(Permission.GUARDIAN_WRITE)
  @ApiOperation({ summary: "Update a guardian" })
  @Audited({ action: AuditAction.UPDATE, resource: "guardian" })
  update(@Param("id") id: string, @Body() dto: UpdateGuardianDto) {
    return this.guardiansService.update(id, dto);
  }

  @Delete(":id")
  @Permissions(Permission.GUARDIAN_DELETE)
  @ApiOperation({ summary: "Delete a guardian (soft delete)" })
  @Audited({ action: AuditAction.DELETE, resource: "guardian" })
  remove(@Param("id") id: string) {
    return this.guardiansService.remove(id);
  }
}
