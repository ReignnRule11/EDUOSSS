import { FileAccess, Permission } from "@eduos/shared";
import type { AuthPrincipal } from "@eduos/shared";
import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
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
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";

import { FilesService } from "./files.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_MEDIA_SIZE = 250 * 1024 * 1024; // 250 MB
const ALLOWED_MEDIA_TYPES = new Set([
  "application/pdf",
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  "audio/x-m4a",
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "application/zip",
]);

@ApiTags("Files")
@ApiBearerAuth()
@Controller("files")
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post("upload")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Permissions(Permission.FILE_UPLOAD)
  @ApiOperation({ summary: "Upload a file (max 10 MB, allowlisted types)" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
          cb(
            new BadRequestException(`Unsupported file type: ${file.mimetype}`),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
    @CurrentUser("userId") userId: string,
  ) {
    if (!file) {
      throw new BadRequestException("No file provided");
    }
    const access =
      req.body?.access === FileAccess.PUBLIC
        ? FileAccess.PUBLIC
        : FileAccess.PRIVATE;
    return this.filesService.upload(
      {
        originalname: file.originalname,
        mimetype: file.mimetype,
        buffer: file.buffer,
        size: file.size,
      },
      access,
      userId,
    );
  }

  @Post("media")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Permissions(Permission.FILE_UPLOAD)
  @ApiOperation({ summary: "Upload media (video/audio/pdf, max 250 MB)" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: MAX_MEDIA_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MEDIA_TYPES.has(file.mimetype)) {
          cb(
            new BadRequestException(
              `Unsupported media type: ${file.mimetype}. Allowed: video/mp4, video/webm, audio/mpeg, audio/mp4, application/pdf`,
            ),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadMedia(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
    @CurrentUser("userId") userId: string,
  ) {
    if (!file) {
      throw new BadRequestException("No file provided");
    }
    const access =
      req.body?.access === FileAccess.PUBLIC
        ? FileAccess.PUBLIC
        : FileAccess.PRIVATE;
    return this.filesService.upload(
      {
        originalname: file.originalname,
        mimetype: file.mimetype,
        buffer: file.buffer,
        size: file.size,
      },
      access,
      userId,
    );
  }

  @Get(":id")
  @Permissions(Permission.FILE_READ)
  @ApiOperation({ summary: "Get file metadata" })
  findOne(@Param("id") id: string, @CurrentUser() principal: AuthPrincipal) {
    return this.filesService.findOne(id, principal);
  }

  @Get(":id/download")
  @Permissions(Permission.FILE_READ)
  @ApiOperation({ summary: "Stream a file download" })
  async download(
    @Param("id") id: string,
    @CurrentUser() principal: AuthPrincipal,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { body, mimeType, originalName } = await this.filesService.download(
      id,
      principal,
    );
    res.setHeader("Content-Type", mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${originalName}"`,
    );
    return new StreamableFile(body);
  }

  @Delete(":id")
  @Permissions(Permission.FILE_DELETE)
  @ApiOperation({ summary: "Delete a file and free its storage" })
  remove(@Param("id") id: string, @CurrentUser() principal: AuthPrincipal) {
    return this.filesService.remove(id, principal);
  }
}
