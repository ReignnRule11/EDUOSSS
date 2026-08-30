import type { AuthPrincipal } from "@eduos/shared";
import { Injectable } from "@nestjs/common";
import { CourseStatus, Prisma } from "@prisma/client";

import type { CreateCourseDto } from "./dto/create-course.dto";
import type { QueryCoursesDto } from "./dto/query-courses.dto";
import type { UpdateCourseDto } from "./dto/update-course.dto";
import { ResourceNotFoundException } from "../../common/exceptions/business.exceptions";
import { BaseRepository } from "../../common/repositories/base.repository";
import {
  buildOrderBy,
  buildPaginationMeta,
  toPaginationArgs,
} from "../../common/utils/pagination.util";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class CoursesService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private slugify(title: string): string {
    const base = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50);
    return `${base}-${Date.now().toString(36)}`;
  }

  async create(actor: AuthPrincipal, dto: CreateCourseDto) {
    return this.prisma.scoped.course.create({
      data: this.withTenant({
        title: dto.title,
        slug: this.slugify(dto.title),
        summary: dto.summary,
        description: dto.description,
        level: dto.level,
        thumbnailUrl: dto.thumbnailUrl,
        subjectId: dto.subjectId,
        instructorId: dto.instructorId,
        schoolId: dto.schoolId,
        status: dto.status ?? CourseStatus.DRAFT,
        isFree: dto.isFree ?? false,
        ...(dto.status === CourseStatus.PUBLISHED
          ? { publishedAt: new Date() }
          : {}),
      } as Prisma.CourseUncheckedCreateInput),
      include: this.courseInclude,
    });
  }

  async findAll(query: QueryCoursesDto, actor: AuthPrincipal) {
    const pagination = toPaginationArgs(query);
    const studentView = actor.role === "STUDENT" || actor.role === "PARENT";
    const where: Prisma.CourseWhereInput = {
      deletedAt: null,
      ...(studentView || !query.status
        ? { status: CourseStatus.PUBLISHED }
        : {}),
      ...(query.status && !studentView ? { status: query.status } : {}),
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
      ...(query.instructorId ? { instructorId: query.instructorId } : {}),
      ...(query.search
        ? { title: { contains: query.search, mode: "insensitive" } }
        : {}),
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.course.findMany({
        where: this.tenantWhere(where),
        skip: pagination.skip,
        take: pagination.take,
        orderBy: [
          { createdAt: "desc" },
          buildOrderBy(query, ["title", "status", "createdAt"]),
        ] as Prisma.CourseOrderByWithRelationInput[],
        include: this.courseInclude,
      }),
      this.prisma.scoped.course.count({ where: this.tenantWhere(where) }),
    ]);

    return {
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  async findOne(id: string) {
    const course = await this.prisma.scoped.course.findFirst({
      where: this.tenantWhere({ id, deletedAt: null }),
      include: this.courseDetailInclude,
    });
    if (!course) throw new ResourceNotFoundException("Course", id);
    return course;
  }

  async update(id: string, dto: UpdateCourseDto) {
    await this.findOne(id);
    return this.prisma.scoped.course.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.summary !== undefined ? { summary: dto.summary } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.level !== undefined ? { level: dto.level } : {}),
        ...(dto.thumbnailUrl !== undefined
          ? { thumbnailUrl: dto.thumbnailUrl }
          : {}),
        ...(dto.subjectId !== undefined ? { subjectId: dto.subjectId } : {}),
        ...(dto.instructorId !== undefined
          ? { instructorId: dto.instructorId }
          : {}),
        ...(dto.schoolId !== undefined ? { schoolId: dto.schoolId } : {}),
        ...(dto.isFree !== undefined ? { isFree: dto.isFree } : {}),
        ...(dto.status !== undefined
          ? {
              status: dto.status,
              ...(dto.status === CourseStatus.PUBLISHED
                ? { publishedAt: new Date() }
                : {}),
            }
          : {}),
      } as Prisma.CourseUncheckedUpdateInput,
      include: this.courseInclude,
    });
  }

  async publish(id: string, published: boolean) {
    await this.findOne(id);
    return this.prisma.scoped.course.update({
      where: { id },
      data: {
        status: published ? CourseStatus.PUBLISHED : CourseStatus.DRAFT,
        publishedAt: published ? new Date() : null,
      },
      include: this.courseInclude,
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.scoped.course.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private get courseInclude(): Prisma.CourseInclude {
    return {
      instructor: { select: { id: true, firstName: true, lastName: true } },
      subject: { select: { id: true, name: true, code: true } },
      _count: {
        select: {
          lessons: { where: { deletedAt: null } },
          enrollments: { where: { status: "ACTIVE" } },
        },
      },
    };
  }

  private get courseDetailInclude(): Prisma.CourseInclude {
    return {
      ...this.courseInclude,
      lessons: {
        where: { deletedAt: null },
        orderBy: { orderIndex: "asc" },
      },
    };
  }
}
