import { Injectable } from "@nestjs/common";
import { type Prisma } from "@prisma/client";

import type { CreateTeacherAttendanceDto } from "./dto/create-teacher-attendance.dto";
import type { QueryTeacherAttendanceDto } from "./dto/query-teacher-attendance.dto";
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
export class TeacherAttendanceService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(dto: CreateTeacherAttendanceDto, recordedById?: string) {
    await this.assertTeacherInTenant(dto.teacherId);
    const date = new Date(dto.date);
    return this.prisma.scoped.teacherAttendance.upsert({
      where: {
        tenantId_teacherId_date: {
          tenantId: this.tenantId(),
          teacherId: dto.teacherId,
          date,
        },
      },
      create: {
        teacherId: dto.teacherId,
        date,
        status: dto.status ?? "PRESENT",
        checkInAt: dto.checkInAt ? new Date(dto.checkInAt) : null,
        checkOutAt: dto.checkOutAt ? new Date(dto.checkOutAt) : null,
        remark: dto.remark,
        recordedById,
      } as Prisma.TeacherAttendanceUncheckedCreateInput,
      update: {
        status: dto.status,
        checkInAt: dto.checkInAt ? new Date(dto.checkInAt) : undefined,
        checkOutAt: dto.checkOutAt ? new Date(dto.checkOutAt) : undefined,
        remark: dto.remark,
        recordedById,
        deletedAt: null,
      } as Prisma.TeacherAttendanceUncheckedUpdateInput,
      include: this.include,
    });
  }

  async findAll(query: QueryTeacherAttendanceDto) {
    const pagination = toPaginationArgs(query);
    const conditions: Prisma.TeacherAttendanceWhereInput[] = [];
    if (query.teacherId) conditions.push({ teacherId: query.teacherId });
    if (query.status) conditions.push({ status: query.status });
    if (query.dateFrom || query.dateTo) {
      conditions.push({
        date: {
          ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
          ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
        },
      });
    }

    const where: Prisma.TeacherAttendanceWhereInput = {
      deletedAt: null,
      AND: conditions.length > 0 ? conditions : undefined,
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.teacherAttendance.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: buildOrderBy(query, [
          "date",
          "createdAt",
        ]) as Prisma.TeacherAttendanceOrderByWithRelationInput,
        include: this.include,
      }),
      this.prisma.scoped.teacherAttendance.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  async findOne(id: string) {
    const record = await this.prisma.scoped.teacherAttendance.findFirst({
      where: { id },
      include: this.include,
    });
    if (!record) throw new ResourceNotFoundException("Teacher attendance", id);
    return record;
  }

  async update(id: string, dto: Partial<CreateTeacherAttendanceDto>) {
    await this.findOne(id);
    const { teacherId, ...rest } = dto;
    if (teacherId) await this.assertTeacherInTenant(teacherId);
    return this.prisma.scoped.teacherAttendance.update({
      where: { id },
      data: {
        ...rest,
        checkInAt: rest.checkInAt ? new Date(rest.checkInAt) : undefined,
        checkOutAt: rest.checkOutAt ? new Date(rest.checkOutAt) : undefined,
      } as Prisma.TeacherAttendanceUpdateInput,
      include: this.include,
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.scoped.teacherAttendance.updateMany({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /** Teacher presence roll-up for a single day. */
  async dailyReport(date?: Date) {
    const day = new Date(
      date
        ? new Date(date).setHours(0, 0, 0, 0)
        : new Date().setHours(0, 0, 0, 0),
    );
    const dayEnd = new Date(day.getTime() + 86400000 - 1);
    const [groups, totalActive, records] = await Promise.all([
      this.prisma.scoped.teacherAttendance.groupBy({
        by: ["status"],
        where: { date: { gte: day, lte: dayEnd }, deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.scoped.teacher.count({
        where: { deletedAt: null, isActive: true },
      }),
      this.prisma.scoped.teacherAttendance.findMany({
        where: { date: { gte: day, lte: dayEnd }, deletedAt: null },
        include: this.include,
        orderBy: { createdAt: "asc" },
      }),
    ]);
    const counts: Record<string, number> = {};
    for (const g of groups) counts[g.status] = g._count._all;
    const present = counts["PRESENT"] ?? 0;
    const marked = Object.values(counts).reduce((a, b) => a + b, 0);
    return {
      date: day,
      totalActive,
      totalMarked: marked,
      present,
      absent: counts["ABSENT"] ?? 0,
      late: counts["LATE"] ?? 0,
      excused: counts["EXCUSED"] ?? 0,
      halfDay: counts["HALF_DAY"] ?? 0,
      presentRate:
        totalActive > 0
          ? Number(((present / totalActive) * 100).toFixed(2))
          : 0,
      unmarkedTeachers: totalActive - marked,
      items: records.map((r) => ({
        id: r.id,
        teacherId: r.teacherId,
        name: `${r.teacher.firstName} ${r.teacher.lastName}`,
        staffNumber: r.teacher.staffNumber,
        status: r.status,
        checkInAt: r.checkInAt,
        checkOutAt: r.checkOutAt,
        remark: r.remark,
      })),
    };
  }

  /** Streams teacher attendance rows as CSV. */
  async exportCsv(query: { from?: string; to?: string; teacherId?: string }) {
    const from = new Date(
      query.from
        ? new Date(query.from).setHours(0, 0, 0, 0)
        : new Date(
            new Date().getFullYear(),
            new Date().getMonth(),
            1,
          ).getTime(),
    );
    const to = new Date(
      query.to
        ? new Date(query.to).setHours(23, 59, 59, 999)
        : new Date().setHours(23, 59, 59, 999),
    );
    const records = await this.prisma.scoped.teacherAttendance.findMany({
      where: {
        deletedAt: null,
        date: { gte: from, lte: to },
        ...(query.teacherId ? { teacherId: query.teacherId } : {}),
      },
      orderBy: [{ date: "asc" }],
      include: this.include,
    });

    const header = [
      "Date",
      "Staff Number",
      "First Name",
      "Last Name",
      "Status",
      "Check In",
      "Check Out",
      "Remark",
    ];
    const rows = records.map((r) => [
      r.date.toISOString().slice(0, 10),
      r.teacher.staffNumber,
      r.teacher.firstName,
      r.teacher.lastName,
      r.status,
      r.checkInAt ? new Date(r.checkInAt).toISOString() : "",
      r.checkOutAt ? new Date(r.checkOutAt).toISOString() : "",
      r.remark ?? "",
    ]);
    const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => escape(cell)).join(","))
      .join("\n");

    return {
      csv,
      filename: `teacher-attendance-${from.toISOString().slice(0, 10)}-${to.toISOString().slice(0, 10)}.csv`,
      count: records.length,
    };
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

  private get include(): Prisma.TeacherAttendanceInclude {
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
