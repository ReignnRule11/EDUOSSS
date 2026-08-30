import { Permission } from "@eduos/shared";
import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { AuditLogsService } from "./audit-logs.service";
import { QueryAuditLogsDto } from "./dto/query-audit-logs.dto";
import { ApiPaginatedResponse } from "../../common/decorators/api-paginated.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Audit Logs")
@ApiBearerAuth()
@Controller("audit-logs")
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Permissions(Permission.AUDIT_READ)
  @ApiOperation({
    summary: "List tenant audit logs with filters and pagination",
  })
  @Cacheable({ ttl: 15 })
  @ApiPaginatedResponse(QueryAuditLogsDto)
  findAll(@Query() query: QueryAuditLogsDto) {
    return this.auditLogsService.findAll(query);
  }
}
