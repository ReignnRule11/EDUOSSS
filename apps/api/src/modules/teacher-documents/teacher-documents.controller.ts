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

import { CreateTeacherDocumentDto } from "./dto/create-teacher-document.dto";
import { QueryTeacherDocumentsDto } from "./dto/query-teacher-documents.dto";
import { UpdateTeacherDocumentDto } from "./dto/update-teacher-document.dto";
import { TeacherDocumentsService } from "./teacher-documents.service";
import { ApiPaginatedResponse } from "../../common/decorators/api-paginated.decorator";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Teacher Documents")
@ApiBearerAuth()
@Controller("teacher-documents")
export class TeacherDocumentsController {
  constructor(
    private readonly teacherDocumentsService: TeacherDocumentsService,
  ) {}

  @Post()
  @Permissions(Permission.TEACHER_DOCUMENT_WRITE)
  @ApiOperation({ summary: "Link a document to a teacher" })
  @Audited({ action: AuditAction.CREATE, resource: "teacher-document" })
  create(
    @Body() dto: CreateTeacherDocumentDto,
    @CurrentUser("userId") userId: string,
  ) {
    return this.teacherDocumentsService.create(dto, userId);
  }

  @Get()
  @Permissions(Permission.TEACHER_DOCUMENT_READ)
  @ApiOperation({ summary: "List teacher documents with filters" })
  @Cacheable({ ttl: 15 })
  @ApiPaginatedResponse(CreateTeacherDocumentDto)
  findAll(@Query() query: QueryTeacherDocumentsDto) {
    return this.teacherDocumentsService.findAll(query);
  }

  @Get(":id")
  @Permissions(Permission.TEACHER_DOCUMENT_READ)
  @ApiOperation({ summary: "Get a teacher document by id" })
  findOne(@Param("id") id: string) {
    return this.teacherDocumentsService.findOne(id);
  }

  @Patch(":id")
  @Permissions(Permission.TEACHER_DOCUMENT_WRITE)
  @ApiOperation({ summary: "Update a teacher document" })
  @Audited({ action: AuditAction.UPDATE, resource: "teacher-document" })
  update(@Param("id") id: string, @Body() dto: UpdateTeacherDocumentDto) {
    return this.teacherDocumentsService.update(id, dto);
  }

  @Delete(":id")
  @Permissions(Permission.TEACHER_DOCUMENT_DELETE)
  @ApiOperation({ summary: "Delete a teacher document (soft delete)" })
  @Audited({ action: AuditAction.DELETE, resource: "teacher-document" })
  remove(@Param("id") id: string) {
    return this.teacherDocumentsService.remove(id);
  }
}
