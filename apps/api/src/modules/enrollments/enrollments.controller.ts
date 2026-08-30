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

import { CreateEnrollmentDto } from "./dto/create-enrollment.dto";
import { QueryEnrollmentsDto } from "./dto/query-enrollments.dto";
import { EnrollmentsService } from "./enrollments.service";
import { ApiPaginatedResponse } from "../../common/decorators/api-paginated.decorator";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Enrollments")
@ApiBearerAuth()
@Controller("enrollments")
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
  @Permissions(Permission.ENROLLMENT_WRITE)
  @ApiOperation({ summary: "Enroll a student into a class" })
  @Audited({ action: AuditAction.CREATE, resource: "enrollment" })
  create(@Body() dto: CreateEnrollmentDto) {
    return this.enrollmentsService.create(dto);
  }

  @Get()
  @Permissions(Permission.ENROLLMENT_READ)
  @ApiOperation({ summary: "List enrollments with filters and pagination" })
  @Cacheable({ ttl: 30 })
  @ApiPaginatedResponse(CreateEnrollmentDto)
  findAll(@Query() query: QueryEnrollmentsDto) {
    return this.enrollmentsService.findAll(query);
  }

  @Get(":id")
  @Permissions(Permission.ENROLLMENT_READ)
  @ApiOperation({ summary: "Get an enrollment by id" })
  findOne(@Param("id") id: string) {
    return this.enrollmentsService.findOne(id);
  }

  @Patch(":id")
  @Permissions(Permission.ENROLLMENT_WRITE)
  @ApiOperation({ summary: "Update an enrollment (e.g. change status)" })
  @Audited({ action: AuditAction.UPDATE, resource: "enrollment" })
  update(@Param("id") id: string, @Body() dto: Partial<CreateEnrollmentDto>) {
    return this.enrollmentsService.update(id, dto);
  }

  @Delete(":id")
  @Permissions(Permission.ENROLLMENT_DELETE)
  @ApiOperation({ summary: "Withdraw an enrollment" })
  @Audited({ action: AuditAction.DELETE, resource: "enrollment" })
  remove(@Param("id") id: string) {
    return this.enrollmentsService.remove(id);
  }
}
