import { Injectable } from "@nestjs/common";
import { Prisma, Weekday } from "@prisma/client";

import type { CreateTimetableSlotDto } from "./dto/create-timetable-slot.dto";
import type { QueryTimetableSlotsDto } from "./dto/query-timetable-slots.dto";
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

const WEEKDAY_ORDER: Record<Weekday, number> = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

@Injectable()
export class TimetableService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(dto: CreateTimetableSlotDto) {
    await this.assertReferencesBelongToTenant(dto);

    const conflict = await this.prisma.scoped.timetableSlot.findFirst({
      where: this.tenantWhere({
        classGroupId: dto.classGroupId,
        weekday: dto.weekday,
        startTime: dto.startTime,
        termId: dto.termId ?? null,
      }),
    });
    if (conflict) {
      throw new ConflictResourceException(
        `A timetable slot already exists for this class on ${dto.weekday} at ${dto.startTime}`,
      );
    }
    if (dto.endTime <= dto.startTime) {
      throw new BadRequestOperationException("endTime must be after startTime");
    }

    return this.prisma.scoped.timetableSlot.create({
      data: { ...dto } as Prisma.TimetableSlotUncheckedCreateInput,
      include: this.slotInclude,
    });
  }

  async findAll(query: QueryTimetableSlotsDto) {
    const pagination = toPaginationArgs(query);
    const where: Prisma.TimetableSlotWhereInput = {
      deletedAt: null,
      ...(query.schoolId ? { schoolId: query.schoolId } : {}),
      ...(query.classGroupId ? { classGroupId: query.classGroupId } : {}),
      ...(query.teacherId ? { teacherId: query.teacherId } : {}),
      ...(query.sessionId ? { sessionId: query.sessionId } : {}),
      ...(query.termId ? { termId: query.termId } : {}),
      ...(query.weekday ? { weekday: query.weekday as Weekday } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.timetableSlot.findMany({
        where: this.tenantWhere(where),
        skip: pagination.skip,
        take: pagination.take,
        orderBy: buildOrderBy(query, [
          "weekday",
          "startTime",
          "endTime",
          "createdAt",
        ]) as Prisma.TimetableSlotOrderByWithRelationInput,
        include: this.slotInclude,
      }),
      this.prisma.scoped.timetableSlot.count({
        where: this.tenantWhere(where),
      }),
    ]);

    // Deterministic weekday ordering regardless of sort field requested.
    const ordered = items.sort((a, b) => {
      const dayDiff = WEEKDAY_ORDER[a.weekday] - WEEKDAY_ORDER[b.weekday];
      if (dayDiff !== 0) return dayDiff;
      return a.startTime.localeCompare(b.startTime);
    });

    return {
      items: ordered,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  async findOne(id: string) {
    const slot = await this.prisma.scoped.timetableSlot.findFirst({
      where: this.tenantWhere({ id, deletedAt: null }),
      include: this.slotInclude,
    });
    if (!slot) {
      throw new ResourceNotFoundException("Timetable slot", id);
    }
    return slot;
  }

  /** Returns a weekly grid for a class, grouped by weekday, in order. */
  async getClassTimetable(classGroupId: string, termId?: string) {
    await this.assertClassBelongsToTenant(classGroupId);
    const slots = await this.prisma.scoped.timetableSlot.findMany({
      where: this.tenantWhere({
        classGroupId,
        ...(termId ? { termId } : {}),
        deletedAt: null,
      }),
      include: this.slotInclude,
    });
    const days = (Object.values(Weekday) as Weekday[]).sort(
      (a, b) => WEEKDAY_ORDER[a] - WEEKDAY_ORDER[b],
    );
    return {
      days: days.map((day) => ({
        weekday: day,
        slots: slots
          .filter((s) => s.weekday === day)
          .sort((a, b) => a.startTime.localeCompare(b.startTime)),
      })),
    };
  }

  async update(id: string, dto: Partial<CreateTimetableSlotDto>) {
    await this.findOne(id);
    if (
      dto.schoolId ||
      dto.classGroupId ||
      dto.subjectId ||
      dto.teacherId ||
      dto.sessionId ||
      dto.termId ||
      dto.departmentId
    ) {
      await this.assertReferencesBelongToTenant(dto);
    }
    if (dto.startTime && dto.endTime && dto.endTime <= dto.startTime) {
      throw new BadRequestOperationException("endTime must be after startTime");
    }
    return this.prisma.scoped.timetableSlot.update({
      where: { id },
      data: dto as Prisma.TimetableSlotUpdateInput,
      include: this.slotInclude,
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.scoped.timetableSlot.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });
  }

  private async assertReferencesBelongToTenant(
    dto: Partial<CreateTimetableSlotDto>,
  ): Promise<void> {
    const checks: Array<{
      value?: string;
      kind:
        | "school"
        | "classGroup"
        | "subject"
        | "teacher"
        | "session"
        | "term"
        | "department";
      label: string;
    }> = [
      { value: dto.schoolId, kind: "school", label: "schoolId" },
      { value: dto.classGroupId, kind: "classGroup", label: "classGroupId" },
      { value: dto.subjectId, kind: "subject", label: "subjectId" },
      { value: dto.teacherId, kind: "teacher", label: "teacherId" },
      { value: dto.sessionId, kind: "session", label: "sessionId" },
      { value: dto.termId, kind: "term", label: "termId" },
      { value: dto.departmentId, kind: "department", label: "departmentId" },
    ];

    for (const { value, kind, label } of checks) {
      if (!value) continue;
      const found = await this.findReference(kind, value);
      if (!found) {
        throw new BadRequestOperationException(
          `The provided ${label} does not belong to this tenant`,
        );
      }
    }
  }

  private async findReference(
    kind:
      | "school"
      | "classGroup"
      | "subject"
      | "teacher"
      | "session"
      | "term"
      | "department",
    id: string,
  ): Promise<{ id: string } | null> {
    switch (kind) {
      case "school":
        return this.prisma.scoped.school.findFirst({
          where: this.tenantWhere({ id }),
          select: { id: true },
        });
      case "classGroup":
        return this.prisma.scoped.classGroup.findFirst({
          where: this.tenantWhere({ id }),
          select: { id: true },
        });
      case "subject":
        return this.prisma.scoped.subject.findFirst({
          where: this.tenantWhere({ id }),
          select: { id: true },
        });
      case "teacher":
        return this.prisma.scoped.teacher.findFirst({
          where: this.tenantWhere({ id }),
          select: { id: true },
        });
      case "session":
        return this.prisma.scoped.academicSession.findFirst({
          where: this.tenantWhere({ id, deletedAt: null }),
          select: { id: true },
        });
      case "term":
        return this.prisma.scoped.academicTerm.findFirst({
          where: this.tenantWhere({ id, deletedAt: null }),
          select: { id: true },
        });
      case "department":
        return this.prisma.scoped.department.findFirst({
          where: this.tenantWhere({ id, deletedAt: null }),
          select: { id: true },
        });
    }
  }

  private async assertClassBelongsToTenant(
    classGroupId: string,
  ): Promise<void> {
    const cls = await this.prisma.scoped.classGroup.findFirst({
      where: this.tenantWhere({ id: classGroupId }),
      select: { id: true },
    });
    if (!cls) {
      throw new BadRequestOperationException(
        "The provided classGroupId does not belong to this tenant",
      );
    }
  }

  private get slotInclude(): Prisma.TimetableSlotInclude {
    return {
      classGroup: { select: { id: true, name: true, gradeLevel: true } },
      subject: { select: { id: true, name: true, code: true } },
      teacher: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          staffNumber: true,
        },
      },
      school: { select: { id: true, name: true, code: true } },
      session: { select: { id: true, name: true, code: true } },
      term: { select: { id: true, name: true, number: true } },
      department: { select: { id: true, name: true, code: true } },
    };
  }
}
