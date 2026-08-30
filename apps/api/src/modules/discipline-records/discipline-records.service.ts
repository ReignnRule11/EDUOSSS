import { Injectable } from "@nestjs/common";
import { DisciplineStatus, type Prisma } from "@prisma/client";

import type { CreateDisciplineRecordDto } from "./dto/create-discipline-record.dto";
import type { QueryDisciplineRecordsDto } from "./dto/query-discipline-records.dto";
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
export class DisciplineRecordsService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(dto: CreateDisciplineRecordDto, recordedById?: string) {
    await this.assertStudentInTenant(dto.studentId);
    return this.prisma.scoped.disciplineRecord.create({
      data: {
        ...dto,
        recordedById,
        status: dto.status ?? DisciplineStatus.OPEN,
      } as Prisma.DisciplineRecordUncheckedCreateInput,
      include: this.include,
    });
  }

  async findAll(query: QueryDisciplineRecordsDto) {
    const pagination = toPaginationArgs(query);
    const conditions: Prisma.DisciplineRecordWhereInput[] = [];
    if (query.studentId) conditions.push({ studentId: query.studentId });
    if (query.category) conditions.push({ category: query.category });
    if (query.severity) conditions.push({ severity: query.severity });
    if (query.status) conditions.push({ status: query.status });
    if (query.from || query.to) {
      conditions.push({
        incidentDate: {
          ...(query.from ? { gte: query.from } : {}),
          ...(query.to ? { lte: query.to } : {}),
        },
      });
    }

    const where: Prisma.DisciplineRecordWhereInput = {
      deletedAt: null,
      AND: conditions.length > 0 ? conditions : undefined,
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.disciplineRecord.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: buildOrderBy(query, [
          "incidentDate",
          "severity",
          "status",
          "createdAt",
        ]) as Prisma.DisciplineRecordOrderByWithRelationInput,
        include: this.include,
      }),
      this.prisma.scoped.disciplineRecord.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  async findOne(id: string) {
    const record = await this.prisma.scoped.disciplineRecord.findFirst({
      where: { id },
      include: this.include,
    });
    if (!record) throw new ResourceNotFoundException("Discipline record", id);
    return record;
  }

  async update(
    id: string,
    dto: Partial<CreateDisciplineRecordDto>,
    resolvedById?: string,
  ) {
    await this.findOne(id);
    const { studentId, ...rest } = dto;
    if (studentId) {
      await this.assertStudentInTenant(studentId);
    }
    const data: Prisma.DisciplineRecordUpdateInput = { ...rest };
    if (dto.status === DisciplineStatus.RESOLVED) {
      data.resolvedById = resolvedById ?? null;
      data.resolvedAt = new Date();
    }
    return this.prisma.scoped.disciplineRecord.update({
      where: { id },
      data,
      include: this.include,
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.scoped.disciplineRecord.updateMany({
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

  private get include(): Prisma.DisciplineRecordInclude {
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
