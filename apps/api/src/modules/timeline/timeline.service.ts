import { Injectable } from "@nestjs/common";
import { TimelineEventType, type Prisma } from "@prisma/client";

import type { CreateTimelineEventDto } from "./dto/create-timeline-event.dto";
import type { QueryTimelineDto } from "./dto/query-timeline.dto";
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
export class TimelineService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  /** Records a timeline event for a student, validating tenant ownership. */
  async record(
    dto: CreateTimelineEventDto | Omit<CreateTimelineEventDto, "occurredAt">,
    actorId?: string,
  ) {
    await this.assertStudentInTenant(dto.studentId);
    return this.prisma.scoped.timelineEvent.create({
      data: {
        studentId: dto.studentId,
        eventType: dto.eventType,
        title: dto.title,
        description: dto.description ?? null,
        actorId,
        occurredAt: ("occurredAt" in dto && dto.occurredAt) || new Date(),
      } as Prisma.TimelineEventUncheckedCreateInput,
    });
  }

  async findAll(query: QueryTimelineDto) {
    const pagination = toPaginationArgs(query);
    const conditions: Prisma.TimelineEventWhereInput[] = [];

    if (query.studentId) conditions.push({ studentId: query.studentId });
    if (query.eventType) conditions.push({ eventType: query.eventType });
    if (query.from || query.to) {
      conditions.push({
        occurredAt: {
          ...(query.from ? { gte: query.from } : {}),
          ...(query.to ? { lte: query.to } : {}),
        },
      });
    }

    const where: Prisma.TimelineEventWhereInput = {
      deletedAt: null,
      AND: conditions.length > 0 ? conditions : undefined,
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.timelineEvent.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: buildOrderBy(query, [
          "occurredAt",
          "createdAt",
          "eventType",
        ]) as Prisma.TimelineEventOrderByWithRelationInput,
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              admissionNumber: true,
            },
          },
        },
      }),
      this.prisma.scoped.timelineEvent.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  async findOne(id: string) {
    const event = await this.prisma.scoped.timelineEvent.findFirst({
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
      },
    });
    if (!event) throw new ResourceNotFoundException("Timeline event", id);
    return event;
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.scoped.timelineEvent.updateMany({
      where: { id },
      data: { deletedAt: new Date() },
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
}

// Re-export for convenience in other SIS modules.
export type { TimelineEventType };
