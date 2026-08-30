import { Injectable } from "@nestjs/common";
import { Prisma, SessionStatus } from "@prisma/client";

import type { CreateAcademicSessionDto } from "./dto/create-academic-session.dto";
import type { QueryAcademicSessionsDto } from "./dto/query-academic-sessions.dto";
import {
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
export class AcademicSessionsService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(dto: CreateAcademicSessionDto) {
    const conflict = await this.prisma.scoped.academicSession.findFirst({
      where: this.tenantWhere({ code: dto.code }),
    });
    if (conflict) {
      throw new ConflictResourceException(
        `Academic session code "${dto.code}" already exists`,
      );
    }
    return this.prisma.scoped.academicSession.create({
      data: { ...dto } as Prisma.AcademicSessionUncheckedCreateInput,
      include: { _count: { select: { terms: true } } },
    });
  }

  async findAll(query: QueryAcademicSessionsDto) {
    const pagination = toPaginationArgs(query);
    const where: Prisma.AcademicSessionWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status as SessionStatus } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.currentOnly ? { isCurrent: true } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { code: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.academicSession.findMany({
        where: this.tenantWhere(where),
        skip: pagination.skip,
        take: pagination.take,
        orderBy: buildOrderBy(query, [
          "name",
          "code",
          "status",
          "startDate",
          "endDate",
          "createdAt",
        ]) as Prisma.AcademicSessionOrderByWithRelationInput,
        include: { _count: { select: { terms: true } } },
      }),
      this.prisma.scoped.academicSession.count({
        where: this.tenantWhere(where),
      }),
    ]);

    return {
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  async findOne(id: string) {
    const session = await this.prisma.scoped.academicSession.findFirst({
      where: this.tenantWhere({ id, deletedAt: null }),
      include: {
        _count: { select: { terms: true } },
        terms: {
          where: { deletedAt: null },
          orderBy: { number: "asc" as const },
        },
      },
    });
    if (!session) {
      throw new ResourceNotFoundException("Academic session", id);
    }
    return session;
  }

  /** Returns the current session or null when none is marked current. */
  async findCurrentOrNull() {
    return this.prisma.scoped.academicSession.findFirst({
      where: this.tenantWhere({ isCurrent: true, deletedAt: null }),
      include: {
        _count: { select: { terms: true } },
        terms: {
          where: { deletedAt: null },
          orderBy: { number: "asc" as const },
        },
      },
    });
  }

  async update(id: string, dto: Partial<CreateAcademicSessionDto>) {
    await this.findOne(id);
    if (dto.code) {
      const conflict = await this.prisma.scoped.academicSession.findFirst({
        where: this.tenantWhere({ code: dto.code, id: { not: id } }),
      });
      if (conflict) {
        throw new ConflictResourceException(
          `Academic session code "${dto.code}" already exists`,
        );
      }
    }
    return this.prisma.scoped.academicSession.update({
      where: { id },
      data: dto as Prisma.AcademicSessionUpdateInput,
      include: { _count: { select: { terms: true } } },
    });
  }

  /** Marks one session as current and demotes all others in a transaction. */
  async setCurrent(id: string) {
    await this.findOne(id);
    await this.prisma.$transaction([
      this.prisma.scoped.academicSession.updateMany({
        where: this.tenantWhere({ isCurrent: true }),
        data: { isCurrent: false },
      }),
      this.prisma.scoped.academicSession.update({
        where: { id },
        data: { isCurrent: true, status: SessionStatus.ACTIVE },
      }),
    ]);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.scoped.academicSession.update({
      where: { id },
      data: { isActive: false, isCurrent: false, deletedAt: new Date() },
    });
  }
}
