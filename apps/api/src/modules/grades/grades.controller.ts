import { AuditAction, Permission } from "@eduos/shared";
import type { AuthPrincipal } from "@eduos/shared";
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { GradeTerm } from "@prisma/client";

import { CreateGradeDto } from "./dto/create-grade.dto";
import { QueryGradesDto } from "./dto/query-grades.dto";
import { UpdateGradeDto } from "./dto/update-grade.dto";
import { GradesService } from "./grades.service";
import { ApiPaginatedResponse } from "../../common/decorators/api-paginated.decorator";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Grades")
@ApiBearerAuth()
@Controller("grades")
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Post()
  @Permissions(Permission.GRADE_WRITE)
  @ApiOperation({ summary: "Record a grade for a student" })
  @Audited({ action: AuditAction.CREATE, resource: "grade" })
  create(@Body() dto: CreateGradeDto, @CurrentUser("userId") userId: string) {
    return this.gradesService.create(dto, userId);
  }

  @Get()
  @Permissions(Permission.GRADE_READ)
  @ApiOperation({ summary: "List grades with filters and pagination" })
  @Cacheable({ ttl: 15 })
  @ApiPaginatedResponse(CreateGradeDto)
  findAll(@Query() query: QueryGradesDto, @CurrentUser() actor: AuthPrincipal) {
    return this.gradesService.findAll(query, actor);
  }

  @Get("summary")
  @Permissions(Permission.GRADE_READ)
  @ApiOperation({ summary: "Class average and grade distribution" })
  summary(
    @Query("classGroupId") classGroupId: string,
    @Query("academicYear") academicYear: string,
    @Query("term") term: GradeTerm,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.gradesService.classSummary(
      classGroupId,
      academicYear,
      term,
      actor,
    );
  }

  @Get(":id")
  @Permissions(Permission.GRADE_READ)
  @ApiOperation({ summary: "Get a grade by id" })
  findOne(@Param("id") id: string, @CurrentUser() actor: AuthPrincipal) {
    return this.gradesService.findOne(id, actor);
  }

  @Patch(":id")
  @Permissions(Permission.GRADE_WRITE)
  @ApiOperation({ summary: "Update a grade" })
  @Audited({ action: AuditAction.UPDATE, resource: "grade" })
  update(@Param("id") id: string, @Body() dto: UpdateGradeDto) {
    return this.gradesService.update(id, dto);
  }
}
