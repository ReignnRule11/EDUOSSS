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

import { CreateTeacherReviewDto } from "./dto/create-teacher-review.dto";
import { QueryTeacherReviewsDto } from "./dto/query-teacher-reviews.dto";
import { UpdateTeacherReviewDto } from "./dto/update-teacher-review.dto";
import { TeacherReviewsService } from "./teacher-reviews.service";
import { ApiPaginatedResponse } from "../../common/decorators/api-paginated.decorator";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Teacher Performance Reviews")
@ApiBearerAuth()
@Controller("teacher-performance-reviews")
export class TeacherReviewsController {
  constructor(private readonly teacherReviewsService: TeacherReviewsService) {}

  @Post()
  @Permissions(Permission.TEACHER_REVIEW_WRITE)
  @ApiOperation({ summary: "Create a teacher performance review" })
  @Audited({ action: AuditAction.CREATE, resource: "teacher-review" })
  create(
    @Body() dto: CreateTeacherReviewDto,
    @CurrentUser("userId") userId: string,
  ) {
    return this.teacherReviewsService.create(dto, userId);
  }

  @Get()
  @Permissions(Permission.TEACHER_REVIEW_READ)
  @ApiOperation({ summary: "List teacher performance reviews with filters" })
  @Cacheable({ ttl: 15 })
  @ApiPaginatedResponse(CreateTeacherReviewDto)
  findAll(@Query() query: QueryTeacherReviewsDto) {
    return this.teacherReviewsService.findAll(query);
  }

  @Get(":id")
  @Permissions(Permission.TEACHER_REVIEW_READ)
  @ApiOperation({ summary: "Get a teacher performance review by id" })
  findOne(@Param("id") id: string) {
    return this.teacherReviewsService.findOne(id);
  }

  @Patch(":id")
  @Permissions(Permission.TEACHER_REVIEW_WRITE)
  @ApiOperation({ summary: "Update a teacher performance review" })
  @Audited({ action: AuditAction.UPDATE, resource: "teacher-review" })
  update(@Param("id") id: string, @Body() dto: UpdateTeacherReviewDto) {
    return this.teacherReviewsService.update(id, dto);
  }

  @Delete(":id")
  @Permissions(Permission.TEACHER_REVIEW_DELETE)
  @ApiOperation({
    summary: "Delete a teacher performance review (soft delete)",
  })
  @Audited({ action: AuditAction.DELETE, resource: "teacher-review" })
  remove(@Param("id") id: string) {
    return this.teacherReviewsService.remove(id);
  }
}
