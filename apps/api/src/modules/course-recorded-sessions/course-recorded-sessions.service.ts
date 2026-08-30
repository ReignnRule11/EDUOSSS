import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import type { CreateRecordedSessionDto } from "./dto/recorded-session.dto";
import type { UpdateRecordedSessionDto } from "./dto/update-recorded-session.dto";
import { ResourceNotFoundException } from "../../common/exceptions/business.exceptions";
import { BaseRepository } from "../../common/repositories/base.repository";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class CourseRecordedSessionsService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(courseId: string, dto: CreateRecordedSessionDto) {
    await this.ensureCourse(courseId);
    return this.prisma.scoped.recordedSession.create({
      data: this.withTenant({
        courseId,
        title: dto.title,
        description: dto.description,
        videoUrl: dto.videoUrl,
        durationSeconds: dto.durationSeconds,
        thumbnailUrl: dto.thumbnailUrl,
        lessonId: dto.lessonId,
        publishedAt: new Date(),
      } as Prisma.RecordedSessionUncheckedCreateInput),
    });
  }

  async findAll(courseId: string) {
    await this.ensureCourse(courseId);
    const items = await this.prisma.scoped.recordedSession.findMany({
      where: this.tenantWhere({ courseId, deletedAt: null }),
      orderBy: [{ publishedAt: "desc" }],
      include: {
        lesson: { select: { id: true, title: true } },
      },
    });
    return { items, meta: { total: items.length } };
  }

  async findOne(courseId: string, id: string) {
    const session = await this.prisma.scoped.recordedSession.findFirst({
      where: this.tenantWhere({ id, courseId, deletedAt: null }),
      include: {
        lesson: { select: { id: true, title: true } },
      },
    });
    if (!session) throw new ResourceNotFoundException("RecordedSession", id);
    return session;
  }

  async update(courseId: string, id: string, dto: UpdateRecordedSessionDto) {
    await this.findOne(courseId, id);
    return this.prisma.scoped.recordedSession.update({
      where: { id },
      data: dto as Prisma.RecordedSessionUpdateInput,
      include: {
        lesson: { select: { id: true, title: true } },
      },
    });
  }

  async remove(courseId: string, id: string): Promise<void> {
    await this.findOne(courseId, id);
    await this.prisma.scoped.recordedSession.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async ensureCourse(courseId: string) {
    const course = await this.prisma.scoped.course.findFirst({
      where: this.tenantWhere({ id: courseId, deletedAt: null }),
    });
    if (!course) throw new ResourceNotFoundException("Course", courseId);
  }
}
