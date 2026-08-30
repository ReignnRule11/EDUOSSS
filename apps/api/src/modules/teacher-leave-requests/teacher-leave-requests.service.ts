import { Injectable } from "@nestjs/common";
import { type Prisma } from "@prisma/client";
import { LeaveStatus } from "@prisma/client";

import type { CreateTeacherLeaveRequestDto } from "./dto/create-teacher-leave-request.dto";
import type { QueryTeacherLeaveRequestsDto } from "./dto/query-teacher-leave-requests.dto";
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
export class TeacherLeaveRequestsService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(dto: CreateTeacherLeaveRequestDto) {
    await this.assertTeacherInTenant(dto.teacherId);
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate < startDate) {
      throw new BadRequestOperationException(
        "endDate must be on or after startDate",
      );
    }
    return this.prisma.scoped.teacherLeaveRequest.create({
      data: {
        teacherId: dto.teacherId,
        leaveType: dto.leaveType,
        startDate,
        endDate,
        days: this.calculateDays(startDate, endDate),
        reason: dto.reason,
      } as Prisma.TeacherLeaveRequestUncheckedCreateInput,
      include: this.include,
    });
  }

  async findAll(query: QueryTeacherLeaveRequestsDto) {
    const pagination = toPaginationArgs(query);
    const conditions: Prisma.TeacherLeaveRequestWhereInput[] = [];
    if (query.teacherId) conditions.push({ teacherId: query.teacherId });
    if (query.status) conditions.push({ status: query.status });

    const where: Prisma.TeacherLeaveRequestWhereInput = {
      deletedAt: null,
      AND: conditions.length > 0 ? conditions : undefined,
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.teacherLeaveRequest.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: buildOrderBy(query, [
          "startDate",
          "status",
          "createdAt",
        ]) as Prisma.TeacherLeaveRequestOrderByWithRelationInput,
        include: this.include,
      }),
      this.prisma.scoped.teacherLeaveRequest.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  async findOne(id: string) {
    const record = await this.prisma.scoped.teacherLeaveRequest.findFirst({
      where: { id },
      include: this.include,
    });
    if (!record) throw new ResourceNotFoundException("Leave request", id);
    return record;
  }

  async approve(id: string, reviewerId: string, remarks?: string) {
    await this.findOne(id);
    return this.prisma.scoped.teacherLeaveRequest.update({
      where: { id },
      data: {
        status: LeaveStatus.APPROVED,
        approvedById: reviewerId,
        approvedAt: new Date(),
        remarks,
      },
      include: this.include,
    });
  }

  async reject(id: string, reviewerId: string, remarks: string) {
    await this.findOne(id);
    return this.prisma.scoped.teacherLeaveRequest.update({
      where: { id },
      data: {
        status: LeaveStatus.REJECTED,
        approvedById: reviewerId,
        approvedAt: new Date(),
        remarks,
      },
      include: this.include,
    });
  }

  async cancel(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.scoped.teacherLeaveRequest.updateMany({
      where: { id },
      data: { status: LeaveStatus.CANCELLED },
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.scoped.teacherLeaveRequest.updateMany({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private calculateDays(startDate: Date, endDate: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.round((endDate.getTime() - startDate.getTime()) / msPerDay) + 1;
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

  private get include(): Prisma.TeacherLeaveRequestInclude {
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
