import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import type { CreateLessonDto } from "./dto/create-lesson.dto";
import type { ReorderLessonsDto } from "./dto/reorder-lessons.dto";
import type { UpdateLessonDto } from "./dto/update-lesson.dto";
import { ResourceNotFoundException } from "../../common/exceptions/business.exceptions";
import { BaseRepository } from "../../common/repositories/base.repository";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class CourseLessonsService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(courseId: string, dto: CreateLessonDto) {
    const course = await this.prisma.scoped.course.findFirst({
      where: this.tenantWhere({ id: courseId, deletedAt: null }),
    });
    if (!course) throw new ResourceNotFoundException("Course", courseId);

    const orderIndex = dto.orderIndex ?? (await this.nextOrderIndex(courseId));

    return this.prisma.scoped.courseLesson.create({
      data: this.withTenant({
        courseId,
        title: dto.title,
        summary: dto.summary,
        content: dto.content,
        videoUrl: dto.videoUrl,
        audioUrl: dto.audioUrl,
        pdfUrl: dto.pdfUrl,
        orderIndex,
        durationMinutes: dto.durationMinutes,
        isFree: dto.isFree ?? false,
      } as Prisma.CourseLessonUncheckedCreateInput),
    });
  }

  async findAll(courseId: string) {
    const lessons = await this.prisma.scoped.courseLesson.findMany({
      where: this.tenantWhere({ courseId, deletedAt: null }),
      orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
    });
    return { items: lessons, meta: { total: lessons.length } };
  }

  async findOne(courseId: string, id: string) {
    const lesson = await this.prisma.scoped.courseLesson.findFirst({
      where: this.tenantWhere({ id, courseId, deletedAt: null }),
    });
    if (!lesson) throw new ResourceNotFoundException("Lesson", id);
    return lesson;
  }

  async update(courseId: string, id: string, dto: UpdateLessonDto) {
    await this.findOne(courseId, id);
    return this.prisma.scoped.courseLesson.update({
      where: { id },
      data: dto as Prisma.CourseLessonUpdateInput,
    });
  }

  async reorder(courseId: string, dto: ReorderLessonsDto) {
    await this.ensureCourse(courseId);
    const ids = dto.items.map((item) => item.id);
    const target = new Map(dto.items.map((item) => [item.id, item.orderIndex]));

    // Two-phase update avoids collisions on the [courseId, orderIndex] unique.
    const bump = ids.map((id) =>
      this.prisma.scoped.courseLesson.updateMany({
        where: this.tenantWhere({ id, courseId }),
        data: { orderIndex: { increment: 10000 } },
      }),
    );
    await this.prisma.$transaction(bump);

    const apply = ids.map((id) =>
      this.prisma.scoped.courseLesson.updateMany({
        where: this.tenantWhere({ id, courseId }),
        data: { orderIndex: target.get(id) ?? 0 },
      }),
    );
    await this.prisma.$transaction(apply);

    return this.findAll(courseId);
  }

  async remove(courseId: string, id: string): Promise<void> {
    await this.findOne(courseId, id);
    await this.prisma.scoped.courseLesson.update({
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

  private async nextOrderIndex(courseId: string): Promise<number> {
    const last = await this.prisma.scoped.courseLesson.findFirst({
      where: this.tenantWhere({ courseId, deletedAt: null }),
      orderBy: { orderIndex: "desc" },
    });
    return (last?.orderIndex ?? -1) + 1;
  }
}
