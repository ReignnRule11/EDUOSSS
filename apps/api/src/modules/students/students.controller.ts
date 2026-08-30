import { AuditAction, Permission } from "@eduos/shared";
import type { AuthPrincipal } from "@eduos/shared";
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
  Res,
  StreamableFile,
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
import type { Response } from "express";

import { BulkImportStudentsDto } from "./dto/bulk-import-students.dto";
import { CreateStudentDto } from "./dto/create-student.dto";
import { QueryStudentsDto } from "./dto/query-students.dto";
import { UpdateStudentStatusDto } from "./dto/update-student-status.dto";
import { UpdateStudentDto } from "./dto/update-student.dto";
import { StudentsService } from "./students.service";
import { ApiPaginatedResponse } from "../../common/decorators/api-paginated.decorator";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5 MB

@ApiTags("Students")
@ApiBearerAuth()
@Controller("students")
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @Permissions(Permission.STUDENT_WRITE)
  @ApiOperation({ summary: "Create a student" })
  @Audited({ action: AuditAction.CREATE, resource: "student" })
  create(@Body() dto: CreateStudentDto, @CurrentUser("userId") userId: string) {
    return this.studentsService.create(dto, userId);
  }

  @Post("bulk-import")
  @Permissions(Permission.STUDENT_IMPORT)
  @ApiOperation({ summary: "Bulk import students from a JSON array" })
  @Audited({ action: AuditAction.CREATE, resource: "student" })
  bulkImport(
    @Body() dto: BulkImportStudentsDto,
    @CurrentUser("userId") userId: string,
  ) {
    return this.studentsService.bulkImport(dto, userId);
  }

  @Get("export")
  @Permissions(Permission.STUDENT_EXPORT)
  @ApiOperation({ summary: "Export students as CSV" })
  async export(
    @Query() query: QueryStudentsDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { csv, filename } = await this.studentsService.exportCsv(query);
    res.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    });
    return new StreamableFile(Buffer.from(csv, "utf-8"));
  }

  @Get()
  @Permissions(Permission.STUDENT_READ)
  @ApiOperation({
    summary: "List students with pagination, search and filters",
  })
  @Cacheable({ ttl: 30 })
  @ApiPaginatedResponse(CreateStudentDto)
  findAll(
    @Query() query: QueryStudentsDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.studentsService.findAll(query, actor);
  }

  @Get(":id")
  @Permissions(Permission.STUDENT_READ)
  @ApiOperation({ summary: "Get a student profile by id" })
  findOne(@Param("id") id: string, @CurrentUser() actor: AuthPrincipal) {
    return this.studentsService.findOne(id, actor);
  }

  @Patch(":id")
  @Permissions(Permission.STUDENT_WRITE)
  @ApiOperation({ summary: "Update a student" })
  @Audited({ action: AuditAction.UPDATE, resource: "student" })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateStudentDto,
    @CurrentUser("userId") userId: string,
  ) {
    return this.studentsService.update(id, dto, userId);
  }

  @Patch(":id/status")
  @Permissions(Permission.STUDENT_WRITE)
  @ApiOperation({ summary: "Update a student's academic status" })
  @Audited({ action: AuditAction.UPDATE, resource: "student" })
  updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateStudentStatusDto,
    @CurrentUser("userId") userId: string,
  ) {
    return this.studentsService.updateStatus(id, dto.status, dto.note, userId);
  }

  @Post(":id/photo")
  @Permissions(Permission.STUDENT_WRITE)
  @ApiOperation({ summary: "Upload a profile photo for a student" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: MAX_PHOTO_SIZE },
    }),
  )
  uploadPhoto(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser("userId") userId: string,
  ) {
    if (!file) {
      throw new BadRequestException("No file provided");
    }
    return this.studentsService.uploadPhoto(
      id,
      {
        originalname: file.originalname,
        mimetype: file.mimetype,
        buffer: file.buffer,
        size: file.size,
      },
      userId,
    );
  }

  @Delete(":id")
  @Permissions(Permission.STUDENT_DELETE)
  @ApiOperation({ summary: "Archive a student (soft delete)" })
  @Audited({ action: AuditAction.DELETE, resource: "student" })
  remove(@Param("id") id: string, @CurrentUser("userId") userId: string) {
    return this.studentsService.remove(id, userId);
  }
}
