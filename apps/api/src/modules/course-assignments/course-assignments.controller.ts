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

import { CourseAssignmentsService } from "./course-assignments.service";
import {
  CreateAssignmentDto,
  GradeSubmissionDto,
  SubmitAssignmentDto,
} from "./dto/assignment.dto";
import { UpdateAssignmentDto } from "./dto/update-assignment.dto";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Course Assignments")
@ApiBearerAuth()
@Controller("courses/:courseId/assignments")
export class CourseAssignmentsController {
  constructor(private readonly assignmentsService: CourseAssignmentsService) {}

  @Post()
  @Permissions(Permission.ASSIGNMENT_WRITE)
  @ApiOperation({ summary: "Create an assignment" })
  @Audited({ action: AuditAction.CREATE, resource: "assignment" })
  create(
    @Param("courseId") courseId: string,
    @Body() dto: CreateAssignmentDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.assignmentsService.create(courseId, dto, actor);
  }

  @Get()
  @Permissions(Permission.ASSIGNMENT_READ)
  @ApiOperation({ summary: "List assignments of a course" })
  @Cacheable({ ttl: 30 })
  findAll(
    @Param("courseId") courseId: string,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    const studentView = actor.role === "STUDENT" || actor.role === "PARENT";
    return this.assignmentsService.findAll(courseId, studentView);
  }

  @Get(":id")
  @Permissions(Permission.ASSIGNMENT_READ)
  @ApiOperation({ summary: "Get a single assignment" })
  findOne(@Param("courseId") courseId: string, @Param("id") id: string) {
    return this.assignmentsService.findOne(courseId, id);
  }

  @Patch(":id")
  @Permissions(Permission.ASSIGNMENT_WRITE)
  @ApiOperation({ summary: "Update an assignment" })
  @Audited({ action: AuditAction.UPDATE, resource: "assignment" })
  update(
    @Param("courseId") courseId: string,
    @Param("id") id: string,
    @Body() dto: UpdateAssignmentDto,
  ) {
    return this.assignmentsService.update(courseId, id, dto);
  }

  @Delete(":id")
  @Permissions(Permission.ASSIGNMENT_DELETE)
  @ApiOperation({ summary: "Deactivate an assignment" })
  @Audited({ action: AuditAction.DELETE, resource: "assignment" })
  remove(@Param("courseId") courseId: string, @Param("id") id: string) {
    return this.assignmentsService.remove(courseId, id);
  }

  @Get(":id/submissions")
  @Permissions(Permission.ASSIGNMENT_READ)
  @ApiOperation({ summary: "List submissions for an assignment" })
  listSubmissions(
    @Param("courseId") courseId: string,
    @Param("id") id: string,
  ) {
    return this.assignmentsService.listSubmissions(courseId, id);
  }

  @Post(":id/submit")
  @Permissions(Permission.ASSIGNMENT_WRITE)
  @ApiOperation({
    summary: "Submit (or update) the calling student's submission",
  })
  @Audited({ action: AuditAction.CREATE, resource: "assignment_submission" })
  submit(
    @Param("courseId") courseId: string,
    @Param("id") id: string,
    @Body() dto: SubmitAssignmentDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.assignmentsService.submit(courseId, id, dto, actor);
  }

  @Post(":id/submissions/:submissionId/grade")
  @Permissions(Permission.ASSIGNMENT_GRADE)
  @ApiOperation({ summary: "Grade a submission" })
  @Audited({ action: AuditAction.UPDATE, resource: "assignment_submission" })
  grade(
    @Param("courseId") courseId: string,
    @Param("id") id: string,
    @Param("submissionId") submissionId: string,
    @Body() dto: GradeSubmissionDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.assignmentsService.grade(
      courseId,
      id,
      submissionId,
      dto,
      actor,
    );
  }
}
