import { AuthPrincipal } from "@eduos/shared";
import { Injectable } from "@nestjs/common";
import { LiveClassStatus, Prisma } from "@prisma/client";

import type { CreateLiveClassDto } from "./dto/live-class.dto";
import type { UpdateLiveClassDto } from "./dto/update-live-class.dto";
import { ResourceNotFoundException } from "../../common/exceptions/business.exceptions";
import { BaseRepository } from "../../common/repositories/base.repository";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class CourseLiveClassesService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(
    courseId: string,
    dto: CreateLiveClassDto,
    actor: AuthPrincipal,
  ) {
    await this.ensureCourse(courseId);
    return this.prisma.scoped.liveClass.create({
      data: this.withTenant({
        courseId,
        createdById: actor.userId,
        title: dto.title,
        description: dto.description,
        startAt: dto.startAt,
        endAt: dto.endAt,
        meetingUrl: dto.meetingUrl,
        status: dto.status ?? LiveClassStatus.SCHEDULED,
      } as Prisma.LiveClassUncheckedCreateInput),
      include: this.liveClassInclude,
    });
  }

  async findAll(courseId: string) {
    await this.ensureCourse(courseId);
    const items = await this.prisma.scoped.liveClass.findMany({
      where: this.tenantWhere({ courseId, deletedAt: null }),
      orderBy: [{ startAt: "asc" }],
      include: this.liveClassInclude,
    });
    return { items, meta: { total: items.length } };
  }

  async findOne(courseId: string, id: string) {
    const liveClass = await this.prisma.scoped.liveClass.findFirst({
      where: this.tenantWhere({ id, courseId, deletedAt: null }),
      include: this.liveClassInclude,
    });
    if (!liveClass) throw new ResourceNotFoundException("LiveClass", id);
    return liveClass;
  }

  async update(courseId: string, id: string, dto: UpdateLiveClassDto) {
    await this.findOne(courseId, id);
    return this.prisma.scoped.liveClass.update({
      where: { id },
      data: dto as Prisma.LiveClassUpdateInput,
      include: this.liveClassInclude,
    });
  }

  async updateStatus(courseId: string, id: string, status: LiveClassStatus) {
    await this.findOne(courseId, id);
    return this.prisma.scoped.liveClass.update({
      where: { id },
      data: { status },
      include: this.liveClassInclude,
    });
  }

  async remove(courseId: string, id: string): Promise<void> {
    await this.findOne(courseId, id);
    await this.prisma.scoped.liveClass.update({
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

  private get liveClassInclude(): Prisma.LiveClassInclude {
    return {
      createdBy: { select: { id: true, firstName: true, lastName: true } },
    };
  }
}
