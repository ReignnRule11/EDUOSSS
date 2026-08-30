import { AuditAction, Permission } from "@eduos/shared";
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

import { CourseLessonsService } from "./course-lessons.service";
import { CreateLessonDto } from "./dto/create-lesson.dto";
import { ReorderLessonsDto } from "./dto/reorder-lessons.dto";
import { UpdateLessonDto } from "./dto/update-lesson.dto";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Course Lessons")
@ApiBearerAuth()
@Controller("courses/:courseId/lessons")
export class CourseLessonsController {
  constructor(private readonly lessonsService: CourseLessonsService) {}

  @Post()
  @Permissions(Permission.LESSON_WRITE)
  @ApiOperation({ summary: "Create a lesson inside a course" })
  @Audited({ action: AuditAction.CREATE, resource: "lesson" })
  create(@Param("courseId") courseId: string, @Body() dto: CreateLessonDto) {
    return this.lessonsService.create(courseId, dto);
  }

  @Get()
  @Permissions(Permission.LESSON_READ)
  @ApiOperation({ summary: "List lessons of a course (ordered)" })
  @Cacheable({ ttl: 30 })
  findAll(@Param("courseId") courseId: string) {
    return this.lessonsService.findAll(courseId);
  }

  @Get(":id")
  @Permissions(Permission.LESSON_READ)
  @ApiOperation({ summary: "Get a single lesson" })
  findOne(@Param("courseId") courseId: string, @Param("id") id: string) {
    return this.lessonsService.findOne(courseId, id);
  }

  @Patch(":id")
  @Permissions(Permission.LESSON_WRITE)
  @ApiOperation({ summary: "Update a lesson" })
  @Audited({ action: AuditAction.UPDATE, resource: "lesson" })
  update(
    @Param("courseId") courseId: string,
    @Param("id") id: string,
    @Body() dto: UpdateLessonDto,
  ) {
    return this.lessonsService.update(courseId, id, dto);
  }

  @Post("reorder")
  @Permissions(Permission.LESSON_WRITE)
  @ApiOperation({ summary: "Reorder lessons" })
  @Audited({ action: AuditAction.UPDATE, resource: "lesson" })
  reorder(@Param("courseId") courseId: string, @Body() dto: ReorderLessonsDto) {
    return this.lessonsService.reorder(courseId, dto);
  }

  @Delete(":id")
  @Permissions(Permission.LESSON_DELETE)
  @ApiOperation({ summary: "Deactivate a lesson" })
  @Audited({ action: AuditAction.DELETE, resource: "lesson" })
  remove(@Param("courseId") courseId: string, @Param("id") id: string) {
    return this.lessonsService.remove(courseId, id);
  }
}
