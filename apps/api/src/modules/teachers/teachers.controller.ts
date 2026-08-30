import { AuditAction, FileAccess, Permission } from "@eduos/shared";
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

import { FilesService } from "../files/files.service";
import { CreateTeacherDto } from "./dto/create-teacher.dto";
import { QueryTeachersDto } from "./dto/query-teachers.dto";
import { UpdateTeacherDto } from "./dto/update-teacher.dto";
import { TeachersService } from "./teachers.service";
import { ApiPaginatedResponse } from "../../common/decorators/api-paginated.decorator";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

@ApiTags("Teachers")
@ApiBearerAuth()
@Controller("teachers")
export class TeachersController {
  constructor(
    private readonly teachersService: TeachersService,
    private readonly filesService: FilesService,
  ) {}

  @Post()
  @Permissions(Permission.TEACHER_WRITE)
  @ApiOperation({ summary: "Create a teacher" })
  @Audited({ action: AuditAction.CREATE, resource: "teacher" })
  create(@Body() dto: CreateTeacherDto) {
    return this.teachersService.create(dto);
  }

  @Get()
  @Permissions(Permission.TEACHER_READ)
  @ApiOperation({
    summary: "List teachers with pagination, search and filters",
  })
  @Cacheable({ ttl: 30 })
  @ApiPaginatedResponse(CreateTeacherDto)
  findAll(@Query() query: QueryTeachersDto) {
    return this.teachersService.findAll(query);
  }

  @Get("dashboard/stats")
  @Permissions(Permission.TEACHER_READ)
  @ApiOperation({ summary: "Teacher dashboard statistics" })
  @Cacheable({ ttl: 30 })
  getDashboardStats() {
    return this.teachersService.getDashboardStats();
  }

  @Get(":id/profile")
  @Permissions(Permission.TEACHER_READ)
  @ApiOperation({
    summary: "Get a teacher's full profile with related records",
  })
  getProfile(@Param("id") id: string) {
    return this.teachersService.getProfile(id);
  }

  @Post(":id/photo")
  @Permissions(Permission.TEACHER_WRITE)
  @ApiOperation({ summary: "Upload a teacher photo" })
  @ApiConsumes("multipart/form-data")
  @Audited({ action: AuditAction.UPDATE, resource: "teacher" })
  @UseInterceptors(
    FileInterceptor("photo", {
      limits: { fileSize: MAX_PHOTO_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_PHOTO_TYPES.has(file.mimetype)) {
          cb(
            new BadRequestException(
              `Unsupported photo type: ${file.mimetype}. Use PNG, JPEG or WebP.`,
            ),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadPhoto(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser("userId") userId: string,
  ) {
    if (!file) {
      throw new BadRequestException("No photo provided");
    }
    const stored = await this.filesService.upload(
      {
        originalname: file.originalname,
        mimetype: file.mimetype,
        buffer: file.buffer,
        size: file.size,
      },
      FileAccess.PUBLIC,
      userId,
    );
    return this.teachersService.setPhoto(id, stored.url);
  }

  @Get(":id")
  @Permissions(Permission.TEACHER_READ)
  @ApiOperation({ summary: "Get a teacher by id" })
  findOne(@Param("id") id: string) {
    return this.teachersService.findOne(id);
  }

  @Patch(":id")
  @Permissions(Permission.TEACHER_WRITE)
  @ApiOperation({ summary: "Update a teacher" })
  @Audited({ action: AuditAction.UPDATE, resource: "teacher" })
  update(@Param("id") id: string, @Body() dto: UpdateTeacherDto) {
    return this.teachersService.update(id, dto);
  }

  @Delete(":id")
  @Permissions(Permission.TEACHER_DELETE)
  @ApiOperation({ summary: "Deactivate a teacher (soft delete)" })
  @Audited({ action: AuditAction.DELETE, resource: "teacher" })
  remove(@Param("id") id: string) {
    return this.teachersService.remove(id);
  }
}
