import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import type { CreateDepartmentDto } from "./dto/create-department.dto";
import type { QueryDepartmentsDto } from "./dto/query-departments.dto";
import {
  BadRequestOperationException,
  ConflictResourceException,
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
export class DepartmentsService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(dto: CreateDepartmentDto) {
    await this.assertSchoolBelongsToTenant(dto.schoolId);
    await this.assertHeadTeacherBelongsToTenant(dto.headTeacherId);
    const conflict = await this.prisma.scoped.department.findFirst({
      where: this.tenantWhere({
        schoolId: dto.schoolId,
        code: dto.code,
      }),
    });
    if (conflict) {
      throw new ConflictResourceException(
        `Department code "${dto.code}" already exists in this school`,
      );
    }
    return this.prisma.scoped.department.create({
      data: { ...dto } as Prisma.DepartmentUncheckedCreateInput,
      include: this.departmentInclude,
    });
  }

  async findAll(query: QueryDepartmentsDto) {
    const pagination = toPaginationArgs(query);
    const where: Prisma.DepartmentWhereInput = {
      deletedAt: null,
      ...(query.schoolId ? { schoolId: query.schoolId } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { code: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.department.findMany({
        where: this.tenantWhere(where),
        skip: pagination.skip,
        take: pagination.take,
        orderBy: buildOrderBy(query, [
          "name",
          "code",
          "createdAt",
          "updatedAt",
        ]) as Prisma.DepartmentOrderByWithRelationInput,
        include: this.departmentInclude,
      }),
      this.prisma.scoped.department.count({
        where: this.tenantWhere(where),
      }),
    ]);

    return {
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  async findOne(id: string) {
    const department = await this.prisma.scoped.department.findFirst({
      where: this.tenantWhere({ id, deletedAt: null }),
      include: this.departmentInclude,
    });
    if (!department) {
      throw new ResourceNotFoundException("Department", id);
    }
    return department;
  }

  async update(id: string, dto: Partial<CreateDepartmentDto>) {
    await this.findOne(id);
    if (dto.schoolId) {
      await this.assertSchoolBelongsToTenant(dto.schoolId);
    }
    if (dto.headTeacherId) {
      await this.assertHeadTeacherBelongsToTenant(dto.headTeacherId);
    }
    return this.prisma.scoped.department.update({
      where: { id },
      data: dto as Prisma.DepartmentUpdateInput,
      include: this.departmentInclude,
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.scoped.department.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });
  }

  private async assertSchoolBelongsToTenant(schoolId: string): Promise<void> {
    const school = await this.prisma.scoped.school.findFirst({
      where: this.tenantWhere({ id: schoolId }),
      select: { id: true },
    });
    if (!school) {
      throw new BadRequestOperationException(
        "The provided schoolId does not belong to this tenant",
      );
    }
  }

  private async assertHeadTeacherBelongsToTenant(
    headTeacherId?: string,
  ): Promise<void> {
    if (!headTeacherId) return;
    const teacher = await this.prisma.scoped.teacher.findFirst({
      where: this.tenantWhere({ id: headTeacherId }),
      select: { id: true },
    });
    if (!teacher) {
      throw new BadRequestOperationException(
        "The provided headTeacherId does not belong to this tenant",
      );
    }
  }

  private get departmentInclude(): Prisma.DepartmentInclude {
    return {
      school: { select: { id: true, name: true, code: true } },
      headTeacher: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          staffNumber: true,
        },
      },
      _count: { select: { teachers: true, timetableSlots: true } },
    };
  }
}
