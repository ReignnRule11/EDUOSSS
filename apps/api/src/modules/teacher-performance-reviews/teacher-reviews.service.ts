import { Injectable } from "@nestjs/common";
import { type Prisma } from "@prisma/client";

import type { CreateTeacherReviewDto } from "./dto/create-teacher-review.dto";
import type { QueryTeacherReviewsDto } from "./dto/query-teacher-reviews.dto";
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
export class TeacherReviewsService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(dto: CreateTeacherReviewDto, reviewedById?: string) {
    await this.assertTeacherInTenant(dto.teacherId);
    return this.prisma.scoped.teacherPerformanceReview.create({
      data: {
        ...dto,
        reviewDate: new Date(dto.reviewDate),
        reviewedById,
      } as Prisma.TeacherPerformanceReviewUncheckedCreateInput,
      include: this.include,
    });
  }

  async findAll(query: QueryTeacherReviewsDto) {
    const pagination = toPaginationArgs(query);
    const conditions: Prisma.TeacherPerformanceReviewWhereInput[] = [];
    if (query.teacherId) conditions.push({ teacherId: query.teacherId });
    if (query.rating) conditions.push({ rating: query.rating });

    const where: Prisma.TeacherPerformanceReviewWhereInput = {
      deletedAt: null,
      AND: conditions.length > 0 ? conditions : undefined,
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.teacherPerformanceReview.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: buildOrderBy(query, [
          "reviewDate",
          "rating",
          "createdAt",
        ]) as Prisma.TeacherPerformanceReviewOrderByWithRelationInput,
        include: this.include,
      }),
      this.prisma.scoped.teacherPerformanceReview.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  async findOne(id: string) {
    const record = await this.prisma.scoped.teacherPerformanceReview.findFirst({
      where: { id },
      include: this.include,
    });
    if (!record) throw new ResourceNotFoundException("Performance review", id);
    return record;
  }

  async update(id: string, dto: Partial<CreateTeacherReviewDto>) {
    await this.findOne(id);
    const { teacherId, reviewDate, ...rest } = dto;
    if (teacherId) await this.assertTeacherInTenant(teacherId);
    return this.prisma.scoped.teacherPerformanceReview.update({
      where: { id },
      data: {
        ...rest,
        reviewDate: reviewDate ? new Date(reviewDate) : undefined,
      } as Prisma.TeacherPerformanceReviewUpdateInput,
      include: this.include,
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.scoped.teacherPerformanceReview.updateMany({
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

  private get include(): Prisma.TeacherPerformanceReviewInclude {
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
