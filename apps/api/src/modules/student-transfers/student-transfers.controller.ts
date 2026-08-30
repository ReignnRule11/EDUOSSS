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

import { CreateStudentTransferDto } from "./dto/create-student-transfer.dto";
import { QueryStudentTransfersDto } from "./dto/query-student-transfers.dto";
import { UpdateStudentTransferDto } from "./dto/update-student-transfer.dto";
import { StudentTransfersService } from "./student-transfers.service";
import { ApiPaginatedResponse } from "../../common/decorators/api-paginated.decorator";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Student Transfers")
@ApiBearerAuth()
@Controller("student-transfers")
export class StudentTransfersController {
  constructor(
    private readonly studentTransfersService: StudentTransfersService,
  ) {}

  @Post()
  @Permissions(Permission.TRANSFER_WRITE)
  @ApiOperation({ summary: "Create a student transfer request" })
  @Audited({ action: AuditAction.CREATE, resource: "student-transfer" })
  create(
    @Body() dto: CreateStudentTransferDto,
    @CurrentUser("userId") userId: string,
  ) {
    return this.studentTransfersService.create(dto, userId);
  }

  @Get()
  @Permissions(Permission.TRANSFER_READ)
  @ApiOperation({ summary: "List student transfers with filters" })
  @Cacheable({ ttl: 15 })
  @ApiPaginatedResponse(CreateStudentTransferDto)
  findAll(@Query() query: QueryStudentTransfersDto) {
    return this.studentTransfersService.findAll(query);
  }

  @Get(":id")
  @Permissions(Permission.TRANSFER_READ)
  @ApiOperation({ summary: "Get a student transfer by id" })
  findOne(@Param("id") id: string) {
    return this.studentTransfersService.findOne(id);
  }

  @Patch(":id")
  @Permissions(Permission.TRANSFER_WRITE)
  @ApiOperation({ summary: "Update a student transfer" })
  @Audited({ action: AuditAction.UPDATE, resource: "student-transfer" })
  update(@Param("id") id: string, @Body() dto: UpdateStudentTransferDto) {
    return this.studentTransfersService.update(id, dto);
  }

  @Post(":id/approve")
  @Permissions(Permission.TRANSFER_WRITE)
  @ApiOperation({ summary: "Approve a pending transfer" })
  @Audited({ action: AuditAction.UPDATE, resource: "student-transfer" })
  approve(@Param("id") id: string, @CurrentUser("userId") userId: string) {
    return this.studentTransfersService.approve(id, userId);
  }

  @Post(":id/complete")
  @Permissions(Permission.TRANSFER_WRITE)
  @ApiOperation({
    summary: "Complete an approved transfer and move the student",
  })
  @Audited({ action: AuditAction.UPDATE, resource: "student-transfer" })
  complete(@Param("id") id: string, @CurrentUser("userId") userId: string) {
    return this.studentTransfersService.complete(id, userId);
  }

  @Post(":id/reject")
  @Permissions(Permission.TRANSFER_WRITE)
  @ApiOperation({ summary: "Reject a pending transfer" })
  @Audited({ action: AuditAction.UPDATE, resource: "student-transfer" })
  reject(@Param("id") id: string, @CurrentUser("userId") userId: string) {
    return this.studentTransfersService.reject(id, userId);
  }

  @Delete(":id")
  @Permissions(Permission.TRANSFER_DELETE)
  @ApiOperation({ summary: "Delete a student transfer (soft delete)" })
  @Audited({ action: AuditAction.DELETE, resource: "student-transfer" })
  remove(@Param("id") id: string) {
    return this.studentTransfersService.remove(id);
  }
}
