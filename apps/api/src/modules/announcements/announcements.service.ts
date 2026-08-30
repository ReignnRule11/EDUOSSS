import type { AuthPrincipal } from "@eduos/shared";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import type { CreateAnnouncementDto } from "./dto/create-announcement.dto";
import type { QueryAnnouncementsDto } from "./dto/query-announcements.dto";
import { ResourceNotFoundException } from "../../common/exceptions/business.exceptions";
import { BaseRepository } from "../../common/repositories/base.repository";
import {
  buildOrderBy,
  buildPaginationMeta,
  toPaginationArgs,
} from "../../common/utils/pagination.util";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class AnnouncementsService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(actor: AuthPrincipal, dto: CreateAnnouncementDto) {
    return this.prisma.scoped.announcement.create({
      data: {
        ...dto,
        authorId: actor.userId,
      } as Prisma.AnnouncementUncheckedCreateInput,
      include: this.announcementInclude,
    });
  }

  async findAll(query: QueryAnnouncementsDto) {
    const pagination = toPaginationArgs(query);
    const where: Prisma.AnnouncementWhereInput = {
      deletedAt: null,
      ...(query.audience ? { audience: query.audience } : {}),
      ...(query.pinned ? { pinned: true } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.search
        ? { title: { contains: query.search, mode: "insensitive" } }
        : {}),
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.announcement.findMany({
        where: this.tenantWhere(where),
        skip: pagination.skip,
        take: pagination.take,
        orderBy: [
          { pinned: "desc" },
          buildOrderBy(query, [
            "title",
            "audience",
            "startsAt",
            "expiresAt",
            "createdAt",
          ]),
        ] as Prisma.AnnouncementOrderByWithRelationInput[],
        include: this.announcementInclude,
      }),
      this.prisma.scoped.announcement.count({
        where: this.tenantWhere(where),
      }),
    ]);

    return {
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  async findOne(id: string) {
    const announcement = await this.prisma.scoped.announcement.findFirst({
      where: this.tenantWhere({ id, deletedAt: null }),
      include: this.announcementInclude,
    });
    if (!announcement) {
      throw new ResourceNotFoundException("Announcement", id);
    }
    return announcement;
  }

  async update(id: string, dto: Partial<CreateAnnouncementDto>) {
    await this.findOne(id);
    return this.prisma.scoped.announcement.update({
      where: { id },
      data: dto as Prisma.AnnouncementUpdateInput,
      include: this.announcementInclude,
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.scoped.announcement.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });
  }

  private get announcementInclude(): Prisma.AnnouncementInclude {
    return {
      author: { select: { id: true, firstName: true, lastName: true } },
    };
  }
}
