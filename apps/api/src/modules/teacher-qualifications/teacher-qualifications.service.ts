import { Injectable } from "@nestjs/common";
import { type Prisma } from "@prisma/client";

import type { CreateTeacherQualificationDto } from "./dto/create-teacher-qualification.dto";
import type { QueryTeacherQualificationsDto } from "./dto/query-teacher-qualifications.dto";
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
export class TeacherQualificationsService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(dto: CreateTeacherQualificationDto) {
    await this.assertTeacherInTenant(dto.teacherId);
    return this.prisma.scoped.teacherQualification.create({
      data: { ...dto } as Prisma.TeacherQualificationUncheckedCreateInput,
      include: this.include,
    });
  }

  async findAll(query: QueryTeacherQualificationsDto) {
    const pagination = toPaginationArgs(query);
    const conditions: Prisma.TeacherQualificationWhereInput[] = [];
    if (query.teacherId) conditions.push({ teacherId: query.teacherId });
    if (query.level) conditions.push({ level: query.level });

    const where: Prisma.TeacherQualificationWhereInput = {
      deletedAt: null,
      AND: conditions.length > 0 ? conditions : undefined,
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.teacherQualification.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: buildOrderBy(query, [
          "yearAchieved",
          "level",
          "createdAt",
        ]) as Prisma.TeacherQualificationOrderByWithRelationInput,
        include: this.include,
      }),
      this.prisma.scoped.teacherQualification.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  async findOne(id: string) {
    const record = await this.prisma.scoped.teacherQualification.findFirst({
      where: { id },
      include: this.include,
    });
    if (!record) throw new ResourceNotFoundException("Qualification", id);
    return record;
  }

  async update(id: string, dto: Partial<CreateTeacherQualificationDto>) {
    await this.findOne(id);
    const { teacherId, ...rest } = dto;
    if (teacherId) await this.assertTeacherInTenant(teacherId);
    return this.prisma.scoped.teacherQualification.update({
      where: { id },
      data: { ...rest } as Prisma.TeacherQualificationUpdateInput,
      include: this.include,
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.scoped.teacherQualification.updateMany({
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

  private get include(): Prisma.TeacherQualificationInclude {
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
