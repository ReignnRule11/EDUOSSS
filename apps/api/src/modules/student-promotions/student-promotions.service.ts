import { Injectable } from "@nestjs/common";
import { EnrollmentStatus, PromotionStatus, type Prisma } from "@prisma/client";

import type { CreateStudentPromotionDto } from "./dto/create-student-promotion.dto";
import type { QueryStudentPromotionsDto } from "./dto/query-student-promotions.dto";
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
export class StudentPromotionsService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(dto: CreateStudentPromotionDto, createdById?: string) {
    await this.assertStudentInTenant(dto.studentId);
    await this.assertClassInTenant(dto.fromClassGroupId);
    await this.assertClassInTenant(dto.toClassGroupId);

    const [fromClass, toClass] = await Promise.all([
      this.prisma.scoped.classGroup.findFirst({
        where: { id: dto.fromClassGroupId },
        select: { gradeLevel: true },
      }),
      this.prisma.scoped.classGroup.findFirst({
        where: { id: dto.toClassGroupId },
        select: { gradeLevel: true },
      }),
    ]);

    return this.prisma.scoped.studentPromotion.create({
      data: {
        ...dto,
        fromGradeLevel: fromClass?.gradeLevel ?? "UNKNOWN",
        toGradeLevel: toClass?.gradeLevel ?? "UNKNOWN",
        createdById,
        status: PromotionStatus.PENDING,
      } as Prisma.StudentPromotionUncheckedCreateInput,
      include: this.include,
    });
  }

  async findAll(query: QueryStudentPromotionsDto) {
    const pagination = toPaginationArgs(query);
    const conditions: Prisma.StudentPromotionWhereInput[] = [];
    if (query.studentId) conditions.push({ studentId: query.studentId });
    if (query.status) conditions.push({ status: query.status });

    const where: Prisma.StudentPromotionWhereInput = {
      deletedAt: null,
      AND: conditions.length > 0 ? conditions : undefined,
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.studentPromotion.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: buildOrderBy(query, [
          "promotionDate",
          "academicYear",
          "status",
          "createdAt",
        ]) as Prisma.StudentPromotionOrderByWithRelationInput,
        include: this.include,
      }),
      this.prisma.scoped.studentPromotion.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  async findOne(id: string) {
    const promotion = await this.prisma.scoped.studentPromotion.findFirst({
      where: { id },
      include: this.include,
    });
    if (!promotion)
      throw new ResourceNotFoundException("Student promotion", id);
    return promotion;
  }

  async update(id: string, dto: Partial<CreateStudentPromotionDto>) {
    await this.findOne(id);
    const { studentId, fromClassGroupId, toClassGroupId, ...rest } = dto;
    if (studentId) await this.assertStudentInTenant(studentId);
    if (fromClassGroupId) await this.assertClassInTenant(fromClassGroupId);
    if (toClassGroupId) await this.assertClassInTenant(toClassGroupId);

    return this.prisma.scoped.studentPromotion.update({
      where: { id },
      data: { ...rest } as Prisma.StudentPromotionUpdateInput,
      include: this.include,
    });
  }

  /**
   * Applies a promotion: computes the target grade level from the
   * destination class, closes the current enrollment, and enrols the
   * student in the new class for the target academic year.
   */
  async apply(id: string, appliedById?: string) {
    const promotion = await this.findOne(id);
    if (promotion.status === PromotionStatus.COMPLETED) {
      throw new ConflictResourceException(
        "This promotion has already been applied",
      );
    }

    const toClass = await this.prisma.scoped.classGroup.findFirst({
      where: { id: promotion.toClassGroupId },
      select: { id: true, gradeLevel: true },
    });
    if (!toClass) {
      throw new BadRequestOperationException("Destination class was not found");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.student.update({
        where: { id: promotion.studentId },
        data: { gradeLevel: toClass.gradeLevel },
      });

      await tx.enrollment.updateMany({
        where: {
          studentId: promotion.studentId,
          status: EnrollmentStatus.ACTIVE,
        },
        data: { status: EnrollmentStatus.COMPLETED },
      });

      await tx.enrollment.create({
        data: {
          tenantId: this.tenantId(),
          studentId: promotion.studentId,
          classGroupId: promotion.toClassGroupId,
          academicYear: promotion.academicYear,
          term: "FIRST",
          status: EnrollmentStatus.ACTIVE,
        },
      });
    });

    return this.prisma.scoped.studentPromotion.update({
      where: { id },
      data: {
        status: PromotionStatus.COMPLETED,
        promotedById: appliedById ?? null,
      },
      include: this.include,
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.scoped.studentPromotion.updateMany({
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

  private async assertClassInTenant(classGroupId: string): Promise<void> {
    const classGroup = await this.prisma.scoped.classGroup.findFirst({
      where: { id: classGroupId },
      select: { id: true },
    });
    if (!classGroup) {
      throw new BadRequestOperationException(
        "The provided classGroupId does not belong to this tenant",
      );
    }
  }

  private get include(): Prisma.StudentPromotionInclude {
    return {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNumber: true,
          gradeLevel: true,
        },
      },
      fromClassGroup: { select: { id: true, name: true, gradeLevel: true } },
      toClassGroup: { select: { id: true, name: true, gradeLevel: true } },
    };
  }
}
