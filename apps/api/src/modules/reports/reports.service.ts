import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import type { QueryReportsDto } from "./dto/query-reports.dto";
import { BaseRepository } from "../../common/repositories/base.repository";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class ReportsService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getOverview(query: QueryReportsDto) {
    const tenantId = this.tenantId();
    const schoolFilter = query.schoolId ? { schoolId: query.schoolId } : {};
    const yearFilter = query.academicYear
      ? { academicYear: query.academicYear }
      : {};

    const [
      students,
      teachers,
      classes,
      subjects,
      sessions,
      departments,
      announcements,
      enrollments,
      activeStudents,
    ] = await Promise.all([
      this.prisma.student.count({
        where: { tenantId, deletedAt: null, ...schoolFilter },
      }),
      this.prisma.teacher.count({
        where: { tenantId, deletedAt: null, ...schoolFilter },
      }),
      this.prisma.classGroup.count({
        where: { tenantId, deletedAt: null, ...schoolFilter },
      }),
      this.prisma.subject.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.academicSession.count({
        where: { tenantId, deletedAt: null },
      }),
      this.prisma.department.count({
        where: { tenantId, deletedAt: null, ...schoolFilter },
      }),
      this.prisma.announcement.count({
        where: { tenantId, deletedAt: null },
      }),
      this.prisma.enrollment.count({
        where: {
          tenantId,
          status: "ACTIVE",
          ...yearFilter,
          ...(query.schoolId
            ? { classGroup: { schoolId: query.schoolId } }
            : {}),
        },
      }),
      this.prisma.student.count({
        where: {
          tenantId,
          deletedAt: null,
          academicStatus: "ACTIVE",
          ...schoolFilter,
        },
      }),
    ]);

    return {
      students,
      activeStudents,
      teachers,
      classes,
      subjects,
      sessions,
      departments,
      announcements,
      enrollments,
    };
  }

  async getEnrollmentByClass(query: QueryReportsDto) {
    const where: Prisma.ClassGroupWhereInput = {
      deletedAt: null,
      ...(query.schoolId ? { schoolId: query.schoolId } : {}),
    };
    const classes = await this.prisma.scoped.classGroup.findMany({
      where: this.tenantWhere(where),
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        gradeLevel: true,
        _count: { select: { enrollments: true } },
      },
    });
    const total = classes.reduce((sum, c) => sum + c._count.enrollments, 0);
    return {
      total,
      items: classes.map((c) => ({
        classGroupId: c.id,
        name: c.name,
        gradeLevel: c.gradeLevel,
        count: c._count.enrollments,
      })),
    };
  }

  async getGenderDistribution(query: QueryReportsDto) {
    const tenantId = this.tenantId();
    const where: Prisma.StudentWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.schoolId ? { schoolId: query.schoolId } : {}),
    };
    const groups = await this.prisma.student.groupBy({
      by: ["gender"],
      where,
      _count: true,
    });
    return groups.map((g) => ({ gender: g.gender, count: g._count }));
  }

  async getAttendanceSummary(query: QueryReportsDto) {
    const tenantId = this.tenantId();
    const since = new Date();
    since.setDate(since.getDate() - (query.windowDays ?? 30));

    const where: Prisma.AttendanceRecordWhereInput = {
      tenantId,
      date: { gte: since },
      ...(query.schoolId ? { classGroup: { schoolId: query.schoolId } } : {}),
    };
    const groups = await this.prisma.attendanceRecord.groupBy({
      by: ["status"],
      where,
      _count: true,
    });
    const total = groups.reduce((sum, g) => sum + g._count, 0);
    const byStatus = groups.map((g) => ({ status: g.status, count: g._count }));
    const presentCount = groups
      .filter((g) => g.status === "PRESENT")
      .reduce((sum, g) => sum + g._count, 0);
    return {
      total,
      presentCount,
      presentRate: total > 0 ? Number((presentCount / total) * 100) : 0,
      byStatus,
    };
  }

  async getAcademicYearSummary() {
    const [classes, sessions, terms] = await Promise.all([
      this.prisma.scoped.classGroup.findMany({
        where: this.tenantWhere({ deletedAt: null }),
        select: {
          academicYear: true,
          _count: { select: { enrollments: true } },
        },
      }),
      this.prisma.scoped.academicSession.findMany({
        where: this.tenantWhere({ deletedAt: null }),
        select: {
          name: true,
          status: true,
          isCurrent: true,
          _count: { select: { terms: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.scoped.academicTerm.findMany({
        where: this.tenantWhere({ deletedAt: null }),
        select: {
          name: true,
          status: true,
          isCurrent: true,
          sessionId: true,
        },
      }),
    ]);

    const byYear = new Map<string, { classes: number; enrollments: number }>();
    for (const c of classes) {
      const key = c.academicYear ?? "Unknown";
      const entry = byYear.get(key) ?? { classes: 0, enrollments: 0 };
      entry.classes += 1;
      entry.enrollments += c._count.enrollments;
      byYear.set(key, entry);
    }

    return {
      sessions: sessions.map((s) => ({
        name: s.name,
        status: s.status,
        isCurrent: s.isCurrent,
        terms: s._count.terms,
      })),
      terms,
      classBreakdown: Array.from(byYear.entries()).map(([academicYear, v]) => ({
        academicYear,
        ...v,
      })),
    };
  }
}
