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
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CourseHomeworkService } from "./course-homework.service";
import {
  CreateHomeworkDto,
  GradeHomeworkDto,
  SubmitHomeworkDto,
} from "./dto/homework.dto";
import { UpdateHomeworkDto } from "./dto/update-homework.dto";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Course Homework")
@ApiBearerAuth()
@Controller("courses/:courseId/homework")
export class CourseHomeworkController {
  constructor(private readonly homeworkService: CourseHomeworkService) {}

  @Post()
  @Permissions(Permission.HOMEWORK_WRITE)
  @ApiOperation({ summary: "Create a homework assignment" })
  @Audited({ action: AuditAction.CREATE, resource: "homework" })
  create(
    @Param("courseId") courseId: string,
    @Body() dto: CreateHomeworkDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.homeworkService.create(courseId, dto, actor);
  }

  @Get()
  @Permissions(Permission.HOMEWORK_READ)
  @ApiOperation({ summary: "List homework of a course" })
  @Cacheable({ ttl: 30 })
  findAll(@Param("courseId") courseId: string) {
    return this.homeworkService.findAll(courseId);
  }

  @Get(":id")
  @Permissions(Permission.HOMEWORK_READ)
  @ApiOperation({ summary: "Get a single homework" })
  findOne(@Param("courseId") courseId: string, @Param("id") id: string) {
    return this.homeworkService.findOne(courseId, id);
  }

  @Patch(":id")
  @Permissions(Permission.HOMEWORK_WRITE)
  @ApiOperation({ summary: "Update homework" })
  @Audited({ action: AuditAction.UPDATE, resource: "homework" })
  update(
    @Param("courseId") courseId: string,
    @Param("id") id: string,
    @Body() dto: UpdateHomeworkDto,
  ) {
    return this.homeworkService.update(courseId, id, dto);
  }

  @Delete(":id")
  @Permissions(Permission.HOMEWORK_DELETE)
  @ApiOperation({ summary: "Deactivate homework" })
  @Audited({ action: AuditAction.DELETE, resource: "homework" })
  remove(@Param("courseId") courseId: string, @Param("id") id: string) {
    return this.homeworkService.remove(courseId, id);
  }

  @Get(":id/submissions")
  @Permissions(Permission.HOMEWORK_READ)
  @ApiOperation({ summary: "List submissions for homework" })
  listSubmissions(
    @Param("courseId") courseId: string,
    @Param("id") id: string,
  ) {
    return this.homeworkService.listSubmissions(courseId, id);
  }

  @Post(":id/submit")
  @Permissions(Permission.HOMEWORK_WRITE)
  @ApiOperation({
    summary: "Submit (or update) the calling student's homework",
  })
  @Audited({ action: AuditAction.CREATE, resource: "homework_submission" })
  submit(
    @Param("courseId") courseId: string,
    @Param("id") id: string,
    @Body() dto: SubmitHomeworkDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.homeworkService.submit(courseId, id, dto, actor);
  }

  @Post(":id/submissions/:submissionId/grade")
  @Permissions(Permission.HOMEWORK_GRADE)
  @ApiOperation({ summary: "Grade a homework submission" })
  @Audited({ action: AuditAction.UPDATE, resource: "homework_submission" })
  grade(
    @Param("courseId") courseId: string,
    @Param("id") id: string,
    @Param("submissionId") submissionId: string,
    @Body() dto: GradeHomeworkDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.homeworkService.grade(courseId, id, submissionId, dto, actor);
  }
}
