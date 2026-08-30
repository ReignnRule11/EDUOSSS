import { Permission } from "@eduos/shared";
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

import { QueryMessagesDto, SendMessageDto } from "./dto/parent-portal.dto";
import { ParentPortalService } from "./parent-portal.service";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Parent Portal")
@ApiBearerAuth()
@Controller("parent")
export class ParentPortalController {
  constructor(private readonly parentService: ParentPortalService) {}

  @Get("children")
  @Permissions(Permission.PARENT_CHILD_READ)
  @ApiOperation({ summary: "List the parent's children" })
  children(@CurrentUser() actor: AuthPrincipal) {
    return this.parentService.findChildren(actor);
  }

  @Get("children/:childId/dashboard")
  @Permissions(Permission.PARENT_CHILD_READ)
  @ApiOperation({ summary: "Per-child dashboard overview" })
  childDashboard(
    @Param("childId") childId: string,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.parentService.childDashboard(childId, actor);
  }

  @Get("children/:childId/attendance")
  @Permissions(Permission.PARENT_CHILD_READ)
  @ApiOperation({ summary: "Child attendance records and summary" })
  childAttendance(
    @Param("childId") childId: string,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.parentService.childAttendance(childId, actor);
  }

  @Get("children/:childId/results")
  @Permissions(Permission.PARENT_CHILD_READ)
  @ApiOperation({ summary: "Child report cards (approved/released)" })
  childResults(
    @Param("childId") childId: string,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.parentService.childResults(childId, actor);
  }

  @Get("children/:childId/assignments")
  @Permissions(Permission.PARENT_CHILD_READ)
  @ApiOperation({ summary: "Child assignments with submission status" })
  childAssignments(
    @Param("childId") childId: string,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.parentService.childAssignments(childId, actor);
  }

  @Get("children/:childId/payments")
  @Permissions(Permission.PARENT_CHILD_READ)
  @ApiOperation({ summary: "Child invoices and payment history" })
  childPayments(
    @Param("childId") childId: string,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.parentService.childPayments(childId, actor);
  }

  @Get("children/:childId/notifications")
  @Permissions(Permission.PARENT_CHILD_READ)
  @ApiOperation({ summary: "Child's parent-notification log" })
  childNotifications(
    @Param("childId") childId: string,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.parentService.childNotifications(childId, actor);
  }

  @Get("children/:childId/teachers")
  @Permissions(Permission.PARENT_CHILD_READ)
  @ApiOperation({ summary: "Teachers available for messaging" })
  availableTeachers(
    @Param("childId") childId: string,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.parentService.availableTeachers(childId, actor);
  }

  @Get("messages")
  @Permissions(Permission.PARENT_MESSAGE_READ)
  @ApiOperation({ summary: "List parent-teacher messages" })
  listMessages(
    @Query() query: QueryMessagesDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.parentService.listMessages(actor, query);
  }

  @Get("messages/unread-count")
  @Permissions(Permission.PARENT_MESSAGE_READ)
  @ApiOperation({ summary: "Unread message count" })
  @Cacheable({ ttl: 30 })
  unreadCount(@CurrentUser() actor: AuthPrincipal) {
    return this.parentService.unreadCount(actor);
  }

  @Post("messages")
  @Permissions(Permission.PARENT_MESSAGE_WRITE)
  @ApiOperation({ summary: "Send a message to a teacher" })
  sendMessage(
    @Body() dto: SendMessageDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.parentService.sendMessage(actor, dto);
  }

  @Patch("messages/:id/read")
  @Permissions(Permission.PARENT_MESSAGE_WRITE)
  @ApiOperation({ summary: "Mark a message as read" })
  markRead(@Param("id") id: string, @CurrentUser() actor: AuthPrincipal) {
    return this.parentService.markMessageRead(id, actor);
  }

  @Get("announcements")
  @Permissions(Permission.PARENT_CHILD_READ)
  @ApiOperation({ summary: "School announcements" })
  @Cacheable({ ttl: 30 })
  announcements(@CurrentUser() actor: AuthPrincipal) {
    return this.parentService.announcements(actor);
  }

  @Get("profile")
  @Permissions(Permission.PARENT_CHILD_READ)
  @ApiOperation({ summary: "Parent profile and linked guardians" })
  profile(@CurrentUser() actor: AuthPrincipal) {
    return this.parentService.profile(actor);
  }
}
