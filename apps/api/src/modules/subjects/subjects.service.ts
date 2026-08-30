import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import type { CreateSubjectDto } from "./dto/create-subject.dto";
import type { QuerySubjectsDto } from "./dto/query-subjects.dto";
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
export class SubjectsService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(dto: CreateSubjectDto) {
    const conflict = await this.prisma.scoped.subject.findFirst({
      where: this.tenantWhere({ code: dto.code }),
    });
    if (conflict) {
      throw new ConflictResourceException(
        `Subject code "${dto.code}" already exists`,
      );
    }
    return this.prisma.scoped.subject.create({
      data: { ...dto } as Prisma.SubjectUncheckedCreateInput,
    });
  }

  async findAll(query: QuerySubjectsDto) {
    const pagination = toPaginationArgs(query);
    const where = this.tenantWhere({
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.search
        ? {
            OR: [
              {
                name: { contains: query.search, mode: "insensitive" as const },
              },
              {
                code: { contains: query.search, mode: "insensitive" as const },
              },
            ],
          }
        : {}),
    });

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.subject.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: buildOrderBy(query, [
          "name",
          "code",
          "credits",
          "createdAt",
        ]) as Prisma.SubjectOrderByWithRelationInput,
        include: { _count: { select: { classSub: true } } },
      }),
      this.prisma.scoped.subject.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  async findOne(id: string) {
    const subject = await this.prisma.scoped.subject.findFirst({
      where: this.tenantWhere({ id }),
    });
    if (!subject) {
      throw new ResourceNotFoundException("Subject", id);
    }
    return subject;
  }

  async update(id: string, dto: Partial<CreateSubjectDto>) {
    await this.findOne(id);
    return this.prisma.scoped.subject.update({
      where: { id },
      data: dto as Prisma.SubjectUpdateInput,
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.scoped.subject.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });
  }
}
