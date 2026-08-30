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

import { CreateTeacherLeaveRequestDto } from "./dto/create-teacher-leave-request.dto";
import { QueryTeacherLeaveRequestsDto } from "./dto/query-teacher-leave-requests.dto";
import { ReviewTeacherLeaveRequestDto } from "./dto/review-teacher-leave-request.dto";
import { TeacherLeaveRequestsService } from "./teacher-leave-requests.service";
import { ApiPaginatedResponse } from "../../common/decorators/api-paginated.decorator";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Teacher Leave Requests")
@ApiBearerAuth()
@Controller("teacher-leave-requests")
export class TeacherLeaveRequestsController {
  constructor(
    private readonly teacherLeaveRequestsService: TeacherLeaveRequestsService,
  ) {}

  @Post()
  @Permissions(Permission.TEACHER_LEAVE_WRITE)
  @ApiOperation({ summary: "Create a teacher leave request" })
  @Audited({ action: AuditAction.CREATE, resource: "teacher-leave-request" })
  create(@Body() dto: CreateTeacherLeaveRequestDto) {
    return this.teacherLeaveRequestsService.create(dto);
  }

  @Get()
  @Permissions(Permission.TEACHER_LEAVE_READ)
  @ApiOperation({ summary: "List teacher leave requests with filters" })
  @Cacheable({ ttl: 15 })
  @ApiPaginatedResponse(CreateTeacherLeaveRequestDto)
  findAll(@Query() query: QueryTeacherLeaveRequestsDto) {
    return this.teacherLeaveRequestsService.findAll(query);
  }

  @Get(":id")
  @Permissions(Permission.TEACHER_LEAVE_READ)
  @ApiOperation({ summary: "Get a teacher leave request by id" })
  findOne(@Param("id") id: string) {
    return this.teacherLeaveRequestsService.findOne(id);
  }

  @Patch(":id/approve")
  @Permissions(Permission.TEACHER_LEAVE_APPROVE)
  @ApiOperation({ summary: "Approve a teacher leave request" })
  @Audited({ action: AuditAction.UPDATE, resource: "teacher-leave-request" })
  approve(
    @Param("id") id: string,
    @Body() dto: ReviewTeacherLeaveRequestDto,
    @CurrentUser("userId") userId: string,
  ) {
    return this.teacherLeaveRequestsService.approve(id, userId, dto.remarks);
  }

  @Patch(":id/reject")
  @Permissions(Permission.TEACHER_LEAVE_APPROVE)
  @ApiOperation({ summary: "Reject a teacher leave request" })
  @Audited({ action: AuditAction.UPDATE, resource: "teacher-leave-request" })
  reject(
    @Param("id") id: string,
    @Body() dto: ReviewTeacherLeaveRequestDto,
    @CurrentUser("userId") userId: string,
  ) {
    return this.teacherLeaveRequestsService.reject(id, userId, dto.remarks);
  }

  @Patch(":id/cancel")
  @Permissions(Permission.TEACHER_LEAVE_WRITE)
  @ApiOperation({ summary: "Cancel a teacher leave request" })
  @Audited({ action: AuditAction.UPDATE, resource: "teacher-leave-request" })
  cancel(@Param("id") id: string) {
    return this.teacherLeaveRequestsService.cancel(id);
  }

  @Delete(":id")
  @Permissions(Permission.TEACHER_LEAVE_DELETE)
  @ApiOperation({ summary: "Delete a teacher leave request (soft delete)" })
  @Audited({ action: AuditAction.DELETE, resource: "teacher-leave-request" })
  remove(@Param("id") id: string) {
    return this.teacherLeaveRequestsService.remove(id);
  }
}
