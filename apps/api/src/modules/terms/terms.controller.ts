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

import { CreateTermDto } from "./dto/create-term.dto";
import { QueryTermsDto } from "./dto/query-terms.dto";
import { UpdateTermDto } from "./dto/update-term.dto";
import { TermsService } from "./terms.service";
import { ApiPaginatedResponse } from "../../common/decorators/api-paginated.decorator";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Academic Terms")
@ApiBearerAuth()
@Controller("terms")
export class TermsController {
  constructor(private readonly termsService: TermsService) {}

  @Post()
  @Permissions(Permission.TERM_WRITE)
  @ApiOperation({ summary: "Create an academic term" })
  @Audited({ action: AuditAction.CREATE, resource: "academic-term" })
  create(@Body() dto: CreateTermDto) {
    return this.termsService.create(dto);
  }

  @Get()
  @Permissions(Permission.TERM_READ)
  @ApiOperation({
    summary: "List academic terms with pagination, search and filters",
  })
  @Cacheable({ ttl: 30 })
  @ApiPaginatedResponse(CreateTermDto)
  findAll(@Query() query: QueryTermsDto) {
    return this.termsService.findAll(query);
  }

  @Get(":id")
  @Permissions(Permission.TERM_READ)
  @ApiOperation({ summary: "Get a term by id" })
  findOne(@Param("id") id: string) {
    return this.termsService.findOne(id);
  }

  @Patch(":id")
  @Permissions(Permission.TERM_WRITE)
  @ApiOperation({ summary: "Update a term" })
  @Audited({ action: AuditAction.UPDATE, resource: "academic-term" })
  update(@Param("id") id: string, @Body() dto: UpdateTermDto) {
    return this.termsService.update(id, dto);
  }

  @Post(":id/set-current")
  @Permissions(Permission.TERM_WRITE)
  @ApiOperation({
    summary: "Mark a term as the current one within its session",
  })
  @Audited({ action: AuditAction.UPDATE, resource: "academic-term" })
  setCurrent(@Param("id") id: string) {
    return this.termsService.setCurrent(id);
  }

  @Delete(":id")
  @Permissions(Permission.TERM_DELETE)
  @ApiOperation({ summary: "Deactivate a term" })
  @Audited({ action: AuditAction.DELETE, resource: "academic-term" })
  remove(@Param("id") id: string) {
    return this.termsService.remove(id);
  }
}
