import { Injectable } from "@nestjs/common";
import { type Prisma } from "@prisma/client";

import type {
  AnalyticsQueryDto,
  DailyReportQueryDto,
  LateArrivalsQueryDto,
  MonthlyReportQueryDto,
} from "./dto/attendance-report-query.dto";
import { BaseRepository } from "../../common/repositories/base.repository";
import {
  buildPaginationMeta,
  toPaginationArgs,
} from "../../common/utils/pagination.util";
import { PrismaService } from "../../database/prisma.service";

const STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const;

@Injectable()
export class AttendanceInsightsService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async dashboard() {
    const today = this.startOfDay(new Date());
    const todayEnd = this.endOfDay(today);
    const monthStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - 29,
    );

    const [todayGroups, trendGroups, classGroups, recent, teacherTodayGroups] =
      await Promise.all([
        this.prisma.scoped.attendanceRecord.groupBy({
          by: ["status"],
          where: { date: { gte: today, lte: todayEnd } },
          _count: { _all: true },
        }),
        this.prisma.scoped.attendanceRecord.groupBy({
          by: ["status", "date"],
          where: { date: { gte: monthStart, lte: todayEnd } },
          _count: { _all: true },
        }),
        this.prisma.scoped.attendanceRecord.groupBy({
          by: ["classGroupId", "status"],
          where: { date: { gte: monthStart, lte: todayEnd } },
          _count: { _all: true },
        }),
        this.prisma.scoped.attendanceRecord.findMany({
          where: {
            status: { in: ["ABSENT", "LATE"] },
            date: {
              gte: this.startOfDay(new Date(today.getTime() - 6 * 86400000)),
              lte: todayEnd,
            },
          },
          orderBy: { date: "desc" },
          take: 10,
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                admissionNumber: true,
              },
            },
            classGroup: { select: { id: true, name: true } },
          },
        }),
        this.prisma.scoped.teacherAttendance.groupBy({
          by: ["status"],
          where: { date: { gte: today, lte: todayEnd } },
          _count: { _all: true },
        }),
      ]);

    const totalToday = this.countStatuses(todayGroups);
    const presentToday = totalToday["PRESENT"] ?? 0;

    const classes = await this.prisma.scoped.classGroup.findMany({
      where: this.tenantWhere({ deletedAt: null }),
      select: { id: true, name: true },
    });
    const classMap = new Map(classes.map((c) => [c.id, c.name]));
    const byClassMap = new Map<string, Record<string, number>>();
    for (const g of classGroups) {
      const entry = byClassMap.get(g.classGroupId) ?? {};
      entry[g.status] = (entry[g.status] ?? 0) + g._count._all;
      byClassMap.set(g.classGroupId, entry);
    }

    const activeTeachers = await this.prisma.scoped.teacher.count({
      where: { deletedAt: null, isActive: true },
    });
    const teacherToday = this.countStatuses(teacherTodayGroups);

    return {
      today: {
        date: today,
        total: this.sumValues(totalToday),
        ...totalToday,
        presentRate: this.rate(presentToday, this.sumValues(totalToday)),
      },
      trend: this.buildTrend(trendGroups, monthStart, today),
      byClass: Array.from(byClassMap.entries()).map(([id, counts]) => ({
        classGroupId: id,
        name: classMap.get(id) ?? id,
        ...counts,
        presentRate: this.rate(counts["PRESENT"] ?? 0, this.sumValues(counts)),
      })),
      recentAlerts: recent.map((r) => ({
        id: r.id,
        date: r.date,
        status: r.status,
        studentId: r.student.id,
        studentName: `${r.student.firstName} ${r.student.lastName}`,
        admissionNumber: r.student.admissionNumber,
        className: r.classGroup?.name ?? "",
      })),
      teachers: {
        date: today,
        totalActive: activeTeachers,
        total: this.sumValues(teacherToday),
        ...teacherToday,
        presentRate: this.rate(
          teacherToday["PRESENT"] ?? 0,
          this.sumValues(teacherToday),
        ),
      },
    };
  }

  async dailyReport(query: DailyReportQueryDto) {
    const date = this.startOfDay(query.date ?? new Date());
    const dateEnd = this.endOfDay(date);
    const classFilter = query.classGroupId
      ? { id: query.classGroupId }
      : query.schoolId
        ? { schoolId: query.schoolId }
        : {};

    const [classes, groups] = await Promise.all([
      this.prisma.scoped.classGroup.findMany({
        where: this.tenantWhere({ deletedAt: null, ...classFilter }),
        select: {
          id: true,
          name: true,
          gradeLevel: true,
          _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
        },
        orderBy: { name: "asc" },
      }),
      this.prisma.scoped.attendanceRecord.groupBy({
        by: ["classGroupId", "status"],
        where: { date: { gte: date, lte: dateEnd } },
        _count: { _all: true },
      }),
    ]);

    const byClass = new Map<string, Record<string, number>>();
    for (const g of groups) {
      const entry = byClass.get(g.classGroupId) ?? {};
      entry[g.status] = (entry[g.status] ?? 0) + g._count._all;
      byClass.set(g.classGroupId, entry);
    }

    const rows = classes.map((c) => {
      const counts = byClass.get(c.id) ?? {};
      return {
        classGroupId: c.id,
        name: c.name,
        gradeLevel: c.gradeLevel,
        enrolled: c._count.enrollments,
        ...counts,
        total: this.sumValues(counts),
        presentRate: this.rate(counts["PRESENT"] ?? 0, this.sumValues(counts)),
      };
    });

    const totals: Record<string, number> = {
      enrolled: rows.reduce((s, r) => s + r.enrolled, 0),
      total: rows.reduce((s, r) => s + (r.total ?? 0), 0),
    };
    for (const s of STATUSES) {
      totals[s.toLowerCase()] = rows.reduce(
        (a, r) => a + ((r as unknown as Record<string, number>)[s] ?? 0),
        0,
      );
    }
    totals["presentRate"] = this.rate(
      totals["present"] ?? 0,
      totals["total"] ?? 0,
    );

    const absentLate = await this.prisma.scoped.attendanceRecord.findMany({
      where: {
        date: { gte: date, lte: dateEnd },
        status: { in: ["ABSENT", "LATE"] },
        ...(query.classGroupId ? { classGroupId: query.classGroupId } : {}),
      },
      orderBy: { status: "asc" },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
            guardianName: true,
            guardianPhone: true,
            guardianEmail: true,
          },
        },
        classGroup: { select: { id: true, name: true } },
      },
    });

    return { date, rows, totals, absentLate };
  }

  async monthlyReport(query: MonthlyReportQueryDto) {
    const pagination = toPaginationArgs(query);
    const { from, to } = this.resolveRange(
      query.from,
      query.to,
      query.month,
      query.year,
    );

    const enrollmentWhere: Prisma.EnrollmentWhereInput = {
      status: "ACTIVE",
      ...(query.classGroupId
        ? { classGroupId: query.classGroupId }
        : query.schoolId
          ? { classGroup: { schoolId: query.schoolId } }
          : {}),
    };

    const [students, groups, totalStudents] = await Promise.all([
      this.prisma.scoped.student.findMany({
        where: {
          enrollments: { some: enrollmentWhere },
        },
        select: {
          id: true,
          admissionNumber: true,
          firstName: true,
          lastName: true,
          enrollments: {
            where: { status: "ACTIVE" },
            take: 1,
            select: { classGroup: { select: { id: true, name: true } } },
          },
        },
        orderBy: { admissionNumber: "asc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.scoped.attendanceRecord.groupBy({
        by: ["studentId", "status"],
        where: {
          date: { gte: from, lte: to },
          ...(query.classGroupId
            ? { classGroupId: query.classGroupId }
            : query.schoolId
              ? { classGroup: { schoolId: query.schoolId } }
              : {}),
        },
        _count: { _all: true },
      }),
      this.prisma.scoped.student.count({
        where: { enrollments: { some: enrollmentWhere } },
      }),
    ]);

    const statsByStudent = new Map<string, Record<string, number>>();
    for (const g of groups) {
      const entry = statsByStudent.get(g.studentId) ?? {};
      entry[g.status] = (entry[g.status] ?? 0) + g._count._all;
      statsByStudent.set(g.studentId, entry);
    }

    const rows = students.map((s) => {
      const counts = statsByStudent.get(s.id) ?? {};
      return {
        studentId: s.id,
        admissionNumber: s.admissionNumber,
        name: `${s.firstName} ${s.lastName}`,
        className: s.enrollments[0]?.classGroup.name ?? "",
        ...counts,
        totalDays: this.sumValues(counts),
        presentRate: this.rate(counts["PRESENT"] ?? 0, this.sumValues(counts)),
      };
    });

    const overall = Object.fromEntries(
      STATUSES.map((s) => [
        s.toLowerCase(),
        Array.from(statsByStudent.values()).reduce(
          (a, c) => a + (c[s] ?? 0),
          0,
        ),
      ]),
    );
    const total = Array.from(statsByStudent.values()).reduce(
      (a, c) => a + this.sumValues(c),
      0,
    );

    return {
      items: rows,
      meta: {
        ...buildPaginationMeta(
          totalStudents,
          pagination.page,
          pagination.limit,
        ),
        from,
        to,
        totals: {
          ...(overall as Record<string, number>),
          presentRate: this.rate(overall.present ?? 0, total),
        },
      },
    };
  }

  async lateArrivals(query: LateArrivalsQueryDto) {
    const { from, to } = this.resolveRange(query.from, query.to);
    const where: Prisma.AttendanceRecordWhereInput = {
      status: "LATE",
      date: { gte: from, lte: to },
      ...(query.classGroupId ? { classGroupId: query.classGroupId } : {}),
    };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.attendanceRecord.findMany({
        where,
        orderBy: { date: "desc" },
        take: 100,
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              admissionNumber: true,
            },
          },
          classGroup: { select: { id: true, name: true } },
        },
      }),
      this.prisma.scoped.attendanceRecord.count({ where }),
    ]);
    return {
      from,
      to,
      items: items.map((r) => ({
        id: r.id,
        date: r.date,
        studentId: r.student.id,
        admissionNumber: r.student.admissionNumber,
        studentName: `${r.student.firstName} ${r.student.lastName}`,
        className: r.classGroup?.name ?? "",
        remark: r.remark,
        source: r.source,
      })),
      totalItems,
    };
  }

  async trend(query: AnalyticsQueryDto) {
    const { from, to } = this.resolveRange(
      query.from,
      query.to,
      undefined,
      undefined,
      query.days,
    );
    const groups = await this.prisma.scoped.attendanceRecord.groupBy({
      by: ["status", "date"],
      where: {
        date: { gte: from, lte: to },
        ...(query.schoolId ? { classGroup: { schoolId: query.schoolId } } : {}),
      },
      _count: { _all: true },
    });
    return { from, to, points: this.buildTrend(groups, from, to) };
  }

  async byClass(query: AnalyticsQueryDto) {
    const { from, to } = this.resolveRange(
      query.from,
      query.to,
      undefined,
      undefined,
      query.days,
    );
    const [groups, classes] = await Promise.all([
      this.prisma.scoped.attendanceRecord.groupBy({
        by: ["classGroupId", "status"],
        where: {
          date: { gte: from, lte: to },
          ...(query.schoolId
            ? { classGroup: { schoolId: query.schoolId } }
            : {}),
        },
        _count: { _all: true },
      }),
      this.prisma.scoped.classGroup.findMany({
        where: this.tenantWhere({ deletedAt: null }),
        select: { id: true, name: true },
      }),
    ]);
    const classMap = new Map(classes.map((c) => [c.id, c.name]));
    const byClass = new Map<string, Record<string, number>>();
    for (const g of groups) {
      const entry = byClass.get(g.classGroupId) ?? {};
      entry[g.status] = (entry[g.status] ?? 0) + g._count._all;
      byClass.set(g.classGroupId, entry);
    }
    return {
      from,
      to,
      items: Array.from(byClass.entries())
        .map(([id, counts]) => ({
          classGroupId: id,
          name: classMap.get(id) ?? id,
          ...counts,
          total: this.sumValues(counts),
          presentRate: this.rate(
            counts["PRESENT"] ?? 0,
            this.sumValues(counts),
          ),
        }))
        .sort((a, b) => a.presentRate - b.presentRate),
    };
  }

  async topStudents(query: AnalyticsQueryDto) {
    const { from, to } = this.resolveRange(
      query.from,
      query.to,
      undefined,
      undefined,
      query.days,
    );
    const [students, groups] = await Promise.all([
      this.prisma.scoped.student.findMany({
        where: { enrollments: { some: { status: "ACTIVE" } } },
        select: {
          id: true,
          admissionNumber: true,
          firstName: true,
          lastName: true,
          enrollments: {
            where: { status: "ACTIVE" },
            take: 1,
            select: { classGroup: { select: { name: true } } },
          },
        },
      }),
      this.prisma.scoped.attendanceRecord.groupBy({
        by: ["studentId", "status"],
        where: { date: { gte: from, lte: to } },
        _count: { _all: true },
      }),
    ]);
    const stats = new Map<string, Record<string, number>>();
    for (const g of groups) {
      const entry = stats.get(g.studentId) ?? {};
      entry[g.status] = (entry[g.status] ?? 0) + g._count._all;
      stats.set(g.studentId, entry);
    }
    const rows = students
      .map((s) => {
        const counts = stats.get(s.id) ?? {};
        const total = this.sumValues(counts);
        return {
          studentId: s.id,
          admissionNumber: s.admissionNumber,
          name: `${s.firstName} ${s.lastName}`,
          className: s.enrollments[0]?.classGroup.name ?? "",
          ...counts,
          totalDays: total,
          presentRate: this.rate(counts["PRESENT"] ?? 0, total),
        };
      })
      .filter((r) => r.totalDays > 0)
      .sort((a, b) => a.presentRate - b.presentRate);
    return { from, to, items: rows.slice(0, 10) };
  }

  async exportCsv(query: {
    from?: Date | string;
    to?: Date | string;
    date?: Date | string;
    classGroupId?: string;
    schoolId?: string;
  }) {
    const from = this.startOfDay(
      query.from
        ? new Date(query.from)
        : query.date
          ? new Date(query.date)
          : new Date(),
    );
    const to = this.endOfDay(query.to ? new Date(query.to) : from);
    const where: Prisma.AttendanceRecordWhereInput = {
      date: { gte: from, lte: to },
      ...(query.classGroupId ? { classGroupId: query.classGroupId } : {}),
      ...(query.schoolId ? { classGroup: { schoolId: query.schoolId } } : {}),
    };
    const records = await this.prisma.scoped.attendanceRecord.findMany({
      where,
      orderBy: [{ date: "asc" }, { classGroupId: "asc" }],
      include: {
        student: {
          select: {
            admissionNumber: true,
            firstName: true,
            lastName: true,
          },
        },
        classGroup: { select: { name: true } },
      },
    });

    const header = [
      "Date",
      "Class",
      "Admission Number",
      "First Name",
      "Last Name",
      "Status",
      "Source",
      "Remark",
    ];
    const rows = records.map((r) => [
      r.date.toISOString().slice(0, 10),
      r.classGroup?.name ?? "",
      r.student.admissionNumber,
      r.student.firstName,
      r.student.lastName,
      r.status,
      r.source,
      r.remark ?? "",
    ]);
    const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => escape(cell)).join(","))
      .join("\n");

    return {
      csv,
      filename: `attendance-${from.toISOString().slice(0, 10)}-${to.toISOString().slice(0, 10)}.csv`,
      count: records.length,
    };
  }

  // ---------- helpers ----------

  private countStatuses(
    groups: Array<{ status: string; _count: { _all: number } }>,
  ): Record<string, number> {
    const out: Record<string, number> = {};
    for (const g of groups) out[g.status] = g._count._all;
    return out;
  }

  private sumValues(record: Record<string, number>): number {
    return Object.values(record).reduce((a, b) => a + (b ?? 0), 0);
  }

  private rate(part: number, total: number): number {
    return total > 0 ? Number(((part / total) * 100).toFixed(2)) : 0;
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private endOfDay(date: Date): Date {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      23,
      59,
      59,
      999,
    );
  }

  private resolveRange(
    from?: Date,
    to?: Date,
    month?: number,
    year?: number,
    days?: number,
  ): { from: Date; to: Date } {
    if (from && to)
      return { from: this.startOfDay(from), to: this.endOfDay(to) };
    if (days) {
      const end = this.endOfDay(new Date());
      const start = new Date(end.getTime() - (days - 1) * 86400000);
      return { from: this.startOfDay(start), to: end };
    }
    const today = new Date();
    const ref = year
      ? new Date(year, (month ?? today.getMonth() + 1) - 1, 1)
      : today;
    const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const end = new Date(
      ref.getFullYear(),
      ref.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
    return { from: start, to: end };
  }

  private buildTrend(
    groups: Array<{
      status: string;
      date: Date;
      _count: { _all: number };
    }>,
    from: Date,
    to: Date,
  ) {
    const byDate = new Map<string, Record<string, number>>();
    for (const g of groups) {
      const key = g.date.toISOString().slice(0, 10);
      const entry = byDate.get(key) ?? {};
      entry[g.status] = (entry[g.status] ?? 0) + g._count._all;
      byDate.set(key, entry);
    }
    const points: Array<{
      date: string;
      total: number;
      present: number;
      absent: number;
      late: number;
      excused: number;
      presentRate: number;
    }> = [];
    const cursor = new Date(from);
    const end = this.startOfDay(to);
    while (cursor.getTime() <= end.getTime()) {
      const key = cursor.toISOString().slice(0, 10);
      const counts = byDate.get(key) ?? {};
      points.push({
        date: key,
        total: this.sumValues(counts),
        present: counts["PRESENT"] ?? 0,
        absent: counts["ABSENT"] ?? 0,
        late: counts["LATE"] ?? 0,
        excused: counts["EXCUSED"] ?? 0,
        presentRate: this.rate(counts["PRESENT"] ?? 0, this.sumValues(counts)),
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return points;
  }
}
