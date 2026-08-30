import { createHmac } from "crypto";

import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AttendanceStatus, type Prisma } from "@prisma/client";

import type { CreateAttendanceDto } from "./dto/create-attendance.dto";
import type { QueryAttendanceDto } from "./dto/query-attendance.dto";
import type { ScanAttendanceDto } from "./dto/scan-attendance.dto";
import type { UpdateAttendanceDto } from "./dto/update-attendance.dto";
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
export class AttendanceService extends BaseRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  /** Creates (or updates) attendance records for a class on a given date. */
  async create(dto: CreateAttendanceDto, recordedById?: string) {
    await this.assertClassInTenant(dto.classGroupId);

    const date = dto.date ?? new Date();
    const dateOnly = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );

    const studentIds = dto.records.map((r) => r.studentId);
    const existing = await this.prisma.scoped.attendanceRecord.findMany({
      where: {
        classGroupId: dto.classGroupId,
        date: dateOnly,
        studentId: { in: studentIds },
      },
      select: { id: true, studentId: true },
    });
    const existingByStudent = new Map(existing.map((e) => [e.studentId, e.id]));

    const creates: Prisma.AttendanceRecordCreateManyInput[] = [];
    const updates: Array<{
      id: string;
      data: Prisma.AttendanceRecordUpdateInput;
    }> = [];

    for (const record of dto.records) {
      const existingId = existingByStudent.get(record.studentId);
      const data = {
        status: record.status,
        remark: record.remark ?? null,
        ...(recordedById ? { recordedById } : {}),
      };
      if (existingId) {
        updates.push({ id: existingId, data });
      } else {
        creates.push({
          tenantId: this.tenantId(),
          studentId: record.studentId,
          classGroupId: dto.classGroupId,
          date: dateOnly,
          status: record.status,
          remark: record.remark,
          recordedById,
        });
      }
    }

    if (creates.length > 0) {
      await this.prisma.scoped.attendanceRecord.createMany({ data: creates });
    }
    for (const update of updates) {
      await this.prisma.scoped.attendanceRecord.update({
        where: { id: update.id },
        data: update.data,
      });
    }

    return { created: creates.length, updated: updates.length, date: dateOnly };
  }

  async findAll(query: QueryAttendanceDto) {
    const pagination = toPaginationArgs(query);
    const conditions: Prisma.AttendanceRecordWhereInput[] = [];
    if (query.classGroupId)
      conditions.push({ classGroupId: query.classGroupId });
    if (query.date) conditions.push({ date: query.date });
    if (query.studentId) conditions.push({ studentId: query.studentId });
    if (query.status) conditions.push({ status: query.status });

    const where: Prisma.AttendanceRecordWhereInput = {
      AND: conditions.length > 0 ? conditions : undefined,
    };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.attendanceRecord.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: buildOrderBy(query, [
          "date",
          "status",
          "createdAt",
        ]) as Prisma.AttendanceRecordOrderByWithRelationInput,
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
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  async summary(classGroupId: string, from?: string, to?: string) {
    await this.assertClassInTenant(classGroupId);
    const where: Prisma.AttendanceRecordWhereInput = {
      classGroupId,
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    };

    const grouped = await this.prisma.scoped.attendanceRecord.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    });

    const total = grouped.reduce((acc, g) => acc + g._count._all, 0);
    const present =
      grouped.find((g) => g.status === AttendanceStatus.PRESENT)?._count._all ??
      0;
    return {
      classGroupId,
      total,
      present,
      presentRate: total > 0 ? Number(((present / total) * 100).toFixed(2)) : 0,
      breakdown: grouped.map((g) => ({
        status: g.status,
        count: g._count._all,
      })),
    };
  }

  async findOne(id: string) {
    const record = await this.prisma.scoped.attendanceRecord.findFirst({
      where: { id },
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
    });
    if (!record) throw new ResourceNotFoundException("Attendance record", id);
    return record;
  }

  /** Builds a per-student QR sheet for a class on a given date. */
  async qrSheet(classGroupId: string, date?: Date) {
    await this.assertClassInTenant(classGroupId);
    const dateOnly = this.normalizeDate(date ?? new Date());

    const students = await this.prisma.scoped.student.findMany({
      where: {
        enrollments: { some: { classGroupId, status: "ACTIVE" } },
      },
      select: {
        id: true,
        admissionNumber: true,
        firstName: true,
        lastName: true,
      },
      orderBy: { admissionNumber: "asc" },
    });

    const existing = await this.prisma.scoped.attendanceRecord.findMany({
      where: { classGroupId, date: dateOnly },
      select: { studentId: true, status: true },
    });
    const statusByStudent = new Map(
      existing.map((r) => [r.studentId, r.status]),
    );

    return {
      classGroupId,
      date: dateOnly,
      total: students.length,
      students: students.map((s) => ({
        studentId: s.id,
        admissionNumber: s.admissionNumber,
        name: `${s.firstName} ${s.lastName}`,
        token: this.signQrToken(s.id),
        status: statusByStudent.get(s.id) ?? null,
      })),
    };
  }

  /** Marks a student present from a scanned QR token (or admission number). */
  async scan(dto: ScanAttendanceDto, recordedById?: string) {
    const studentId = await this.resolveScanToken(dto.token);
    const student = await this.prisma.scoped.student.findFirst({
      where: { id: studentId },
      select: {
        id: true,
        admissionNumber: true,
        firstName: true,
        lastName: true,
        enrollments: {
          where: { status: "ACTIVE" },
          orderBy: { enrolledAt: "desc" },
          take: 1,
          select: { classGroupId: true },
        },
      },
    });
    if (!student) {
      throw new BadRequestOperationException(
        "Student not found for the provided token",
      );
    }

    const dateOnly = this.normalizeDate(dto.date ?? new Date());
    let classGroupId = dto.classGroupId;
    if (classGroupId) {
      await this.assertClassInTenant(classGroupId);
    } else {
      classGroupId = student.enrollments[0]?.classGroupId;
    }
    if (!classGroupId) {
      throw new BadRequestOperationException(
        "No active enrollment found for this student; provide a classGroupId",
      );
    }

    const existing = await this.prisma.scoped.attendanceRecord.findFirst({
      where: {
        studentId: student.id,
        classGroupId,
        date: dateOnly,
        subjectId: null,
      },
      select: { id: true },
    });
    const payload = {
      status: "PRESENT" as const,
      source: "QR" as const,
      ...(recordedById ? { recordedById } : {}),
    };
    const include = {
      student: {
        select: {
          firstName: true,
          lastName: true,
          admissionNumber: true,
        },
      },
      classGroup: { select: { id: true, name: true } },
    } as const;

    const record = existing
      ? await this.prisma.scoped.attendanceRecord.update({
          where: { id: existing.id },
          data: payload,
          include,
        })
      : await this.prisma.scoped.attendanceRecord.create({
          data: {
            tenantId: this.tenantId(),
            studentId: student.id,
            classGroupId,
            date: dateOnly,
            ...payload,
          },
          include,
        });

    return {
      ...record,
      scanned: {
        studentId: student.id,
        admissionNumber: student.admissionNumber,
        name: `${student.firstName} ${student.lastName}`,
      },
    };
  }

  private signQrToken(studentId: string): string {
    const secret =
      this.config.get<string>("jwt.accessSecret") ?? "dev-access-secret";
    const mac = createHmac("sha256", secret)
      .update(`attendance:${studentId}`)
      .digest("hex")
      .slice(0, 32);
    return `EDUOS.ATT.1.${studentId}.${mac}`;
  }

  private async resolveScanToken(token: string): Promise<string> {
    const parts = token.split(".");
    if (parts.length === 5 && parts[0] === "EDUOS" && parts[1] === "ATT") {
      const [, , , studentId] = parts;
      if (studentId && this.signQrToken(studentId) === token) return studentId;
      throw new BadRequestOperationException("Invalid or expired QR token");
    }
    const student = await this.prisma.scoped.student.findFirst({
      where: { admissionNumber: token },
      select: { id: true },
    });
    if (!student) {
      throw new BadRequestOperationException(
        "Student not found for the provided token",
      );
    }
    return student.id;
  }

  private normalizeDate(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  async update(id: string, dto: UpdateAttendanceDto) {
    await this.findOne(id);
    return this.prisma.scoped.attendanceRecord.update({
      where: { id },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
      },
    });
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
}
