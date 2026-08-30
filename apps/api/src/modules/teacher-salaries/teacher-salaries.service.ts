import { Injectable } from "@nestjs/common";
import { type Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

import type { CreateTeacherSalaryDto } from "./dto/create-teacher-salary.dto";
import type { QueryTeacherSalariesDto } from "./dto/query-teacher-salaries.dto";
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

type SalaryRecord = Prisma.TeacherSalaryGetPayload<{
  include: {
    teacher: {
      select: { id: true; firstName: true; lastName: true; staffNumber: true };
    };
  };
}>;

@Injectable()
export class TeacherSalariesService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(dto: CreateTeacherSalaryDto) {
    await this.assertTeacherInTenant(dto.teacherId);
    const record = await this.prisma.scoped.teacherSalary.create({
      data: {
        teacherId: dto.teacherId,
        effectiveDate: new Date(dto.effectiveDate),
        basicSalary: dto.basicSalary,
        allowances: dto.allowances ?? 0,
        deductions: dto.deductions ?? 0,
        currency: dto.currency ?? "NGN",
        notes: dto.notes,
        isActive: dto.isActive ?? true,
      } as Prisma.TeacherSalaryUncheckedCreateInput,
      include: this.include,
    });
    if (record.isActive) {
      await this.deactivateOthers(record.teacherId, record.id);
    }
    return this.serialize(record);
  }

  async findAll(query: QueryTeacherSalariesDto) {
    const pagination = toPaginationArgs(query);
    const conditions: Prisma.TeacherSalaryWhereInput[] = [];
    if (query.teacherId) conditions.push({ teacherId: query.teacherId });
    if (query.isActive !== undefined)
      conditions.push({ isActive: query.isActive });

    const where: Prisma.TeacherSalaryWhereInput = {
      deletedAt: null,
      AND: conditions.length > 0 ? conditions : undefined,
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.teacherSalary.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: buildOrderBy(query, [
          "effectiveDate",
          "isActive",
          "createdAt",
        ]) as Prisma.TeacherSalaryOrderByWithRelationInput,
        include: this.include,
      }),
      this.prisma.scoped.teacherSalary.count({ where }),
    ]);

    return {
      items: items.map((item) => this.serialize(item)),
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  async findOne(id: string) {
    const record = await this.prisma.scoped.teacherSalary.findFirst({
      where: { id },
      include: this.include,
    });
    if (!record) throw new ResourceNotFoundException("Salary", id);
    return this.serialize(record);
  }

  async update(id: string, dto: Partial<CreateTeacherSalaryDto>) {
    await this.findOne(id);
    const { teacherId, effectiveDate, ...rest } = dto;
    if (teacherId) await this.assertTeacherInTenant(teacherId);
    const record = await this.prisma.scoped.teacherSalary.update({
      where: { id },
      data: {
        ...rest,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
      } as Prisma.TeacherSalaryUpdateInput,
      include: this.include,
    });
    if (record.isActive) {
      await this.deactivateOthers(record.teacherId, record.id);
    }
    return this.serialize(record);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.scoped.teacherSalary.updateMany({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async deactivateOthers(
    teacherId: string,
    excludeId: string,
  ): Promise<void> {
    await this.prisma.scoped.teacherSalary.updateMany({
      where: {
        teacherId,
        id: { not: excludeId },
        isActive: true,
        deletedAt: null,
      },
      data: { isActive: false },
    });
  }

  private serialize<T extends SalaryRecord>(record: T) {
    const { basicSalary, allowances, deductions, ...rest } = record;
    return {
      ...rest,
      basicSalary: this.toNumber(basicSalary),
      allowances: this.toNumber(allowances),
      deductions: this.toNumber(deductions),
      netSalary:
        this.toNumber(basicSalary) +
        this.toNumber(allowances) -
        this.toNumber(deductions),
    };
  }

  private toNumber(value: unknown): number {
    if (value instanceof Decimal) return value.toNumber();
    if (typeof value === "number") return value;
    if (typeof value === "string") return Number(value);
    return Number(value ?? 0);
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

  private get include(): Prisma.TeacherSalaryInclude {
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
