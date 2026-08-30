import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

import type { CreateTeacherDto } from "./dto/create-teacher.dto";
import type { QueryTeachersDto } from "./dto/query-teachers.dto";
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
export class TeachersService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(dto: CreateTeacherDto) {
    await this.assertSchoolBelongsToTenant(dto.schoolId);
    const conflict = await this.prisma.scoped.teacher.findFirst({
      where: this.tenantWhere({ staffNumber: dto.staffNumber }),
    });
    if (conflict) {
      throw new ConflictResourceException(
        `Staff number "${dto.staffNumber}" already exists`,
      );
    }
    return this.prisma.scoped.teacher.create({
      data: { ...dto } as Prisma.TeacherUncheckedCreateInput,
      include: this.teacherInclude,
    });
  }

  async findAll(query: QueryTeachersDto) {
    const pagination = toPaginationArgs(query);
    const conditions: Prisma.TeacherWhereInput[] = [];

    if (query.search) {
      conditions.push({
        OR: [
          { firstName: { contains: query.search, mode: "insensitive" } },
          { lastName: { contains: query.search, mode: "insensitive" } },
          { staffNumber: { contains: query.search, mode: "insensitive" } },
          { email: { contains: query.search, mode: "insensitive" } },
        ],
      });
    }
    if (query.schoolId) conditions.push({ schoolId: query.schoolId });
    if (query.gender) conditions.push({ gender: query.gender });
    if (query.employmentType)
      conditions.push({ employmentType: query.employmentType });
    if (query.isActive !== undefined)
      conditions.push({ isActive: query.isActive });

    const where = this.tenantWhere({
      AND: conditions.length > 0 ? conditions : undefined,
    });
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.teacher.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: buildOrderBy(query, [
          "staffNumber",
          "firstName",
          "lastName",
          "createdAt",
        ]) as Prisma.TeacherOrderByWithRelationInput,
        include: this.teacherInclude,
      }),
      this.prisma.scoped.teacher.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  async findOne(id: string) {
    const teacher = await this.prisma.scoped.teacher.findFirst({
      where: this.tenantWhere({ id }),
      include: this.teacherInclude,
    });
    if (!teacher) {
      throw new ResourceNotFoundException("Teacher", id);
    }
    return teacher;
  }

  async update(id: string, dto: Partial<CreateTeacherDto>) {
    await this.findOne(id);
    if (dto.schoolId) {
      await this.assertSchoolBelongsToTenant(dto.schoolId);
    }
    return this.prisma.scoped.teacher.update({
      where: { id },
      data: dto as Prisma.TeacherUpdateInput,
      include: this.teacherInclude,
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.scoped.teacher.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });
  }

  async getProfile(id: string) {
    const teacher = await this.prisma.scoped.teacher.findFirst({
      where: this.tenantWhere({ id }),
      include: {
        school: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true } },
        user: { select: { id: true, email: true, role: true } },
        classGroups: { select: { id: true, name: true, academicYear: true } },
        subjectAssign: { select: { id: true, subjectId: true } },
        qualifications: {
          where: { deletedAt: null },
          orderBy: { yearAchieved: "desc" },
        },
        employmentHistory: {
          where: { deletedAt: null },
          orderBy: { startDate: "desc" },
        },
        attendance: {
          where: { deletedAt: null },
          orderBy: { date: "desc" },
          take: 30,
        },
        performanceReviews: {
          where: { deletedAt: null },
          orderBy: { reviewDate: "desc" },
        },
        leaveRequests: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
        },
        salaryRecords: {
          where: { deletedAt: null },
          orderBy: { effectiveDate: "desc" },
        },
        documents: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!teacher) {
      throw new ResourceNotFoundException("Teacher", id);
    }
    const salaryRecords = teacher.salaryRecords.map((record) => {
      const basicSalary = this.toNumber(record.basicSalary);
      const allowances = this.toNumber(record.allowances);
      const deductions = this.toNumber(record.deductions);
      return {
        ...record,
        basicSalary,
        allowances,
        deductions,
        netSalary: basicSalary + allowances - deductions,
      };
    });
    return {
      ...teacher,
      salaryRecords,
      stats: {
        attendanceRecords: teacher.attendance.length,
        reviewCount: teacher.performanceReviews.length,
        leaveCount: teacher.leaveRequests.length,
        documentCount: teacher.documents.length,
        pendingLeave: teacher.leaveRequests.filter(
          (leave) => leave.status === "PENDING",
        ).length,
        latestAttendance: teacher.attendance[0] ?? null,
      },
    };
  }

  async getDashboardStats() {
    const where = this.tenantWhere({ deletedAt: null });

    const [
      totalTeachers,
      activeTeachers,
      maleTeachers,
      femaleTeachers,
      pendingLeaveRequests,
    ] = await this.prisma.$transaction([
      this.prisma.scoped.teacher.count({ where }),
      this.prisma.scoped.teacher.count({
        where: { ...where, isActive: true },
      }),
      this.prisma.scoped.teacher.count({
        where: { ...where, gender: "MALE" },
      }),
      this.prisma.scoped.teacher.count({
        where: { ...where, gender: "FEMALE" },
      }),
      this.prisma.scoped.teacherLeaveRequest.count({
        where: {
          tenantId: this.tenantId(),
          deletedAt: null,
          status: "PENDING",
        },
      }),
    ]);

    const employmentTypes = await this.prisma.scoped.teacher.groupBy({
      by: ["employmentType"],
      where,
      _count: { _all: true },
    });

    const departments = await this.prisma.scoped.teacher.groupBy({
      by: ["departmentId"],
      where,
      _count: { _all: true },
    });

    return {
      totalTeachers,
      activeTeachers,
      inactiveTeachers: totalTeachers - activeTeachers,
      maleTeachers,
      femaleTeachers,
      pendingLeaveRequests,
      byEmploymentType: employmentTypes.map((row) => ({
        employmentType: row.employmentType,
        count: row._count._all,
      })),
      byDepartment: departments.map((row) => ({
        departmentId: row.departmentId,
        count: row._count._all,
      })),
    };
  }

  async setPhoto(id: string, url: string) {
    await this.findOne(id);
    return this.prisma.scoped.teacher.update({
      where: { id },
      data: { photoUrl: url },
      include: this.teacherInclude,
    });
  }

  private toNumber(value: unknown): number {
    if (value instanceof Decimal) return value.toNumber();
    if (typeof value === "number") return value;
    if (typeof value === "string") return Number(value);
    return Number(value ?? 0);
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

  private get teacherInclude(): Prisma.TeacherInclude {
    return {
      school: { select: { id: true, name: true, code: true } },
      classGroups: { select: { id: true, name: true, academicYear: true } },
    };
  }
}
