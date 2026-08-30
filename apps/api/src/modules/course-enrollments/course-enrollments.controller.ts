import { AuditAction, Permission } from "@eduos/shared";
import type { AuthPrincipal } from "@eduos/shared";
import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CourseEnrollmentsService } from "./course-enrollments.service";
import {
  EnrollStudentsDto,
  UpdateLessonProgressDto,
} from "./dto/enroll-students.dto";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Course Enrollments")
@ApiBearerAuth()
@Controller("courses/:courseId/enrollments")
export class CourseEnrollmentsController {
  constructor(private readonly enrollmentsService: CourseEnrollmentsService) {}

  @Post()
  @Permissions(Permission.COURSE_ENROLLMENT_WRITE)
  @ApiOperation({
    summary: "Enroll students (or self when no studentIds provided)",
  })
  @Audited({ action: AuditAction.CREATE, resource: "course_enrollment" })
  enroll(
    @Param("courseId") courseId: string,
    @Body() dto: EnrollStudentsDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.enrollmentsService.enroll(courseId, dto, actor);
  }

  @Get()
  @Permissions(Permission.COURSE_ENROLLMENT_READ)
  @ApiOperation({ summary: "List enrollments of a course" })
  @Cacheable({ ttl: 30 })
  findAll(@Param("courseId") courseId: string) {
    return this.enrollmentsService.findAll(courseId);
  }

  @Get(":id")
  @Permissions(Permission.COURSE_ENROLLMENT_READ)
  @ApiOperation({ summary: "Get an enrollment with lesson progress" })
  findOne(@Param("courseId") courseId: string, @Param("id") id: string) {
    return this.enrollmentsService.findOne(courseId, id);
  }

  @Delete(":id")
  @Permissions(Permission.COURSE_ENROLLMENT_DELETE)
  @ApiOperation({ summary: "Drop a student from the course" })
  @Audited({ action: AuditAction.DELETE, resource: "course_enrollment" })
  drop(@Param("courseId") courseId: string, @Param("id") id: string) {
    return this.enrollmentsService.drop(courseId, id);
  }
}

@ApiTags("My Enrollments")
@ApiBearerAuth()
@Controller("enrollments/mine")
export class MyEnrollmentsController {
  constructor(private readonly enrollmentsService: CourseEnrollmentsService) {}

  @Get()
  @Permissions(Permission.COURSE_ENROLLMENT_READ)
  @ApiOperation({ summary: "List the calling student's enrolled courses" })
  findMine(@CurrentUser() actor: AuthPrincipal) {
    return this.enrollmentsService.findMine(actor);
  }

  @Get(":courseId")
  @Permissions(Permission.COURSE_PROGRESS_READ)
  @ApiOperation({
    summary: "My detailed progress in one course (lessons + status)",
  })
  findMineForCourse(
    @Param("courseId") courseId: string,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.enrollmentsService.findMineForCourse(courseId, actor);
  }

  @Post(":courseId/progress/:lessonId")
  @Permissions(Permission.COURSE_PROGRESS_WRITE)
  @ApiOperation({ summary: "Record progress on a lesson" })
  @Audited({ action: AuditAction.UPDATE, resource: "course_progress" })
  updateProgress(
    @Param("courseId") courseId: string,
    @Param("lessonId") lessonId: string,
    @Body() dto: UpdateLessonProgressDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.enrollmentsService.updateLessonProgress(
      courseId,
      lessonId,
      dto,
      actor,
    );
  }
}
