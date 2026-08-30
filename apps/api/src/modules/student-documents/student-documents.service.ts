import { Injectable } from "@nestjs/common";
import { FileAccess, type Prisma } from "@prisma/client";

import type { CreateStudentDocumentDto } from "./dto/create-student-document.dto";
import type { QueryStudentDocumentsDto } from "./dto/query-student-documents.dto";
import {
  BadRequestOperationException,
  ResourceNotFoundException,
} from "../../common/exceptions/business.exceptions";
import { BaseRepository } from "../../common/repositories/base.repository";
import {
  buildOrderBy,
  buildPaginationMeta,
  toPaginationArgs,
} from "../../common/utils/pagination.util";
import { PrismaService } from "../../database/prisma.service";
import { FilesService } from "../files/files.service";

export interface UploadedDocumentInput {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@Injectable()
export class StudentDocumentsService extends BaseRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
  ) {
    super();
  }

  /** Creates a document record linked to an already-uploaded StoredFile. */
  async create(
    dto: CreateStudentDocumentDto,
    fileId: string,
    uploadedById?: string,
  ) {
    await this.assertStudentInTenant(dto.studentId);
    const file = await this.filesService.findOne(fileId);

    return this.prisma.scoped.studentDocument.create({
      data: {
        studentId: dto.studentId,
        name: dto.name,
        category: dto.category ?? "OTHER",
        notes: dto.notes,
        fileId,
        fileName: file.originalName,
        mimeType: file.mimeType,
        fileSize: file.size,
        uploadedById,
      } as Prisma.StudentDocumentUncheckedCreateInput,
      include: this.include,
    });
  }

  /** Uploads a file through the storage layer and links it to the document. */
  async upload(
    dto: CreateStudentDocumentDto,
    file: UploadedDocumentInput,
    uploadedById: string,
  ) {
    const stored = await this.filesService.upload(
      {
        originalname: file.originalname,
        mimetype: file.mimetype,
        buffer: file.buffer,
        size: file.size,
      },
      FileAccess.PRIVATE,
      uploadedById,
    );
    return this.create(dto, stored.id, uploadedById);
  }

  async findAll(query: QueryStudentDocumentsDto) {
    const pagination = toPaginationArgs(query);
    const conditions: Prisma.StudentDocumentWhereInput[] = [];
    if (query.studentId) conditions.push({ studentId: query.studentId });
    if (query.category) conditions.push({ category: query.category });

    const where: Prisma.StudentDocumentWhereInput = {
      deletedAt: null,
      AND: conditions.length > 0 ? conditions : undefined,
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.studentDocument.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: buildOrderBy(query, [
          "name",
          "category",
          "createdAt",
        ]) as Prisma.StudentDocumentOrderByWithRelationInput,
        include: this.include,
      }),
      this.prisma.scoped.studentDocument.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  async findOne(id: string) {
    const document = await this.prisma.scoped.studentDocument.findFirst({
      where: { id },
      include: this.include,
    });
    if (!document) throw new ResourceNotFoundException("Student document", id);
    return document;
  }

  async update(id: string, dto: Partial<CreateStudentDocumentDto>) {
    await this.findOne(id);
    const { studentId, ...rest } = dto;
    if (studentId) {
      await this.assertStudentInTenant(studentId);
    }
    return this.prisma.scoped.studentDocument.update({
      where: { id },
      data: { ...rest } as Prisma.StudentDocumentUpdateInput,
      include: this.include,
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.scoped.studentDocument.updateMany({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async assertStudentInTenant(studentId: string): Promise<void> {
    const student = await this.prisma.scoped.student.findFirst({
      where: { id: studentId },
      select: { id: true },
    });
    if (!student) {
      throw new BadRequestOperationException(
        "The provided studentId does not belong to this tenant",
      );
    }
  }

  private get include(): Prisma.StudentDocumentInclude {
    return {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNumber: true,
        },
      },
      file: {
        select: {
          id: true,
          originalName: true,
          mimeType: true,
          size: true,
          url: true,
        },
      },
    };
  }
}
