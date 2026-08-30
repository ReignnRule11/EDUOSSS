import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import type { CreateMedicalRecordDto } from "./dto/create-medical-record.dto";
import type { QueryMedicalRecordsDto } from "./dto/query-medical-records.dto";
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
export class MedicalRecordsService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(dto: CreateMedicalRecordDto, recordedById?: string) {
    await this.assertStudentInTenant(dto.studentId);
    return this.prisma.scoped.medicalRecord.create({
      data: {
        ...dto,
        recordedById,
      } as Prisma.MedicalRecordUncheckedCreateInput,
      include: this.include,
    });
  }

  async findAll(query: QueryMedicalRecordsDto) {
    const pagination = toPaginationArgs(query);
    const conditions: Prisma.MedicalRecordWhereInput[] = [];
    if (query.studentId) conditions.push({ studentId: query.studentId });
    if (query.recordType) conditions.push({ recordType: query.recordType });
    if (query.from || query.to) {
      conditions.push({
        recordDate: {
          ...(query.from ? { gte: query.from } : {}),
          ...(query.to ? { lte: query.to } : {}),
        },
      });
    }

    const where: Prisma.MedicalRecordWhereInput = {
      deletedAt: null,
      AND: conditions.length > 0 ? conditions : undefined,
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.medicalRecord.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: buildOrderBy(query, [
          "recordDate",
          "recordType",
          "createdAt",
        ]) as Prisma.MedicalRecordOrderByWithRelationInput,
        include: this.include,
      }),
      this.prisma.scoped.medicalRecord.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  async findOne(id: string) {
    const record = await this.prisma.scoped.medicalRecord.findFirst({
      where: { id },
      include: this.include,
    });
    if (!record) throw new ResourceNotFoundException("Medical record", id);
    return record;
  }

  async update(id: string, dto: Partial<CreateMedicalRecordDto>) {
    await this.findOne(id);
    const { studentId, ...rest } = dto;
    if (studentId) {
      await this.assertStudentInTenant(studentId);
    }
    return this.prisma.scoped.medicalRecord.update({
      where: { id },
      data: { ...rest } as Prisma.MedicalRecordUpdateInput,
      include: this.include,
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.scoped.medicalRecord.updateMany({
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

  private get include(): Prisma.MedicalRecordInclude {
    return {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNumber: true,
        },
      },
    };
  }
}
