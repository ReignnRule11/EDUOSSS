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

import { CreateStudentPromotionDto } from "./dto/create-student-promotion.dto";
import { QueryStudentPromotionsDto } from "./dto/query-student-promotions.dto";
import { UpdateStudentPromotionDto } from "./dto/update-student-promotion.dto";
import { StudentPromotionsService } from "./student-promotions.service";
import { ApiPaginatedResponse } from "../../common/decorators/api-paginated.decorator";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Student Promotions")
@ApiBearerAuth()
@Controller("student-promotions")
export class StudentPromotionsController {
  constructor(
    private readonly studentPromotionsService: StudentPromotionsService,
  ) {}

  @Post()
  @Permissions(Permission.PROMOTION_WRITE)
  @ApiOperation({ summary: "Create a student promotion record" })
  @Audited({ action: AuditAction.CREATE, resource: "student-promotion" })
  create(
    @Body() dto: CreateStudentPromotionDto,
    @CurrentUser("userId") userId: string,
  ) {
    return this.studentPromotionsService.create(dto, userId);
  }

  @Get()
  @Permissions(Permission.PROMOTION_READ)
  @ApiOperation({ summary: "List student promotions with filters" })
  @Cacheable({ ttl: 15 })
  @ApiPaginatedResponse(CreateStudentPromotionDto)
  findAll(@Query() query: QueryStudentPromotionsDto) {
    return this.studentPromotionsService.findAll(query);
  }

  @Get(":id")
  @Permissions(Permission.PROMOTION_READ)
  @ApiOperation({ summary: "Get a student promotion by id" })
  findOne(@Param("id") id: string) {
    return this.studentPromotionsService.findOne(id);
  }

  @Patch(":id")
  @Permissions(Permission.PROMOTION_WRITE)
  @ApiOperation({ summary: "Update a student promotion" })
  @Audited({ action: AuditAction.UPDATE, resource: "student-promotion" })
  update(@Param("id") id: string, @Body() dto: UpdateStudentPromotionDto) {
    return this.studentPromotionsService.update(id, dto);
  }

  @Post(":id/apply")
  @Permissions(Permission.PROMOTION_WRITE)
  @ApiOperation({
    summary:
      "Apply a promotion: move student to the new class and academic year",
  })
  @Audited({ action: AuditAction.UPDATE, resource: "student-promotion" })
  apply(@Param("id") id: string, @CurrentUser("userId") userId: string) {
    return this.studentPromotionsService.apply(id, userId);
  }

  @Delete(":id")
  @Permissions(Permission.PROMOTION_DELETE)
  @ApiOperation({ summary: "Delete a student promotion (soft delete)" })
  @Audited({ action: AuditAction.DELETE, resource: "student-promotion" })
  remove(@Param("id") id: string) {
    return this.studentPromotionsService.remove(id);
  }
}
