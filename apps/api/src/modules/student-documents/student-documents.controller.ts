import { AuditAction, Permission } from "@eduos/shared";
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

import { CreateStudentDocumentDto } from "./dto/create-student-document.dto";
import { QueryStudentDocumentsDto } from "./dto/query-student-documents.dto";
import { UpdateStudentDocumentDto } from "./dto/update-student-document.dto";
import { StudentDocumentsService } from "./student-documents.service";
import { ApiPaginatedResponse } from "../../common/decorators/api-paginated.decorator";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

@ApiTags("Student Documents")
@ApiBearerAuth()
@Controller("student-documents")
export class StudentDocumentsController {
  constructor(
    private readonly studentDocumentsService: StudentDocumentsService,
  ) {}

  @Post("upload")
  @Permissions(Permission.STUDENT_DOCUMENT_WRITE)
  @ApiOperation({
    summary: "Upload a file and attach it as a student document",
  })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: CreateStudentDocumentDto,
    @CurrentUser("userId") userId: string,
  ) {
    if (!file) {
      throw new BadRequestException("No file provided");
    }
    return this.studentDocumentsService.upload(
      dto,
      {
        originalname: file.originalname,
        mimetype: file.mimetype,
        buffer: file.buffer,
        size: file.size,
      },
      userId,
    );
  }

  @Post()
  @Permissions(Permission.STUDENT_DOCUMENT_WRITE)
  @ApiOperation({
    summary: "Create a student document from an existing fileId",
  })
  @Audited({ action: AuditAction.CREATE, resource: "student-document" })
  create(
    @Body() dto: CreateStudentDocumentDto & { fileId: string },
    @CurrentUser("userId") userId: string,
  ) {
    if (!dto.fileId) {
      throw new BadRequestException("fileId is required");
    }
    return this.studentDocumentsService.create(dto, dto.fileId, userId);
  }

  @Get()
  @Permissions(Permission.STUDENT_DOCUMENT_READ)
  @ApiOperation({ summary: "List student documents with filters" })
  @Cacheable({ ttl: 15 })
  @ApiPaginatedResponse(CreateStudentDocumentDto)
  findAll(@Query() query: QueryStudentDocumentsDto) {
    return this.studentDocumentsService.findAll(query);
  }

  @Get(":id")
  @Permissions(Permission.STUDENT_DOCUMENT_READ)
  @ApiOperation({ summary: "Get a student document by id" })
  findOne(@Param("id") id: string) {
    return this.studentDocumentsService.findOne(id);
  }

  @Patch(":id")
  @Permissions(Permission.STUDENT_DOCUMENT_WRITE)
  @ApiOperation({ summary: "Update a student document" })
  @Audited({ action: AuditAction.UPDATE, resource: "student-document" })
  update(@Param("id") id: string, @Body() dto: UpdateStudentDocumentDto) {
    return this.studentDocumentsService.update(id, dto);
  }

  @Delete(":id")
  @Permissions(Permission.STUDENT_DOCUMENT_DELETE)
  @ApiOperation({ summary: "Delete a student document (soft delete)" })
  @Audited({ action: AuditAction.DELETE, resource: "student-document" })
  remove(@Param("id") id: string) {
    return this.studentDocumentsService.remove(id);
  }
}
