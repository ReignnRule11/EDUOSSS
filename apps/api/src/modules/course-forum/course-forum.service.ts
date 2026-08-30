import { AuthPrincipal } from "@eduos/shared";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import type { CreateReplyDto } from "./dto/create-thread.dto";
import type { CreateThreadDto } from "./dto/create-thread.dto";
import type { QueryThreadsDto } from "./dto/query-threads.dto";
import {
  ForbiddenOperationException,
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
export class CourseForumService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async createThread(
    courseId: string,
    dto: CreateThreadDto,
    actor: AuthPrincipal,
  ) {
    await this.ensureCourse(courseId);
    return this.prisma.scoped.forumThread.create({
      data: this.withTenant({
        courseId,
        authorId: actor.userId,
        title: dto.title,
        body: dto.body,
        pinned: dto.pinned ?? false,
      } as Prisma.ForumThreadUncheckedCreateInput),
      include: this.threadInclude,
    });
  }

  async findAllThreads(courseId: string, query: QueryThreadsDto) {
    await this.ensureCourse(courseId);
    const pagination = toPaginationArgs(query);
    const where: Prisma.ForumThreadWhereInput = {
      deletedAt: null,
      ...(query.pinned ? { pinned: true } : {}),
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.forumThread.findMany({
        where: this.tenantWhere({ ...where, courseId }),
        skip: pagination.skip,
        take: pagination.take,
        orderBy: [
          { pinned: "desc" },
          buildOrderBy(query, ["title", "createdAt"]),
        ] as Prisma.ForumThreadOrderByWithRelationInput[],
        include: {
          ...this.threadInclude,
          _count: { select: { replies: true } },
        },
      }),
      this.prisma.scoped.forumThread.count({
        where: this.tenantWhere({ ...where, courseId }),
      }),
    ]);
    return {
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  async findThread(courseId: string, id: string) {
    const thread = await this.prisma.scoped.forumThread.findFirst({
      where: this.tenantWhere({ id, courseId, deletedAt: null }),
      include: {
        ...this.threadInclude,
        replies: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
          include: this.replyInclude,
        },
      },
    });
    if (!thread) throw new ResourceNotFoundException("ForumThread", id);
    return thread;
  }

  async updateThread(
    courseId: string,
    id: string,
    dto: Partial<CreateThreadDto>,
    actor: AuthPrincipal,
  ) {
    const thread = await this.findThread(courseId, id);
    if (thread.authorId !== actor.userId && !this.isStaff(actor)) {
      throw new ForbiddenOperationException(
        "You can only edit your own threads",
      );
    }
    return this.prisma.scoped.forumThread.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.body !== undefined ? { body: dto.body } : {}),
        ...(dto.pinned !== undefined && this.isStaff(actor)
          ? { pinned: dto.pinned }
          : {}),
      },
      include: this.threadInclude,
    });
  }

  async removeThread(
    courseId: string,
    id: string,
    actor: AuthPrincipal,
  ): Promise<void> {
    const thread = await this.findThread(courseId, id);
    if (thread.authorId !== actor.userId && !this.isStaff(actor)) {
      throw new ForbiddenOperationException(
        "You can only delete your own threads",
      );
    }
    await this.prisma.scoped.forumThread.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async createReply(
    courseId: string,
    threadId: string,
    dto: CreateReplyDto,
    actor: AuthPrincipal,
  ) {
    await this.findThread(courseId, threadId);
    return this.prisma.scoped.forumReply.create({
      data: this.withTenant({
        threadId,
        authorId: actor.userId,
        body: dto.body,
      } as Prisma.ForumReplyUncheckedCreateInput),
      include: this.replyInclude,
    });
  }

  async removeReply(
    threadId: string,
    id: string,
    actor: AuthPrincipal,
  ): Promise<void> {
    const reply = await this.prisma.scoped.forumReply.findFirst({
      where: this.tenantWhere({ id, threadId, deletedAt: null }),
    });
    if (!reply) throw new ResourceNotFoundException("ForumReply", id);
    if (reply.authorId !== actor.userId && !this.isStaff(actor)) {
      throw new ForbiddenOperationException(
        "You can only delete your own replies",
      );
    }
    await this.prisma.scoped.forumReply.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private isStaff(actor: AuthPrincipal): boolean {
    return !["STUDENT", "PARENT"].includes(actor.role);
  }

  private async ensureCourse(courseId: string) {
    const course = await this.prisma.scoped.course.findFirst({
      where: this.tenantWhere({ id: courseId, deletedAt: null }),
    });
    if (!course) throw new ResourceNotFoundException("Course", courseId);
  }

  private get threadInclude(): Prisma.ForumThreadInclude {
    return {
      author: { select: { id: true, firstName: true, lastName: true } },
    };
  }

  private get replyInclude(): Prisma.ForumReplyInclude {
    return {
      author: { select: { id: true, firstName: true, lastName: true } },
    };
  }
}
