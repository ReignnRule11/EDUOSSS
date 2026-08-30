import { Injectable } from "@nestjs/common";
import { EnrollmentStatus, PaymentStatus, ResultStatus } from "@prisma/client";

import { BaseRepository } from "../../common/repositories/base.repository";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class EnterpriseDashboardsService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  // ---------------- Overview widgets ----------------

  async overview() {
    const [
      totalStudents,
      activeEnrollments,
      totalCollected,
      outstandingAgg,
      attendance,
      academic,
      teachers,
      studentGrowth,
    ] = await Promise.all([
      this.prisma.scoped.student.count({
        where: this.tenantWhere({ deletedAt: null }),
      }),
      this.prisma.scoped.enrollment.count({
        where: this.tenantWhere({ status: EnrollmentStatus.ACTIVE }),
      }),
      this.prisma.scoped.payment.aggregate({
        where: this.tenantWhere({ status: PaymentStatus.COMPLETED }),
        _sum: { amount: true },
      }),
      this.prisma.scoped.invoice.aggregate({
        where: this.tenantWhere({ deletedAt: null, balanceAmount: { gt: 0 } }),
        _sum: { balanceAmount: true },
      }),
      this.attendanceSummary(),
      this.academicPerformance(),
      this.teacherProductivity(),
      this.studentGrowth(),
    ]);

    const collected = totalCollected._sum?.amount ?? 0;
    const outstanding = outstandingAgg._sum?.balanceAmount ?? 0;
    const invoiced = collected + outstanding;

    return {
      widgets: {
        totalStudents,
        activeEnrollments,
        revenueCollected: collected,
        outstandingFees: outstanding,
        attendanceRate: attendance.overall.rate,
        academicAverage: academic.overallAverage,
        teacherCount: teachers.total,
        paymentCollectionRate:
          invoiced > 0 ? Number(((collected / invoiced) * 100).toFixed(1)) : 0,
      },
      studentGrowth: studentGrowth.items,
      revenueByMonth: (await this.revenue()).series,
    };
  }

  // ---------------- Admissions ----------------

  async admissions() {
    const students = await this.prisma.scoped.student.findMany({
      where: this.tenantWhere({ deletedAt: null }),
      select: { createdAt: true, academicStatus: true },
    });
    const byMonth = this.groupByMonth(students.map((s) => s.createdAt));
    const byStatus: Record<string, number> = {};
    for (const s of students) {
      byStatus[s.academicStatus] = (byStatus[s.academicStatus] ?? 0) + 1;
    }
    return {
      total: students.length,
      byMonth,
      byStatus,
    };
  }

  // ---------------- Enrollment ----------------

  async enrollment() {
    const enrollments = await this.prisma.scoped.enrollment.findMany({
      where: this.tenantWhere({ status: EnrollmentStatus.ACTIVE }),
      include: {
        classGroup: { select: { id: true, name: true } },
      },
    });
    const byClass = new Map<string, number>();
    for (const e of enrollments) {
      const name = e.classGroup?.name ?? "Unknown";
      byClass.set(name, (byClass.get(name) ?? 0) + 1);
    }
    const byYear = new Map<string, number>();
    for (const e of enrollments) {
      byYear.set(e.academicYear, (byYear.get(e.academicYear) ?? 0) + 1);
    }
    return {
      total: enrollments.length,
      byClass: Array.from(byClass.entries()).map(([label, value]) => ({
        label,
        value,
      })),
      byYear: Array.from(byYear.entries()).map(([label, value]) => ({
        label,
        value,
      })),
    };
  }

  // ---------------- Revenue ----------------

  async revenue() {
    const payments = await this.prisma.scoped.payment.findMany({
      where: this.tenantWhere({ status: PaymentStatus.COMPLETED }),
      select: { amount: true, createdAt: true, method: true },
    });
    const byMonth = this.groupByMonth(payments.map((p) => p.createdAt));
    const byMethod = new Map<string, number>();
    for (const p of payments) {
      byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + p.amount);
    }
    return {
      total: payments.reduce((s, p) => s + p.amount, 0),
      series: byMonth,
      byMethod: Array.from(byMethod.entries()).map(([label, value]) => ({
        label,
        value,
      })),
    };
  }

  // ---------------- Attendance ----------------

  async attendance(windowDays = 30) {
    const since = new Date();
    since.setDate(since.getDate() - windowDays);
    const records = await this.prisma.scoped.attendanceRecord.findMany({
      where: this.tenantWhere({ date: { gte: since } }),
      select: { date: true, status: true },
    });
    const byStatus: Record<string, number> = {};
    const byDay = new Map<
      string,
      { PRESENT: number; ABSENT: number; LATE: number; EXCUSED: number }
    >();
    for (const r of records) {
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
      const day = r.date.toISOString().slice(0, 10);
      const entry = byDay.get(day) ?? {
        PRESENT: 0,
        ABSENT: 0,
        LATE: 0,
        EXCUSED: 0,
      };
      entry[r.status] = (entry[r.status] ?? 0) + 1;
      byDay.set(day, entry);
    }
    const present = byStatus.PRESENT ?? 0;
    const total = records.length;
    return {
      windowDays,
      total,
      byStatus,
      dailyTrend: Array.from(byDay.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, v]) => ({
          date,
          present: v.PRESENT,
          absent: v.ABSENT,
          late: v.LATE,
          rate:
            v.PRESENT + v.ABSENT + v.LATE + v.EXCUSED > 0
              ? Number(
                  (
                    (v.PRESENT / (v.PRESENT + v.ABSENT + v.LATE + v.EXCUSED)) *
                    100
                  ).toFixed(1),
                )
              : 0,
        })),
      overall: {
        rate: total > 0 ? Number(((present / total) * 100).toFixed(1)) : 0,
        present,
        total,
      },
    };
  }

  private async attendanceSummary() {
    const data = await this.attendance(30);
    return { overall: data.overall };
  }

  // ---------------- Academic performance ----------------

  async academicPerformance() {
    const [termResults, subjectResults, scales] = await Promise.all([
      this.prisma.scoped.termResult.findMany({
        where: this.tenantWhere({
          deletedAt: null,
          status: { in: [ResultStatus.APPROVED, ResultStatus.RELEASED] },
        }),
        select: { average: true, academicYear: true, term: true },
      }),
      this.prisma.scoped.subjectResult.findMany({
        where: this.tenantWhere({}),
        select: { letterGrade: true },
      }),
      this.prisma.scoped.resultScale.findFirst({
        where: this.tenantWhere({ isActive: true, deletedAt: null }),
        include: { entries: true },
      }),
    ]);

    const scored = termResults.filter((r) => r.average !== null);
    const overallAverage =
      scored.length > 0
        ? Number(
            (
              scored.reduce((s, r) => s + (r.average ?? 0), 0) / scored.length
            ).toFixed(1),
          )
        : 0;

    const byTerm = new Map<string, { total: number; count: number }>();
    for (const r of scored) {
      const key = `${r.academicYear} · ${r.term}`;
      const entry = byTerm.get(key) ?? { total: 0, count: 0 };
      entry.total += r.average ?? 0;
      entry.count += 1;
      byTerm.set(key, entry);
    }

    const gradeDistribution: Record<string, number> = {};
    for (const s of subjectResults) {
      if (s.letterGrade) {
        gradeDistribution[s.letterGrade] =
          (gradeDistribution[s.letterGrade] ?? 0) + 1;
      }
    }

    return {
      overallAverage,
      byTerm: Array.from(byTerm.entries()).map(([label, v]) => ({
        label,
        average: Number((v.total / v.count).toFixed(1)),
      })),
      gradeDistribution,
      scale: scales ? { name: scales.name, entries: scales.entries } : null,
    };
  }

  // ---------------- Teacher productivity ----------------

  async teacherProductivity() {
    const [teachers, classGroups, classSubjects] = await Promise.all([
      this.prisma.scoped.teacher.findMany({
        where: this.tenantWhere({ deletedAt: null }),
        select: { id: true, firstName: true, lastName: true },
      }),
      this.prisma.scoped.classGroup.findMany({
        where: this.tenantWhere({
          deletedAt: null,
          headTeacherId: { not: null },
        }),
        select: {
          headTeacherId: true,
          _count: { select: { enrollments: true } },
        },
      }),
      this.prisma.scoped.classSubject.findMany({
        where: this.tenantWhere({ teacherId: { not: null } }),
        select: { teacherId: true },
      }),
    ]);

    const classCount = new Map<string, number>();
    for (const c of classGroups) {
      classCount.set(
        c.headTeacherId!,
        (classCount.get(c.headTeacherId!) ?? 0) + 1,
      );
    }
    const subjectCount = new Map<string, number>();
    for (const cs of classSubjects) {
      subjectCount.set(
        cs.teacherId!,
        (subjectCount.get(cs.teacherId!) ?? 0) + 1,
      );
    }
    const studentCount = new Map<string, number>();
    for (const c of classGroups) {
      studentCount.set(
        c.headTeacherId!,
        (studentCount.get(c.headTeacherId!) ?? 0) + c._count.enrollments,
      );
    }

    const items = teachers.map((t) => ({
      teacherId: t.id,
      name: `${t.firstName} ${t.lastName}`,
      classes: classCount.get(t.id) ?? 0,
      subjects: subjectCount.get(t.id) ?? 0,
      students: studentCount.get(t.id) ?? 0,
    }));
    const withStudents = items.filter((i) => i.students > 0);
    return {
      total: teachers.length,
      avgClasses:
        teachers.length > 0
          ? Number(
              (
                items.reduce((s, i) => s + i.classes, 0) / teachers.length
              ).toFixed(1),
            )
          : 0,
      avgStudents:
        withStudents.length > 0
          ? Number(
              (
                withStudents.reduce((s, i) => s + i.students, 0) /
                withStudents.length
              ).toFixed(1),
            )
          : 0,
      items,
    };
  }

  // ---------------- Payment collection ----------------

  async paymentCollection() {
    const payments = await this.prisma.scoped.payment.findMany({
      where: this.tenantWhere({ status: PaymentStatus.COMPLETED }),
      select: { amount: true, createdAt: true },
    });
    const invoices = await this.prisma.scoped.invoice.findMany({
      where: this.tenantWhere({ deletedAt: null }),
      select: { totalAmount: true, createdAt: true },
    });
    const invoiced = invoices.reduce((s, i) => s + i.totalAmount, 0);
    const collected = payments.reduce((s, p) => s + p.amount, 0);

    const invoiceByMonth = new Map<string, number>();
    for (const i of invoices) {
      const key = i.createdAt.toISOString().slice(0, 7);
      invoiceByMonth.set(key, (invoiceByMonth.get(key) ?? 0) + i.totalAmount);
    }

    const paymentByMonth = this.monthMap(payments.map((p) => p.createdAt));
    const months = new Set([
      ...paymentByMonth.keys(),
      ...invoiceByMonth.keys(),
    ]);
    return {
      invoiced,
      collected,
      collectionRate:
        invoiced > 0 ? Number(((collected / invoiced) * 100).toFixed(1)) : 0,
      series: Array.from(months)
        .sort()
        .map((label) => ({
          label,
          invoiced: invoiceByMonth.get(label) ?? 0,
          collected: paymentByMonth.get(label) ?? 0,
        })),
    };
  }

  // ---------------- Student growth ----------------

  async studentGrowth() {
    const students = await this.prisma.scoped.student.findMany({
      where: this.tenantWhere({ deletedAt: null }),
      select: { createdAt: true },
    });
    const byMonth = this.monthMap(students.map((s) => s.createdAt));
    // Cumulative growth
    const months = Array.from(byMonth.keys()).sort();
    let running = 0;
    const cumulative = months.map((label) => {
      running += byMonth.get(label) ?? 0;
      return { label, value: running };
    });
    return {
      total: students.length,
      byMonth: this.groupByMonth(students.map((s) => s.createdAt)),
      items: cumulative,
    };
  }

  // ---------------- Export ----------------

  async exportCsv(): Promise<{ csv: string; filename: string }> {
    const data = await this.overview();
    const rows: Array<Array<string | number>> = [
      ["Metric", "Value"],
      ["Total students", data.widgets.totalStudents],
      ["Active enrollments", data.widgets.activeEnrollments],
      ["Revenue collected", data.widgets.revenueCollected],
      ["Outstanding fees", data.widgets.outstandingFees],
      ["Attendance rate (%)", data.widgets.attendanceRate],
      ["Academic average", data.widgets.academicAverage],
      ["Teachers", data.widgets.teacherCount],
      ["Payment collection rate (%)", data.widgets.paymentCollectionRate],
      ["", ""],
      ["Month", "Revenue collected"],
      ...(data.revenueByMonth ?? []).map((m) => [m.label, m.value]),
    ];
    const csv = rows
      .map((r) =>
        r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const filename = `enterprise-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
    return { csv, filename };
  }

  // ---------------- helpers ----------------

  private groupByMonth(dates: Date[]): Array<{ label: string; value: number }> {
    return Array.from(this.monthMap(dates).entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, value]) => ({ label, value }));
  }

  private monthMap(dates: Date[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const d of dates) {
      const key = d.toISOString().slice(0, 7);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }
}
