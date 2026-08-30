import { Injectable } from "@nestjs/common";
import { type Prisma } from "@prisma/client";

import type { CreateTeacherDocumentDto } from "./dto/create-teacher-document.dto";
import type { QueryTeacherDocumentsDto } from "./dto/query-teacher-documents.dto";
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

@Injectable()
export class TeacherDocumentsService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(dto: CreateTeacherDocumentDto, uploadedById?: string) {
    await this.assertTeacherInTenant(dto.teacherId);
    const file = dto.fileId
      ? await this.prisma.scoped.storedFile.findFirst({
          where: { id: dto.fileId },
          select: { id: true, originalName: true, mimeType: true, size: true },
        })
      : null;
    if (dto.fileId && !file) {
      throw new BadRequestOperationException(
        "The provided fileId does not belong to this tenant",
      );
    }
    return this.prisma.scoped.teacherDocument.create({
      data: {
        teacherId: dto.teacherId,
        name: dto.name,
        category: dto.category ?? "OTHER",
        fileId: file?.id,
        fileName: file?.originalName,
        mimeType: file?.mimeType,
        fileSize: file?.size,
        notes: dto.notes,
        uploadedById,
      } as Prisma.TeacherDocumentUncheckedCreateInput,
      include: this.include,
    });
  }

  async findAll(query: QueryTeacherDocumentsDto) {
    const pagination = toPaginationArgs(query);
    const conditions: Prisma.TeacherDocumentWhereInput[] = [];
    if (query.teacherId) conditions.push({ teacherId: query.teacherId });
    if (query.category) conditions.push({ category: query.category });

    const where: Prisma.TeacherDocumentWhereInput = {
      deletedAt: null,
      AND: conditions.length > 0 ? conditions : undefined,
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.teacherDocument.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: buildOrderBy(query, [
          "createdAt",
        ]) as Prisma.TeacherDocumentOrderByWithRelationInput,
        include: this.include,
      }),
      this.prisma.scoped.teacherDocument.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  async findOne(id: string) {
    const record = await this.prisma.scoped.teacherDocument.findFirst({
      where: { id },
      include: this.include,
    });
    if (!record) throw new ResourceNotFoundException("Teacher document", id);
    return record;
  }

  async update(id: string, dto: Partial<CreateTeacherDocumentDto>) {
    await this.findOne(id);
    const { teacherId, fileId, ...rest } = dto;
    if (teacherId) await this.assertTeacherInTenant(teacherId);
    let filePatch: Prisma.TeacherDocumentUncheckedUpdateInput = {};
    if (fileId) {
      const file = await this.prisma.scoped.storedFile.findFirst({
        where: { id: fileId },
        select: { id: true, originalName: true, mimeType: true, size: true },
      });
      if (!file) {
        throw new BadRequestOperationException(
          "The provided fileId does not belong to this tenant",
        );
      }
      filePatch = {
        fileId: file.id,
        fileName: file.originalName,
        mimeType: file.mimeType,
        fileSize: file.size,
      };
    }
    return this.prisma.scoped.teacherDocument.update({
      where: { id },
      data: {
        ...rest,
        ...filePatch,
      } as Prisma.TeacherDocumentUncheckedUpdateInput,
      include: this.include,
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.scoped.teacherDocument.updateMany({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async assertTeacherInTenant(teacherId: string): Promise<void> {
    const teacher = await this.prisma.scoped.teacher.findFirst({
      where: { id: teacherId },
      select: { id: true },
    });
    if (!teacher) {
      throw new BadRequestOperationException(
        "The provided teacherId does not belong to this tenant",
      );
    }
  }

  private get include(): Prisma.TeacherDocumentInclude {
    return {
      teacher: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          staffNumber: true,
        },
      },
    };
  }
}
