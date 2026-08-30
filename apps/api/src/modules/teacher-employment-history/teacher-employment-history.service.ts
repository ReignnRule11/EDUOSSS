import { Injectable } from "@nestjs/common";
import { type Prisma } from "@prisma/client";

import type { CreateTeacherEmploymentHistoryDto } from "./dto/create-teacher-employment-history.dto";
import type { QueryTeacherEmploymentHistoryDto } from "./dto/query-teacher-employment-history.dto";
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
export class TeacherEmploymentHistoryService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(dto: CreateTeacherEmploymentHistoryDto) {
    await this.assertTeacherInTenant(dto.teacherId);
    return this.prisma.scoped.teacherEmploymentHistory.create({
      data: {
        ...dto,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      } as Prisma.TeacherEmploymentHistoryUncheckedCreateInput,
      include: this.include,
    });
  }

  async findAll(query: QueryTeacherEmploymentHistoryDto) {
    const pagination = toPaginationArgs(query);
    const conditions: Prisma.TeacherEmploymentHistoryWhereInput[] = [];
    if (query.teacherId) conditions.push({ teacherId: query.teacherId });
    if (query.isCurrent !== undefined)
      conditions.push({ isCurrent: query.isCurrent });

    const where: Prisma.TeacherEmploymentHistoryWhereInput = {
      deletedAt: null,
      AND: conditions.length > 0 ? conditions : undefined,
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.teacherEmploymentHistory.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: buildOrderBy(query, [
          "startDate",
          "endDate",
          "createdAt",
        ]) as Prisma.TeacherEmploymentHistoryOrderByWithRelationInput,
        include: this.include,
      }),
      this.prisma.scoped.teacherEmploymentHistory.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  async findOne(id: string) {
    const record = await this.prisma.scoped.teacherEmploymentHistory.findFirst({
      where: { id },
      include: this.include,
    });
    if (!record) throw new ResourceNotFoundException("Employment history", id);
    return record;
  }

  async update(id: string, dto: Partial<CreateTeacherEmploymentHistoryDto>) {
    await this.findOne(id);
    const { teacherId, startDate, endDate, ...rest } = dto;
    if (teacherId) await this.assertTeacherInTenant(teacherId);
    return this.prisma.scoped.teacherEmploymentHistory.update({
      where: { id },
      data: {
        ...rest,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      } as Prisma.TeacherEmploymentHistoryUpdateInput,
      include: this.include,
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.scoped.teacherEmploymentHistory.updateMany({
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

  private get include(): Prisma.TeacherEmploymentHistoryInclude {
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
