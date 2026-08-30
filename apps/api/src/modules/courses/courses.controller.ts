import { AuditAction, Permission } from "@eduos/shared";
import type { AuthPrincipal } from "@eduos/shared";
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

import { CoursesService } from "./courses.service";
import { CreateCourseDto } from "./dto/create-course.dto";
import { QueryCoursesDto } from "./dto/query-courses.dto";
import { UpdateCourseDto } from "./dto/update-course.dto";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Courses")
@ApiBearerAuth()
@Controller("courses")
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @Permissions(Permission.COURSE_WRITE)
  @ApiOperation({ summary: "Create a course" })
  @Audited({ action: AuditAction.CREATE, resource: "course" })
  create(@CurrentUser() actor: AuthPrincipal, @Body() dto: CreateCourseDto) {
    return this.coursesService.create(actor, dto);
  }

  @Get()
  @Permissions(Permission.COURSE_READ)
  @ApiOperation({ summary: "List courses with pagination and filters" })
  @Cacheable({ ttl: 30 })
  findAll(
    @Query() query: QueryCoursesDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.coursesService.findAll(query, actor);
  }

  @Get(":id")
  @Permissions(Permission.COURSE_READ)
  @ApiOperation({ summary: "Get a course by id (with lessons)" })
  findOne(@Param("id") id: string) {
    return this.coursesService.findOne(id);
  }

  @Patch(":id")
  @Permissions(Permission.COURSE_WRITE)
  @ApiOperation({ summary: "Update a course" })
  @Audited({ action: AuditAction.UPDATE, resource: "course" })
  update(@Param("id") id: string, @Body() dto: UpdateCourseDto) {
    return this.coursesService.update(id, dto);
  }

  @Post(":id/publish")
  @Permissions(Permission.COURSE_WRITE)
  @ApiOperation({ summary: "Publish or unpublish a course" })
  @Audited({ action: AuditAction.UPDATE, resource: "course" })
  publish(@Param("id") id: string, @Body() dto: { published: boolean }) {
    return this.coursesService.publish(id, dto.published);
  }

  @Delete(":id")
  @Permissions(Permission.COURSE_DELETE)
  @ApiOperation({ summary: "Deactivate a course" })
  @Audited({ action: AuditAction.DELETE, resource: "course" })
  remove(@Param("id") id: string) {
    return this.coursesService.remove(id);
  }
}
