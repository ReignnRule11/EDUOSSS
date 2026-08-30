import { createHash, randomUUID } from "crypto";

import { Injectable } from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { FileAccess } from "@prisma/client";

import { TenantContext } from "../../common/context/tenant.context";
import {
  ForbiddenOperationException,
  ResourceNotFoundException,
  UnauthorizedOperationException,
} from "../../common/exceptions/business.exceptions";
import { validateUpload } from "../../common/utils/file-validation.util";
import { isViewerRole } from "../../common/utils/student-scope.util";
import { PrismaService } from "../../database/prisma.service";
import type { StorageDriver } from "../../storage/storage.interface";
import { STORAGE_DRIVER_TOKEN } from "../../storage/storage.module";

export interface UploadFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_DRIVER_TOKEN) private readonly storage: StorageDriver,
  ) {}

  async upload(
    file: UploadFile,
    access: FileAccess = FileAccess.PRIVATE,
    uploaderId?: string,
  ) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new UnauthorizedOperationException();

    // Server-side content validation: never trust client MIME/extension/size.
    const { originalname, ext } = validateUpload(file);

    const checksum = createHash("sha256").update(file.buffer).digest("hex");
    const key = this.buildKey(tenantId, ext, originalname);

    const result = await this.storage.upload({
      key,
      body: file.buffer,
      mimeType: file.mimetype,
      access,
    });

    const driver = result.bucket ? "S3" : "LOCAL";

    const record = await this.prisma.scoped.storedFile.create({
      data: {
        tenantId,
        uploaderId,
        originalName: originalname,
        mimeType: file.mimetype,
        size: file.size,
        key,
        url: result.url,
        bucket: result.bucket,
        driver,
        access,
        checksum,
      },
    });

    await this.incrementStorage(tenantId, BigInt(file.size));
    return record;
  }

  async findOne(id: string, principal?: { userId?: string; role?: string }) {
    const record = await this.prisma.scoped.storedFile.findFirst({
      where: { id },
    });
    if (!record) throw new ResourceNotFoundException("File", id);
    this.assertCanAccess(record, principal);
    return record;
  }

  async download(id: string, principal?: { userId?: string; role?: string }) {
    const record = await this.findOne(id, principal);
    if (record.access === FileAccess.PRIVATE && !principal?.userId) {
      throw new ForbiddenOperationException(
        "Private file requires authentication",
      );
    }
    const { body, mimeType } = await this.storage.download(record.key);
    return { body, mimeType, originalName: record.originalName };
  }

  async remove(
    id: string,
    principal?: { userId?: string; role?: string },
  ): Promise<void> {
    const record = await this.findOne(id, principal);
    await this.storage.delete(record.key);
    await this.prisma.scoped.storedFile.deleteMany({ where: { id } });
    await this.incrementStorage(record.tenantId, -BigInt(record.size));
  }

  /**
   * Object-level authorization:
   * - The uploader may always access their own file.
   * - Non-viewer roles (staff/admins) may access any file in the tenant.
   * - Viewer roles (STUDENT/PARENT) may only access files they uploaded.
   * The caller (controller) is responsible for the FILE_READ/FILE_DELETE
   * permission check; this enforces ownership on top of that.
   */
  private assertCanAccess(
    record: { uploaderId: string | null; access: FileAccess },
    principal?: { userId?: string; role?: string },
  ): void {
    if (!principal?.userId) {
      throw new ForbiddenOperationException(
        "File access requires authentication",
      );
    }
    if (record.uploaderId === principal.userId) return;
    if (principal.role && !isViewerRole(principal.role)) return;
    throw new ForbiddenOperationException(
      "You do not have access to this file",
    );
  }

  private buildKey(
    tenantId: string,
    ext: string,
    _originalName: string,
  ): string {
    const year = new Date().getFullYear();
    // Storage keys are always generated, never derived from the client
    // filename, so path traversal is impossible.
    return `${tenantId}/${year}/${randomUUID()}${ext ? `.${ext}` : ""}`;
  }

  private async incrementStorage(
    tenantId: string,
    delta: bigint,
  ): Promise<void> {
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { storageUsed: { increment: delta } },
    });
  }
}
