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

import { CourseForumService } from "./course-forum.service";
import { CreateReplyDto, CreateThreadDto } from "./dto/create-thread.dto";
import { QueryThreadsDto } from "./dto/query-threads.dto";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Course Forum")
@ApiBearerAuth()
@Controller("courses/:courseId/forum")
export class CourseForumController {
  constructor(private readonly forumService: CourseForumService) {}

  @Post("threads")
  @Permissions(Permission.FORUM_WRITE)
  @ApiOperation({ summary: "Create a discussion thread" })
  @Audited({ action: AuditAction.CREATE, resource: "forum_thread" })
  createThread(
    @Param("courseId") courseId: string,
    @Body() dto: CreateThreadDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.forumService.createThread(courseId, dto, actor);
  }

  @Get("threads")
  @Permissions(Permission.FORUM_READ)
  @ApiOperation({ summary: "List discussion threads of a course" })
  @Cacheable({ ttl: 30 })
  findAllThreads(
    @Param("courseId") courseId: string,
    @Query() query: QueryThreadsDto,
  ) {
    return this.forumService.findAllThreads(courseId, query);
  }

  @Get("threads/:id")
  @Permissions(Permission.FORUM_READ)
  @ApiOperation({ summary: "Get a thread with its replies" })
  findThread(@Param("courseId") courseId: string, @Param("id") id: string) {
    return this.forumService.findThread(courseId, id);
  }

  @Patch("threads/:id")
  @Permissions(Permission.FORUM_WRITE)
  @ApiOperation({ summary: "Update a thread (owner or staff)" })
  @Audited({ action: AuditAction.UPDATE, resource: "forum_thread" })
  updateThread(
    @Param("courseId") courseId: string,
    @Param("id") id: string,
    @Body() dto: Partial<CreateThreadDto>,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.forumService.updateThread(courseId, id, dto, actor);
  }

  @Delete("threads/:id")
  @Permissions(Permission.FORUM_DELETE)
  @ApiOperation({ summary: "Delete a thread (owner or staff)" })
  @Audited({ action: AuditAction.DELETE, resource: "forum_thread" })
  removeThread(
    @Param("courseId") courseId: string,
    @Param("id") id: string,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.forumService.removeThread(courseId, id, actor);
  }

  @Post("threads/:id/replies")
  @Permissions(Permission.FORUM_WRITE)
  @ApiOperation({ summary: "Reply to a thread" })
  @Audited({ action: AuditAction.CREATE, resource: "forum_reply" })
  createReply(
    @Param("courseId") courseId: string,
    @Param("id") id: string,
    @Body() dto: CreateReplyDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.forumService.createReply(courseId, id, dto, actor);
  }

  @Delete("replies/:id")
  @Permissions(Permission.FORUM_DELETE)
  @ApiOperation({ summary: "Delete a reply (owner or staff)" })
  @Audited({ action: AuditAction.DELETE, resource: "forum_reply" })
  removeReply(
    @Param("courseId") courseId: string,
    @Param("id") id: string,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.forumService.removeReply(courseId, id, actor);
  }
}
