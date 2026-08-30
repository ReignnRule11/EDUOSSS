import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import type { CreateClassGroupDto } from "./dto/create-class-group.dto";
import type { QueryClassGroupsDto } from "./dto/query-class-groups.dto";
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
export class ClassesService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(dto: CreateClassGroupDto) {
    await this.assertSchoolBelongsToTenant(dto.schoolId);
    await this.assertHeadTeacherBelongsToTenant(dto.headTeacherId);

    const conflict = await this.prisma.scoped.classGroup.findFirst({
      where: this.tenantWhere({
        schoolId: dto.schoolId,
        name: dto.name,
        academicYear: dto.academicYear ?? null,
      }),
    });
    if (conflict) {
      throw new ConflictResourceException(
        "A class with the same name and academic year already exists in this school",
      );
    }

    return this.prisma.scoped.classGroup.create({
      data: { ...dto } as Prisma.ClassGroupUncheckedCreateInput,
      include: this.classInclude,
    });
  }

  async findAll(query: QueryClassGroupsDto) {
    const pagination = toPaginationArgs(query);
    const conditions: Prisma.ClassGroupWhereInput[] = [];
    if (query.search) {
      conditions.push({
        OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { roomNumber: { contains: query.search, mode: "insensitive" } },
        ],
      });
    }
    if (query.schoolId) conditions.push({ schoolId: query.schoolId });
    if (query.gradeLevel) conditions.push({ gradeLevel: query.gradeLevel });
    if (query.academicYear)
      conditions.push({ academicYear: query.academicYear });
    if (query.isActive !== undefined)
      conditions.push({ isActive: query.isActive });

    const where = this.tenantWhere({
      AND: conditions.length > 0 ? conditions : undefined,
    });
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.classGroup.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: buildOrderBy(query, [
          "name",
          "gradeLevel",
          "academicYear",
          "createdAt",
        ]) as Prisma.ClassGroupOrderByWithRelationInput,
        include: this.classInclude,
      }),
      this.prisma.scoped.classGroup.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  async findOne(id: string) {
    const classGroup = await this.prisma.scoped.classGroup.findFirst({
      where: this.tenantWhere({ id }),
      include: this.classInclude,
    });
    if (!classGroup) {
      throw new ResourceNotFoundException("Class", id);
    }
    return classGroup;
  }

  async update(id: string, dto: Partial<CreateClassGroupDto>) {
    await this.findOne(id);
    if (dto.schoolId) {
      await this.assertSchoolBelongsToTenant(dto.schoolId);
    }
    if (dto.headTeacherId) {
      await this.assertHeadTeacherBelongsToTenant(dto.headTeacherId);
    }
    return this.prisma.scoped.classGroup.update({
      where: { id },
      data: dto as Prisma.ClassGroupUpdateInput,
      include: this.classInclude,
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.scoped.classGroup.update({
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

  private get classInclude(): Prisma.ClassGroupInclude {
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
      _count: { select: { enrollments: true } },
      subjects: {
        select: {
          id: true,
          subject: { select: { id: true, name: true, code: true } },
          teacher: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    };
  }
}
