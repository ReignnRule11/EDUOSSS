import { Injectable } from "@nestjs/common";
import { EnrollmentStatus, type Prisma } from "@prisma/client";

import type { CreateEnrollmentDto } from "./dto/create-enrollment.dto";
import type { QueryEnrollmentsDto } from "./dto/query-enrollments.dto";
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
export class EnrollmentsService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(dto: CreateEnrollmentDto) {
    await this.assertStudentInTenant(dto.studentId);
    await this.assertClassInTenant(dto.classGroupId);

    const conflict = await this.prisma.scoped.enrollment.findFirst({
      where: {
        studentId: dto.studentId,
        academicYear: dto.academicYear,
        term: dto.term,
      },
    });
    if (conflict) {
      throw new ConflictResourceException(
        "Student is already enrolled in this academic year and term",
      );
    }

    return this.prisma.scoped.enrollment.create({
      data: {
        studentId: dto.studentId,
        classGroupId: dto.classGroupId,
        academicYear: dto.academicYear,
        term: dto.term ?? "FIRST",
        status: (dto.status ?? EnrollmentStatus.ACTIVE) as EnrollmentStatus,
      } as Prisma.EnrollmentUncheckedCreateInput,
      include: this.include,
    });
  }

  async findAll(query: QueryEnrollmentsDto) {
    const pagination = toPaginationArgs(query);
    const conditions: Prisma.EnrollmentWhereInput[] = [];
    if (query.studentId) conditions.push({ studentId: query.studentId });
    if (query.classGroupId)
      conditions.push({ classGroupId: query.classGroupId });
    if (query.academicYear)
      conditions.push({ academicYear: query.academicYear });
    if (query.status) conditions.push({ status: query.status });

    const where: Prisma.EnrollmentWhereInput = {
      AND: conditions.length > 0 ? conditions : undefined,
    };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.enrollment.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: buildOrderBy(query, [
          "academicYear",
          "term",
          "status",
          "createdAt",
        ]) as Prisma.EnrollmentOrderByWithRelationInput,
        include: this.include,
      }),
      this.prisma.scoped.enrollment.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  async findOne(id: string) {
    const enrollment = await this.prisma.scoped.enrollment.findFirst({
      where: { id },
      include: this.include,
    });
    if (!enrollment) throw new ResourceNotFoundException("Enrollment", id);
    return enrollment;
  }

  async update(id: string, dto: Partial<CreateEnrollmentDto>) {
    await this.findOne(id);
    return this.prisma.scoped.enrollment.update({
      where: { id },
      data: {
        ...(dto.classGroupId ? { classGroupId: dto.classGroupId } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
      include: this.include,
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.scoped.enrollment.updateMany({
      where: { id },
      data: { status: EnrollmentStatus.WITHDRAWN },
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

  private get include(): Prisma.EnrollmentInclude {
    return {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNumber: true,
        },
      },
      classGroup: { select: { id: true, name: true, academicYear: true } },
    };
  }
}
